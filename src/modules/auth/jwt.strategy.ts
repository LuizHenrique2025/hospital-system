import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('jwt.secret');

    /**
     * Isso é erro de configuração do servidor (500), não erro do usuário (401).
     * Se 'jwt.secret' não estiver configurado, a API deve falhar claramente.
     */
    if (!secret) {
      throw new InternalServerErrorException(
        "JWT secret não está configurado. Verifique a configuração 'jwt.secret' (ex: variável de ambiente JWT_SECRET).",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Token inválido');
    }

    return { userId: payload.sub, role: payload.role };
  }
}
