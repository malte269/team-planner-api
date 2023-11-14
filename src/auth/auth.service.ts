import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UserService } from '../models/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../models/user/user.entity';
import { ResException } from '../common/ResException';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_ERROR_LOGIN, AUTH_ERROR_REFRESH } from './auth.enums';

export class AuthResponse {
  @ApiProperty()
  public user: User;
  @ApiProperty()
  public access_token: string;
  @ApiProperty()
  public refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => JwtService))
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<null | User> {
    // this user object is stored in jwt
    const user = await this.userService.findOne({
      where: [
        {
          email: username.toLowerCase().trim(),
          deleted: false,
        },
      ],
    });

    if (!user) {
      return null;
    }

    if (user.password !== pass) {
      return null;
    }

    // some fields are not needed in the jwt. make it smaller here
    user.password = '';

    return user;
  }

  async login(user: User): Promise<AuthResponse> {
    await this.hasUserPermissionToLogin(user);
    return this.genAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let verifiedToken: Partial<User>;

    try {
      verifiedToken = this.jwtService.verify(refreshToken);
    } catch (_e) {
      throw new ResException(AUTH_ERROR_REFRESH.EXPIRED_TOKEN);
    }

    const user = await this.userService.findOne({
      where: { id: verifiedToken.id },
    });

    await this.hasUserPermissionToLogin(user);

    return this.genAuthResponse(user);
  }

  private genAuthResponse(user: User): AuthResponse {
    const tokenPayload: object = { ...user };
    const refreshTokenPayload: object = { id: user.id };
    return {
      user,
      access_token: this.jwtService.sign(tokenPayload),
      refresh_token: this.jwtService.sign(refreshTokenPayload, {
        expiresIn: this.configService.get<string>(
          'AUTH_REFRESH_TOKEN_LIFETIME',
        ),
      }),
    };
  }

  /**
   * Check if user was found
   * @private
   * @throws ResException
   */
  private async hasUserPermissionToLogin(user: User): Promise<boolean> {
    if (!user) {
      throw new ResException(AUTH_ERROR_LOGIN.UNAUTHORIZED);
    }

    // if one of them is null, throw an error
    if (user.password === null) {
      throw new ResException(AUTH_ERROR_LOGIN.UNAUTHORIZED);
    }

    return true;
  }
}
