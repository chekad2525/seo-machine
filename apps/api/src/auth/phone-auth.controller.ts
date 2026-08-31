import { Body, Controller, Post } from "@nestjs/common";
import { PhoneAuthService } from "./phone-auth.service";
import {
  RequestPhoneOtpDto,
  VerifyPhoneOtpDto,
} from "./phone-auth.dto";

@Controller("auth/phone")
export class PhoneAuthController {
  constructor(private readonly phoneAuth: PhoneAuthService) {}

  @Post("request")
  request(@Body() dto: RequestPhoneOtpDto) {
    return this.phoneAuth.request(dto.phone);
  }

  @Post("verify")
  verify(@Body() dto: VerifyPhoneOtpDto) {
    return this.phoneAuth.verify(dto.phone, dto.code);
  }
}
