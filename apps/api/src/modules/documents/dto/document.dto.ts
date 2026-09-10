import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class EnqueueDownloadDto {
  @IsOptional()
  @IsString()
  documentId?: string;
}

export class DocumentReviewDto {
  @IsIn(['APPROVE_METADATA', 'NEEDS_CHANGES'])
  decision!: 'APPROVE_METADATA' | 'NEEDS_CHANGES';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
