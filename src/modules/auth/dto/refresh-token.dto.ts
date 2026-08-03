import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token emitido no login',
    example: 'refresh-token-seguro',
  })
  @IsString()
  @MinLength(32)
  refreshToken: string;
}
