import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  name: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  businessRegNumber?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  suiWalletAddress?: string;
}
