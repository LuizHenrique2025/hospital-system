import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApproveBudgetEstimateDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Quando true, converte o orcamento aprovado em guia.',
  })
  @IsBoolean()
  @IsOptional()
  createBillingGuide?: boolean;

  @ApiPropertyOptional({ example: 'HDR-351909' })
  @IsString()
  @IsOptional()
  guideNumber?: string;

  @ApiPropertyOptional({ example: 'SENHA-PRD-2' })
  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @ApiPropertyOptional({ example: 'Recepcao Hospitalar' })
  @IsString()
  @IsOptional()
  originSector?: string;

  @ApiPropertyOptional({ example: 'Orcamento aprovado pelo paciente.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
