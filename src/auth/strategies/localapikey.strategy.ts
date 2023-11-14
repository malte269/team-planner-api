import { Strategy } from 'passport-localapikey-update';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResException } from '../../common/ResException';
import { AUTH_ERROR_GUARD } from '../auth.enums';

@Injectable()
export class LocalApiKeyStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      apiKeyHeader: 'apikey',
    });
  }

  async validate(key: string): Promise<boolean> {
    if (this.configService.get<string>('AUTH_API_KEY_EXAMPLE') !== key) {
      throw new ResException(AUTH_ERROR_GUARD.UNAUTHORIZED);
    }
    return true;
  }
}
