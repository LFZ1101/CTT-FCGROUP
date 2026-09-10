import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateUnionDto {
  @IsString() name!: string;
  @IsOptional() @IsString() acronym?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsArray() states?: string[];
  @IsOptional() @IsArray() cities?: string[];
  @IsOptional() @IsArray() categories?: string[];
}

export class UpdateUnionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() acronym?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsArray() states?: string[];
  @IsOptional() @IsArray() cities?: string[];
  @IsOptional() @IsArray() categories?: string[];
}
