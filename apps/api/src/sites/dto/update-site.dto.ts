import {
  IsString,
  IsArray,
  IsOptional,
  MaxLength,
  IsObject,
  ValidateNested,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class RiskThresholds {
  @IsNumber()
  allow!: number;

  @IsNumber()
  challenge!: number;

  @IsNumber()
  block!: number;
}

class SiteSettingsDto {
  @IsOptional()
  @IsNumber()
  powDifficulty?: number;

  @IsOptional()
  @IsIn(['managed', 'invisible', 'interactive'])
  mode?: 'managed' | 'invisible' | 'interactive';

  @IsOptional()
  @ValidateNested()
  @Type(() => RiskThresholds)
  riskThresholds?: RiskThresholds;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domain?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SiteSettingsDto)
  settings?: SiteSettingsDto;
}
