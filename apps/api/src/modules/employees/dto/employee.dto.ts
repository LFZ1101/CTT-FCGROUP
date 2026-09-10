import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() companyId!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() jobTitle?: string;
  /** Salário em reais (será convertido para centavos). */
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsString() admissionDate?: string;
  @IsOptional() @IsNumber() @Min(0) weeklyHours?: number;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'LEAVE']) status?: 'ACTIVE' | 'INACTIVE' | 'LEAVE';
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() externalId?: string | null;
  @IsOptional() @IsString() jobTitle?: string | null;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number | null;
  @IsOptional() @IsString() admissionDate?: string | null;
  @IsOptional() @IsNumber() @Min(0) weeklyHours?: number | null;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'LEAVE']) status?: 'ACTIVE' | 'INACTIVE' | 'LEAVE';
  @IsOptional() @IsString() notes?: string | null;
}
