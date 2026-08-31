import { IsString, MaxLength } from 'class-validator';
export class CreateOrganizationDto { @IsString() @MaxLength(120) name!: string; }
