import { Body, Controller, Post } from '@nestjs/common';
import { IdentityApi } from '../shared/internal-auth.guard';
import { RequestPhoneOtpDto, SyncGoogleIdentityDto, VerifyPhoneOtpDto } from './identity.dto';
import { IdentityService } from './identity.service';

@Controller('identity')
@IdentityApi()
export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  @Post('google/sync')
  syncGoogle(@Body() dto: SyncGoogleIdentityDto) { return this.service.syncGoogle(dto); }

  @Post('phone/request') requestPhone(@Body() dto: RequestPhoneOtpDto) { return this.service.requestPhoneOtp(dto.phone); }
  @Post('phone/verify') verifyPhone(@Body() dto: VerifyPhoneOtpDto) { return this.service.verifyPhoneOtp(dto.phone, dto.code); }
}
