import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: {
    sub: string;
    permissions: string[];
    roles: string[];
    clinicIds: string[];
    isSuperAdmin: boolean;
  }): AuthUser {
    return {
      id: payload.sub,
      permissions: payload.permissions || [],
      roles: payload.roles || [],
      clinicIds: payload.clinicIds || [],
      isSuperAdmin: payload.isSuperAdmin || false,
    };
  }
}
