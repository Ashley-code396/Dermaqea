import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID() // ensures valid UUID for manufacturer
  manufacturer?: string;
}