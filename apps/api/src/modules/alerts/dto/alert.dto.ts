import { IsIn, IsOptional, IsString } from 'class-validator';
export class CreateAlertDto {
  @IsIn(['INFO','WARNING','CRITICAL']) severity!: any;
  @IsString() type!: string;
  @IsString() title!: string;
  @IsString() message!: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() instrumentId?: string;
}
