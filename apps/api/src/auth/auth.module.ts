import { Module } from "@nestjs/common";
import { PhoneAuthController } from "./phone-auth.controller";
import { PhoneAuthService } from "./phone-auth.service";
import { KavenegarSmsProvider } from "./kavenegar-sms.provider";

@Module({
  controllers: [PhoneAuthController],
  providers: [PhoneAuthService, KavenegarSmsProvider],
})
export class AuthModule {}
