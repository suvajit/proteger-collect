import { IsOptional, IsString } from 'class-validator';

export class ResolveEntryDto {
  @IsOptional()
  @IsString()
  resolutionRemark?: string;

  @IsOptional()
  @IsString()
  resolutionPhotoUrl?: string;
}
