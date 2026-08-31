import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  slug!: string;
}
