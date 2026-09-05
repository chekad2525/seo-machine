import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class SyncGoogleIdentityDto {
  @IsString() @MaxLength(255) providerAccountId!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() image?: string;
  @IsBoolean() emailVerified = false;
}

export class RequestPhoneOtpDto { @IsString() @Matches(/^\+[1-9]\d{7,14}$/) phone!: string; }
export class VerifyPhoneOtpDto { @IsString() @Matches(/^\+[1-9]\d{7,14}$/) phone!: string; @IsString() @Matches(/^\d{6}$/) code!: string; }
