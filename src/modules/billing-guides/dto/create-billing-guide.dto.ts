import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingGuideItemStatus,
  BillingGuideStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBillingGuideItemDto {
  @ApiProperty({ example: 'procedure-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  procedureId: string;

  @ApiPropertyOptional({ example: 'pricing-table-uuid-here' })
  @IsUUID()
  @IsOptional()
  pricingTableId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    enum: BillingGuideItemStatus,
    default: BillingGuideItemStatus.REQUESTED,
  })
  @IsEnum(BillingGuideItemStatus)
  @IsOptional()
  status?: BillingGuideItemStatus;

  @ApiPropertyOptional({ example: 184320 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  requestedAmountCents?: number;

  @ApiPropertyOptional({ example: 'Procedimento vinculado a CBHPM 2017' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBillingGuideDto {
  @ApiPropertyOptional({
    example: 'HDR-351909',
    description: 'Numero da guia ou codigo interno quando ja existir.',
  })
  @IsString()
  @IsOptional()
  guideNumber?: string;

  @ApiPropertyOptional({ example: 'SENHA-PRD-2' })
  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @ApiProperty({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ example: 'appointment-uuid-here' })
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'provider-uuid-here' })
  @IsUUID()
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({
    enum: BillingGuideStatus,
    default: BillingGuideStatus.OPEN,
  })
  @IsEnum(BillingGuideStatus)
  @IsOptional()
  currentStatus?: BillingGuideStatus;

  @ApiPropertyOptional({ example: 'Recepcao PA' })
  @IsString()
  @IsOptional()
  originSector?: string;

  @ApiPropertyOptional({ example: 'PRONTO_ATENDIMENTO' })
  @IsString()
  @IsOptional()
  careType?: string;

  @ApiPropertyOptional({ example: 284760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  requestedAmountCents?: number;

  @ApiPropertyOptional({ example: 255760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  authorizedAmountCents?: number;

  @ApiPropertyOptional({ example: 'Guia aberta pela recepcao.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateBillingGuideItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillingGuideItemDto)
  @IsOptional()
  items?: CreateBillingGuideItemDto[];
}
