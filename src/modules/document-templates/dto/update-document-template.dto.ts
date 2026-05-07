import { PartialType } from '@nestjs/swagger';

import { CreateDocumentTemplateDto } from './create-document-template.dto';

export class UpdateDocumentTemplateDto extends PartialType(
  CreateDocumentTemplateDto,
) {}
