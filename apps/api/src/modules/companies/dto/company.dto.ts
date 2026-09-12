import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
export class CreateCompanyDto {
  @IsString() legalName!: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsString() cnpj!: string;
  @IsOptional() @IsString() mainCnae?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) secondaryCnaes?: string[];
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsInt() @Min(0) employeeCount?: number;
}
export class UpdateCompanyDto extends CreateCompanyDto { @IsOptional() @IsBoolean() active?: boolean; }

export class LinkCompanyUnionDto {
  @IsString() unionId!: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsBoolean() confirmed?: boolean;
}
