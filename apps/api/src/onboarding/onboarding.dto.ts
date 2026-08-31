import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString() @MaxLength(120) organizationName!: string;
  @IsString() @MaxLength(120) workspaceName!: string;
  @IsString() @MaxLength(120) projectName!: string;
  @IsString() @MaxLength(2048) domain!: string;
  @IsOptional() @IsString() @MaxLength(120) property?: string;
}
