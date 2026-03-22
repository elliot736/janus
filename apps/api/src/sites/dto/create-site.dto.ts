import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  domain!: string[];
}
