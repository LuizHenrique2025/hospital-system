-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('DOCUMENT', 'REPORT');

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "layout" TEXT,
    "type" "DocumentTemplateType" NOT NULL DEFAULT 'DOCUMENT',
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_code_key" ON "document_templates"("code");

-- CreateIndex
CREATE INDEX "document_templates_type_active_idx" ON "document_templates"("type", "active");

-- CreateIndex
CREATE INDEX "document_templates_group_idx" ON "document_templates"("group");

-- Seed default clinical document/report templates.
INSERT INTO "document_templates" (
    "id",
    "code",
    "name",
    "description",
    "group",
    "layout",
    "type",
    "content",
    "variables",
    "active",
    "updatedAt"
) VALUES
(
    'template-doc-atestado-medico',
    'DOC-ATESTADO-MEDICO',
    'ATESTADO MEDICO',
    'Atestado medico padrao para atendimento ambulatorial.',
    'ATESTADOS',
    'PADRAO A4',
    'DOCUMENT',
    E'ATESTADO MEDICO\n\nAtesto para os devidos fins, que o Sr(a) (#NOMEPACIENTE#) esteve em consulta no dia (#DATADOCUMENTO#), das (#HORAINICIO#) as (#HORADOCUMENTO#) horas.\n\nConvenio: (#NOMECONVENIO#)        CID: (#CIDCONS#)\n\nDevera:\n( ) Retornar ao servico\n( ) Permanecer afastado(a) por ____ hora(s)\n( ) Permanecer afastado(a) por ____ dia(s) a partir do dia (#DATADOCUMENTO#)\n\nObservacao:\n(#OBSERVACAOCLINICA#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
    ARRAY['#NOMEPACIENTE#', '#DATADOCUMENTO#', '#HORAINICIO#', '#HORADOCUMENTO#', '#NOMECONVENIO#', '#CIDCONS#', '#OBSERVACAOCLINICA#', '#NOMEPROFISSIONAL#', '#CRMPROFISSIONAL#'],
    true,
    CURRENT_TIMESTAMP
),
(
    'template-doc-pedido-exame',
    'DOC-PEDIDO-EXAME',
    'PEDIDO EXAME',
    'Solicitacao de exames vinculada ao atendimento medico.',
    'PEDIDO EXAME',
    'PADRAO A4',
    'DOCUMENT',
    E'Paciente: (#NOMEPACIENTE#)\nData de Nascimento: (#DATANASCIMENTOPACIENTE#)\nCPF: (#CPFPACIENTE#)\n\nConvenio: (#NOMECONVENIO#) (#NOMEPLANO#)\n\nIndicacao Clinica: (#INDICACAOCLINICA#)\nSOLICITACAO DE EXAMES\n------------------------------------------------------------\n(#LISTAGEMEXAMESPEDIDOEXAME#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
    ARRAY['#NOMEPACIENTE#', '#DATANASCIMENTOPACIENTE#', '#CPFPACIENTE#', '#NOMECONVENIO#', '#NOMEPLANO#', '#INDICACAOCLINICA#', '#LISTAGEMEXAMESPEDIDOEXAME#', '#NOMEPROFISSIONAL#', '#CRMPROFISSIONAL#'],
    true,
    CURRENT_TIMESTAMP
),
(
    'template-doc-receituario-comum',
    'DOC-RECEITUARIO-COMUM',
    'RECEITUARIO COMUM',
    'Modelo simples para prescricao e orientacao medicamentosa.',
    'RECEITUARIO',
    'RECEITUARIO',
    'DOCUMENT',
    E'RECEITUARIO\n\nPaciente: (#NOMEPACIENTE#)\nCPF: (#CPFPACIENTE#)\nData: (#DATADOCUMENTO#)\n\nPrescricao:\n(#PRESCRICAO#)\n\nOrientacoes:\n(#OBSERVACAOCLINICA#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
    ARRAY['#NOMEPACIENTE#', '#CPFPACIENTE#', '#DATADOCUMENTO#', '#PRESCRICAO#', '#OBSERVACAOCLINICA#', '#NOMEPROFISSIONAL#', '#CRMPROFISSIONAL#'],
    true,
    CURRENT_TIMESTAMP
),
(
    'template-doc-relatorio-medico',
    'DOC-RELATORIO-MEDICO',
    'RELATORIO MEDICO',
    'Relatorio medico livre para acompanhamento e encaminhamento.',
    'ENCAMINHAMENTO',
    'PADRAO A4',
    'DOCUMENT',
    E'RELATORIO MEDICO\n\nPaciente: (#NOMEPACIENTE#)\nCPF: (#CPFPACIENTE#)\nNascimento: (#DATANASCIMENTOPACIENTE#)\nData: (#DATADOCUMENTO#)\n\nHistorico / anamnese:\n(#ANAMNESE#)\n\nDiagnostico / hipotese:\n(#DIAGNOSTICO#)\n\nConduta:\n(#PRESCRICAO#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
    ARRAY['#NOMEPACIENTE#', '#CPFPACIENTE#', '#DATANASCIMENTOPACIENTE#', '#DATADOCUMENTO#', '#ANAMNESE#', '#DIAGNOSTICO#', '#PRESCRICAO#', '#NOMEPROFISSIONAL#', '#CRMPROFISSIONAL#'],
    true,
    CURRENT_TIMESTAMP
),
(
    'template-report-laudo-geral',
    'LAUDO-GERAL',
    'LAUDO GERAL',
    'Modelo base para laudo medico.',
    'LAUDOS',
    'PADRAO A4',
    'REPORT',
    E'LAUDO MEDICO\n\nPaciente: (#NOMEPACIENTE#)\nCPF: (#CPFPACIENTE#)\nData do Exame: (#DATADOCUMENTO#)\n\nExame / procedimento:\n(#NOMEPROCEDIMENTO#)\n\nDescricao:\n(#DESCRICAOLAUDO#)\n\nConclusao:\n(#CONCLUSAOLAUDO#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
    ARRAY['#NOMEPACIENTE#', '#CPFPACIENTE#', '#DATADOCUMENTO#', '#NOMEPROCEDIMENTO#', '#DESCRICAOLAUDO#', '#CONCLUSAOLAUDO#', '#NOMEPROFISSIONAL#', '#CRMPROFISSIONAL#'],
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;
