import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const SHARING = ['PRIVATE', 'NETWORK_RELATED_UNION', 'NETWORK_GLOBAL'] as const;
const MODERATION = ['APPROVE', 'REJECT', 'NEEDS_CHANGES', 'DUPLICATE'] as const;

export class SubmitContributionDto {
  @IsString() fileBase64!: string;
  @IsOptional() @IsString() fileName?: string;
  @IsString() unionId!: string;
  @IsIn(SHARING) sharingScope!: (typeof SHARING)[number];
  @IsString() @MinLength(8) originDescription!: string;
  @IsBoolean() consentAccepted!: boolean;
  @IsOptional() @IsString() probableType?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() title?: string;
}

export class ModerateContributionDto {
  @IsIn(MODERATION) decision!: (typeof MODERATION)[number];
  @IsOptional() @IsString() notes?: string;
}

export class RevokeContributionDto {
  @IsString() @MinLength(3) reason!: string;
}

export class CreateDocumentRequestDto {
  @IsString() unionId!: string;
  @IsOptional() @IsString() instrumentType?: string;
  @IsOptional() @IsString() referencePeriod?: string;
  @IsOptional() @IsString() notes?: string;
}
