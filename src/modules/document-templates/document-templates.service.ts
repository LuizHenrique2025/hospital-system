import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentTemplateType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { QueryDocumentTemplateDto } from './dto/query-document-template.dto';
import { RenderDocumentTemplateDto } from './dto/render-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateDocumentTemplateDto) {
    const code = this.normalizeCode(dto.code);
    const existingTemplate = await this.prisma.documentTemplate.findUnique({
      where: { code },
    });

    if (existingTemplate) {
      throw new ConflictException('Codigo de modelo ja cadastrado');
    }

    return this.prisma.documentTemplate.create({
      data: this.normalizeCreateData(dto, code),
    });
  }

  async findAll(query: QueryDocumentTemplateDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.DocumentTemplateWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.group) {
      where.group = { contains: query.group.trim(), mode: 'insensitive' };
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { group: { contains: search, mode: 'insensitive' } },
        { layout: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.documentTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { active: 'desc' },
          { type: 'asc' },
          { group: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.documentTemplate.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Modelo nao encontrado');
    }

    return template;
  }

  async updateTemplate(id: string, dto: UpdateDocumentTemplateDto) {
    const currentTemplate = await this.findOne(id);
    const code = dto.code ? this.normalizeCode(dto.code) : undefined;

    if (code && code !== currentTemplate.code) {
      const existingTemplate = await this.prisma.documentTemplate.findUnique({
        where: { code },
      });

      if (existingTemplate) {
        throw new ConflictException('Codigo de modelo ja cadastrado');
      }
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: this.normalizeUpdateData(dto, code),
    });
  }

  async deactivateTemplate(id: string) {
    await this.findOne(id);

    await this.prisma.documentTemplate.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Modelo inativado com sucesso' };
  }

  async renderTemplate(id: string, dto: RenderDocumentTemplateDto) {
    const template = await this.findOne(id);

    return {
      ...template,
      renderedContent: this.renderContent(template.content, dto.variables ?? {}),
    };
  }

  private normalizeCreateData(
    dto: CreateDocumentTemplateDto,
    code: string,
  ): Prisma.DocumentTemplateUncheckedCreateInput {
    return {
      code,
      name: this.normalizeLabel(dto.name),
      description: this.optionalText(dto.description),
      group: this.normalizeLabel(dto.group),
      layout: dto.layout ? this.normalizeLabel(dto.layout) : undefined,
      type: dto.type ?? DocumentTemplateType.DOCUMENT,
      content: dto.content.trim(),
      variables: this.normalizeVariables(dto.content, dto.variables),
      active: dto.active ?? true,
    };
  }

  private normalizeUpdateData(
    dto: UpdateDocumentTemplateDto,
    code?: string,
  ): Prisma.DocumentTemplateUncheckedUpdateInput {
    return {
      code,
      name: dto.name ? this.normalizeLabel(dto.name) : undefined,
      description:
        dto.description === undefined
          ? undefined
          : this.optionalText(dto.description),
      group: dto.group ? this.normalizeLabel(dto.group) : undefined,
      layout:
        dto.layout === undefined
          ? undefined
          : dto.layout
            ? this.normalizeLabel(dto.layout)
            : null,
      type: dto.type,
      content: dto.content?.trim(),
      variables:
        dto.content !== undefined || dto.variables !== undefined
          ? this.normalizeVariables(dto.content ?? '', dto.variables)
          : undefined,
      active: dto.active,
    };
  }

  private renderContent(
    content: string,
    variables: Record<string, string | number | boolean | null>,
  ) {
    const normalizedVariables = new Map<string, string>();

    Object.entries(variables).forEach(([key, value]) => {
      normalizedVariables.set(this.normalizeVariableToken(key), String(value ?? ''));
    });

    return content.replace(/#[A-Z0-9_]+#/gi, (token) => {
      return normalizedVariables.get(token.toUpperCase()) ?? token;
    });
  }

  private normalizeVariables(content: string, variables?: string[]) {
    const contentVariables = Array.from(
      content.matchAll(/#[A-Z0-9_]+#/gi),
      (match) => match[0],
    );
    const combinedVariables = [...(variables ?? []), ...contentVariables]
      .map((variable) => this.normalizeVariableToken(variable))
      .filter(Boolean);

    return Array.from(new Set(combinedVariables)).sort();
  }

  private normalizeVariableToken(variable: string) {
    const normalized = variable
      .trim()
      .replace(/#/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();

    return normalized ? `#${normalized}#` : '';
  }

  private normalizeCode(value: string) {
    return this.normalizeLabel(value).replace(/\s+/g, '-');
  }

  private normalizeLabel(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private optionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
