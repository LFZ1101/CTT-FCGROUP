import { IsIn, IsString, MinLength } from 'class-validator';

export class CsvImportDto {
  @IsString()
  @MinLength(3)
  csvText!: string;

  @IsIn(['preview', 'confirm'])
  mode!: 'preview' | 'confirm';
}
