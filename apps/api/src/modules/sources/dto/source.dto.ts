import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const SOURCE_TYPES = [
  'MEDIADOR_MTE',
  'LABOR_UNION',
  'EMPLOYER_UNION',
  'OFFICIAL_BULLETIN',
  'MANUAL_UPLOAD',
  'COLLABORATIVE_NETWORK',
  'OTHER',
] as const;

export class CreateSourceDto {
  @IsIn(SOURCE_TYPES) type!: (typeof SOURCE_TYPES)[number];
  @IsString() name!: string;
  @IsString() url!: string;
  @IsOptional() @IsString() unionId?: string;
}

export class UpdateSourceDto {
  @IsOptional() @IsIn(SOURCE_TYPES) type?: (typeof SOURCE_TYPES)[number];
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() unionId?: string | null;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
