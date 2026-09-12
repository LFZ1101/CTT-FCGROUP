import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class BootstrapDto {
  @IsString() @MinLength(2) tenantName!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  /** Slug do workspace; obrigatório se o e-mail existir em mais de um tenant. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  tenantSlug?: string;
}
