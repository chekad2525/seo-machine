import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { RequestPhoneOtpDto, SyncGoogleIdentityDto, VerifyPhoneOtpDto } from './identity.dto';
import { IdentityService } from './identity.service';

@Controller('identity')
export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  @Post('google/sync')
  @UseGuards(ApiAuthGuard)
  syncGoogle(@Body() dto: SyncGoogleIdentityDto) { return this.service.syncGoogle(dto); }

  @Post('phone/request') requestPhone(@Body() dto: RequestPhoneOtpDto) { return this.service.requestPhoneOtp(dto.phone); }
  @Post('phone/verify') verifyPhone(@Body() dto: VerifyPhoneOtpDto) { return this.service.verifyPhoneOtp(dto.phone, dto.code); }
}
