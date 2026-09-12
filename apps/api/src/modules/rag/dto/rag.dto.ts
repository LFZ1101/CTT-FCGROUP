import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AskRagDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  instrumentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;
}

export class ReindexRagDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  instrumentId?: string;
}
