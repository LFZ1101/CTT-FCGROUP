import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const SOURCE_TYPES = [
  'MEDIADOR_MTE',
  'LABOR_UNION',
  'EMPLOYER_UNION',
  'OFFICIAL_BULLETIN',
  'MANUAL_UPLOAD',
  'COLLABORATIVE_NETWORK',
  'OTHER',
] as const;

const UNION_ADAPTERS = ['generic-html', 'pdf-listing', 'wordpress-media', 'custom'] as const;

/** Config JSON de crawler sindical (Source.config). */
export class SourceConfigDto {
  @IsOptional() @IsIn(UNION_ADAPTERS) adapter?: (typeof UNION_ADAPTERS)[number];
  @IsOptional() linkKeywords?: string[];
  @IsOptional() includePatterns?: string[];
  @IsOptional() excludePatterns?: string[];
  @IsOptional() hrefContains?: string[];
  @IsOptional() maxLinks?: number;
}

export class CreateSourceDto {
  @IsIn(SOURCE_TYPES) type!: (typeof SOURCE_TYPES)[number];
  @IsString() name!: string;
  @IsString() url!: string;
  @IsOptional() @IsString() unionId?: string;
  @IsOptional() @IsObject() config?: SourceConfigDto;
}

export class UpdateSourceDto {
  @IsOptional() @IsIn(SOURCE_TYPES) type?: (typeof SOURCE_TYPES)[number];
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() unionId?: string | null;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() config?: SourceConfigDto | null;
}
