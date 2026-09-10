import { IsOptional, IsString } from 'class-validator';

export class EnqueueDownloadDto {
  @IsOptional()
  @IsString()
  documentId?: string;
}
