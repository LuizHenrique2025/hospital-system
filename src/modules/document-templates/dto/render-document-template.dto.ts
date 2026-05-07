import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class RenderDocumentTemplateDto {
  @ApiPropertyOptional({
    example: {
      '#NOMEPACIENTE#': 'LUIZ HENRIQUE',
      '#CPFPACIENTE#': '000.000.000-00',
    },
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string | number | boolean | null>;
}
