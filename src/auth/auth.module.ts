import { forwardRef, HttpStatus, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../models/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtModule, JwtSecretRequestType } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ResException } from '../common/ResException';
import { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { LocalApiKeyStrategy } from './strategies/localapikey.strategy';

@Module({
  controllers: [AuthController],
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        signOptions: {
          expiresIn: configService.get<string>('AUTH_TOKEN_LIFETIME'),
          // switch to EdDSA when available. See node_modules/jsonwebtoken/sign.js SUPPORTED_ALGS
          // also change the algorithms value in JwtStrategy
          algorithm: 'ES256',
        },
        secretOrKeyProvider: (
          requestType: JwtSecretRequestType,
          tokenOrPayload: string | object | Buffer,
          verifyOrSignOrOptions?: VerifyOptions | SignOptions,
        ) => {
          switch (requestType) {
            case JwtSecretRequestType.SIGN:
              return configService.get<string>('AUTH_KEY_PRIVATE');
            case JwtSecretRequestType.VERIFY:
              return configService.get<string>('AUTH_KEY_PUBLIC');
            default:
              throw new ResException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                'UNKNOWN_TYPE',
                `Unknown JwtSecretRequestType ${requestType}`,
              );
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, LocalApiKeyStrategy],
  exports: [AuthService],
})
export class AuthModule {}
