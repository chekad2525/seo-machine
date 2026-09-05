import { IsString, MaxLength } from 'class-validator';
export class CreateWorkspaceDto { @IsString() organizationId!: string; @IsString() @MaxLength(120) name!: string; }
