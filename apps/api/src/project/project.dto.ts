import { IsString, MaxLength } from 'class-validator';
export class CreateProjectDto { @IsString() workspaceId!: string; @IsString() @MaxLength(120) name!: string; @IsString() @MaxLength(2048) domain!: string; }
