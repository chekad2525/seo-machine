import { IsNotEmpty, IsString, Matches } from "class-validator";

export class RequestPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+98\d{10}$/)
  phone!: string;
}

export class VerifyPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+98\d{10}$/)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
