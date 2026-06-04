import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateEntryDto {
  @IsOptional()
  @IsEnum(['pending', 'done', 'issue', 'na'])
  status?: 'pending' | 'done' | 'issue' | 'na';

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
