import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../models/user/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: process.env.AUTH_IGNORE_TOKEN_EXPIRATION === 'true',
      algorithms: ['ES256'],
      secretOrKey: configService.get<string>('AUTH_KEY_PUBLIC'),
    });
  }

  async validate(payload: any) {
    return new User(payload);
  }
}
