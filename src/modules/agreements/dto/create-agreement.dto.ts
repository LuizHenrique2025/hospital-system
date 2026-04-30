import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAgreementDto {
  @ApiProperty({ example: 'UNIMED' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'UNIMED' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @ApiPropertyOptional({ example: 'Convênio ativo para atendimento hospitalar' })
  @IsString()
  @IsOptional()
  notes?: string;
}
