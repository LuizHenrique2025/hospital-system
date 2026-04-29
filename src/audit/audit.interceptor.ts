import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import { Observable, tap } from 'rxjs';

import { AuditService } from './audit.service';

type RequestUser = {
  role: Role;
  userId: string;
};

type AuditedRequest = {
  baseUrl?: string;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  route?: {
    path?: string;
  };
  socket?: {
    remoteAddress?: string;
  };
  url?: string;
  user?: RequestUser;
};

type AuditedResponse = {
  statusCode?: number;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(context, request, startedAt).catch(() => undefined);
        },
        error: (error: { status?: number; statusCode?: number }) => {
          this.record(context, request, startedAt, error).catch(
            () => undefined,
          );
        },
      }),
    );
  }

  private async record(
    context: ExecutionContext,
    request: AuditedRequest,
    startedAt: number,
    error?: { status?: number; statusCode?: number },
  ) {
    if (!request.user) {
      return;
    }

    const method = (request.method ?? 'GET').toUpperCase();
    const response = context.switchToHttp().getResponse<AuditedResponse>();
    const statusCode =
      error?.status ?? error?.statusCode ?? response.statusCode;
    const route =
      request.route?.path && request.baseUrl
        ? `${request.baseUrl}${request.route.path}`
        : (request.originalUrl ?? request.url ?? 'unknown');
    const queryKeys = Object.keys(request.query ?? {});

    await this.auditService.record({
      action: this.resolveAction(method),
      actorId: request.user.userId,
      actorRole: request.user.role,
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      metadata: {
        durationMs: Date.now() - startedAt,
        lgpd: {
          purpose: this.resolvePurpose(route),
          sensitiveData: this.isSensitiveRoute(route),
        },
        queryKeys,
      },
      method,
      resource: this.resolveResource(route),
      resourceId: this.resolveResourceId(request.params),
      route,
      statusCode,
      userAgent: this.readHeader(request, 'user-agent'),
    });
  }

  private resolveAction(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }

  private resolveResource(route: string) {
    const cleanRoute = route.split('?')[0] ?? route;
    const segments = cleanRoute.split('/').filter(Boolean);

    if (segments[0] === 'api') {
      return segments[1] ?? 'system';
    }

    return segments[0] ?? 'system';
  }

  private resolveResourceId(params?: Record<string, string | undefined>) {
    if (!params) {
      return undefined;
    }

    return (
      params.id ??
      params.patientId ??
      params.examOrderId ??
      params.procedureId ??
      params.codigo
    );
  }

  private resolvePurpose(route: string) {
    const resource = this.resolveResource(route);

    if (['patients', 'exam-orders', 'appointments'].includes(resource)) {
      return 'assistencial';
    }

    if (['pricing', 'cbhpm', 'agreements'].includes(resource)) {
      return 'faturamento';
    }

    if (['users', 'audit'].includes(resource)) {
      return 'administrativo';
    }

    return 'operacional';
  }

  private isSensitiveRoute(route: string) {
    return ['patients', 'exam-orders', 'appointments', 'auth'].includes(
      this.resolveResource(route),
    );
  }

  private readHeader(request: AuditedRequest, header: string) {
    const value = request.headers?.[header];

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return value;
  }
}
