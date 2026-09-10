import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() instrumentId?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number;
  @IsOptional() @IsDateString() dueAt?: string;
}
export class UpdateTaskStatusDto { @IsIn(['TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED']) status!: any; }
