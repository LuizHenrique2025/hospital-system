import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CommunicationsService } from './communications.service';
import {
  CommunicationDashboardDto,
  InternalEmailDto,
  InternalRecipientDto,
} from './dto/communication-dashboard.dto';
import { CreateInternalMessageDto } from './dto/create-internal-message.dto';
import { QueryInternalMessagesDto } from './dto/query-internal-messages.dto';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: Role;
  };
};

@ApiTags('Comunicacao interna')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Resumo da aba Principal com comunicados, avisos e emails internos',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados da comunicacao interna retornados com sucesso',
    type: CommunicationDashboardDto,
  })
  getDashboard(@Req() request: AuthenticatedRequest) {
    return this.communicationsService.getDashboard(request.user.userId);
  }

  @Get('recipients')
  @ApiOperation({ summary: 'Listar destinatarios disponiveis para mensagem' })
  @ApiResponse({
    status: 200,
    description: 'Destinatarios retornados com sucesso',
    type: InternalRecipientDto,
    isArray: true,
  })
  listRecipients(@Req() request: AuthenticatedRequest) {
    return this.communicationsService.listRecipients(request.user.userId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Listar mensagens internas por caixa' })
  @ApiResponse({
    status: 200,
    description: 'Mensagens retornadas com sucesso',
    type: InternalEmailDto,
    isArray: true,
  })
  listMessages(
    @Req() request: AuthenticatedRequest,
    @Query() query: QueryInternalMessagesDto,
  ) {
    return this.communicationsService.listMessages(
      request.user.userId,
      query.box ?? 'inbox',
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Enviar nova mensagem interna' })
  @ApiResponse({
    status: 201,
    description: 'Mensagem enviada com sucesso',
    type: InternalEmailDto,
  })
  createMessage(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateInternalMessageDto,
  ) {
    return this.communicationsService.createMessage(request.user.userId, dto);
  }

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Marcar mensagem como lida' })
  markAsRead(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.communicationsService.markAsRead(request.user.userId, id);
  }

  @Patch('messages/:id/archive')
  @ApiOperation({ summary: 'Arquivar mensagem interna' })
  archiveMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.communicationsService.archiveMessage(request.user.userId, id);
  }

  @Patch('messages/:id/restore')
  @ApiOperation({ summary: 'Restaurar mensagem interna' })
  restoreMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.communicationsService.restoreMessage(request.user.userId, id);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Mover mensagem interna para lixeira' })
  deleteMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.communicationsService.deleteMessage(request.user.userId, id);
  }
}
