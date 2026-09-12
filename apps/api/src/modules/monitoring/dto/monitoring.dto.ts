import { IsOptional, IsString } from 'class-validator';
export class TriggerSourceCheckDto {
  @IsOptional() @IsString() sourceId?: string;
}
