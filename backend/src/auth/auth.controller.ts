import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.userId, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt-access'))
  logout(@CurrentUser() user: { sub: string }, @Body() dto: RefreshDto) {
    return this.authService.logout(user.sub, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-access'))
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt-access'))
  changePassword(@CurrentUser() user: { sub: string }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }
}
