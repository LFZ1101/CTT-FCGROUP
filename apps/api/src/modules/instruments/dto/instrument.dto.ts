import { IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInstrumentDto {
  @IsIn(['CCT', 'ACT', 'ADDENDUM', 'EXTENSION', 'OTHER'])
  type!: 'CCT' | 'ACT' | 'ADDENDUM' | 'EXTENSION' | 'OTHER';

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  registration?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  baseDate?: string;

  @IsOptional()
  @IsArray()
  territory?: string[];

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}

export class ReviewInstrumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
