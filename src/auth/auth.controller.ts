import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../models/user/user.service';
import {
  ApiProperty,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthResponse, AuthService } from './auth.service';
import { LocalApiKeyAuthGuard, LocalAuthGuard } from './guards';
import { Public } from './decorators/public.decorator';
import { ApiResponses } from '../common/decorators/ApiResponses.decorator';
import { AUTH_ERROR_LOGIN } from './auth.enums';
import { UserToken } from '../common/decorators/user.decorator';
import { User } from '../models/user/user.entity';

export class LoginBody {
  @ApiProperty({
    example: 'admin',
  })
  username: string;
  @ApiProperty({
    example: 'admin',
  })
  password: string;
}

export class RefreshBody {
  @ApiProperty()
  refreshToken: string;
}

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Public()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AuthResponse,
  })
  @ApiResponses(AUTH_ERROR_LOGIN)
  async login(@Req() req, @Body() body: LoginBody) {
    return this.authService.login(req.user);
  }

  @Post('refreshToken')
  @Public()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AuthResponse,
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'RefreshToken expired',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async refreshToken(@Body() body: RefreshBody) {
    return await this.authService.refresh(body.refreshToken);
  }

  @Get('decode')
  async decode(@UserToken() user: User) {
    return {
      user: user || null,
    };
  }

  @Get('test/apikey')
  @UseGuards(LocalApiKeyAuthGuard)
  @Public()
  @ApiSecurity('ApiKeyAuth2')
  async testApiKey() {
    return { message: 'yay! You did it!' };
  }
}
