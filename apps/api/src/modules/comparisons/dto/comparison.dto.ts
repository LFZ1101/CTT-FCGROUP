import { IsString } from 'class-validator';

export class CreateComparisonDto {
  @IsString()
  previousInstrumentId!: string;

  @IsString()
  currentInstrumentId!: string;
}
