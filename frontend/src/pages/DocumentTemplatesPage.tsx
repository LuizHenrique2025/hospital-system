import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { DirectoryState } from '../components/ui/DirectoryState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import { ResultPagination } from '../components/ui/ResultPagination';
import { apiRequest } from '../lib/api';
import type {
  DocumentTemplate,
  DocumentTemplateType,
  PaginatedResponse,
} from '../lib/types';

type DocumentTemplatesPageProps = {
  description: string;
  environment: string;
  sessionToken: string;
  templateType: DocumentTemplateType;
  title: string;
};

type TemplateFormState = {
  active: boolean;
  code: string;
  content: string;
  description: string;
  group: string;
  layout: string;
  name: string;
  type: DocumentTemplateType;
  variables: string;
};

const templatePageSize = 12;

const templateTypeLabel: Record<DocumentTemplateType, string> = {
  DOCUMENT: 'Documento',
  REPORT: 'Laudo',
};

const defaultTemplateContent: Record<DocumentTemplateType, string> = {
  DOCUMENT:
    'Paciente: (#NOMEPACIENTE#)\nCPF: (#CPFPACIENTE#)\nData: (#DATADOCUMENTO#)\n\nConteudo:\n(#OBSERVACAOCLINICA#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
  REPORT:
    'LAUDO MEDICO\n\nPaciente: (#NOMEPACIENTE#)\nExame: (#NOMEPROCEDIMENTO#)\n\nDescricao:\n(#DESCRICAOLAUDO#)\n\nConclusao:\n(#CONCLUSAOLAUDO#)\n\n#NOMEPROFISSIONAL#\nCRM #CRMPROFISSIONAL#',
};

const sampleVariables: Record<string, string> = {
  '#ANAMNESE#': 'Paciente em acompanhamento ambulatorial.',
  '#CIDCONS#': 'A DEFINIR',
  '#CONCLUSAOLAUDO#': 'Conclusao do laudo sera preenchida pelo medico.',
  '#CPFPACIENTE#': '022.827.291-29',
  '#DATADOCUMENTO#': new Date().toLocaleDateString('pt-BR'),
  '#DATANASCIMENTOPACIENTE#': '14/01/2004',
  '#DESCRICAOLAUDO#': 'Descricao tecnica do exame.',
  '#DIAGNOSTICO#': 'Hipotese diagnostica em avaliacao.',
  '#HORADOCUMENTO#': '10:00',
  '#HORAINICIO#': '09:30',
  '#INDICACAOCLINICA#': 'Indicacao clinica informada no atendimento.',
  '#LISTAGEMEXAMESPEDIDOEXAME#': 'Hemograma completo\nPCR\nRaio-X torax',
  '#NOMECONVENIO#': 'PARTICULAR',
  '#NOMEPACIENTE#': 'LUIZ HENRIQUE ARAUJO GIMENEZ',
  '#NOMEPROCEDIMENTO#': 'EXAME / PROCEDIMENTO',
  '#NOMEPROFISSIONAL#': 'DRA. MARIANA COSTA',
  '#OBSERVACAOCLINICA#': 'Observacao clinica do atendimento.',
  '#PRESCRICAO#': 'Prescricao medica em linhas.',
  '#CRMPROFISSIONAL#': '123456/SC',
};

export function DocumentTemplatesPage({
  description,
  environment,
  sessionToken,
  templateType,
  title,
}: DocumentTemplatesPageProps) {
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templatePage, setTemplatePage] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(() =>
    createInitialTemplateForm(templateType),
  );
  const [isSaving, setIsSaving] = useState(false);

  const searchTerm = search.trim();
  const canSearch = searchTerm.length >= 2;
  const canSave =
    form.code.trim().length > 0 &&
    form.name.trim().length > 2 &&
    form.group.trim().length > 1 &&
    form.content.trim().length > 5;
  const previewContent = useMemo(
    () => renderPreview(form.content),
    [form.content],
  );
  const detectedVariables = useMemo(
    () => extractVariables(form.content),
    [form.content],
  );

  useEffect(() => {
    setForm(createInitialTemplateForm(templateType));
    void loadTemplates('', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType]);

  async function searchTemplates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearch) {
      setError('Digite ao menos 2 caracteres para pesquisar modelos.');
      return;
    }

    await loadTemplates(searchTerm, 1);
  }

  async function loadTemplates(term = searchTerm, page = templatePage) {
    setStatus('loading');
    setError('');

    try {
      const queryParams = new URLSearchParams({
        active: 'true',
        limit: String(templatePageSize),
        page: String(page),
        type: templateType,
      });

      if (term) {
        queryParams.set('q', term);
      }

      const response = await apiRequest<PaginatedResponse<DocumentTemplate>>(
        `/document-templates?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextTemplates = response.data ?? [];

      setTemplates(nextTemplates);
      setTemplateTotal(response.meta?.total ?? response.total ?? nextTemplates.length);
      setTemplatePage(page);
      setStatus('ready');
    } catch (requestError) {
      setTemplates([]);
      setTemplateTotal(0);
      setStatus('error');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel buscar modelos.',
      );
    }
  }

  function clearSearch() {
    setSearch('');
    setError('');
    void loadTemplates('', 1);
  }

  function openEditor(template?: DocumentTemplate) {
    setEditingTemplate(template ?? null);
    setForm(
      template ? createTemplateForm(template) : createInitialTemplateForm(templateType),
    );
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingTemplate(null);
    setForm(createInitialTemplateForm(templateType));
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      setError('Preencha codigo, nome, grupo e conteudo do modelo.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = createTemplatePayload(form, detectedVariables);
      const savedTemplate = editingTemplate
        ? await apiRequest<DocumentTemplate>(
            `/document-templates/${editingTemplate.id}`,
            {
              body: payload,
              method: 'PATCH',
              token: sessionToken,
            },
          )
        : await apiRequest<DocumentTemplate>('/document-templates', {
            body: payload,
            token: sessionToken,
          });

      setTemplates((current) => {
        const withoutCurrent = current.filter(
          (template) => template.id !== savedTemplate.id,
        );
        return [savedTemplate, ...withoutCurrent].slice(0, templatePageSize);
      });
      setTemplateTotal((current) =>
        editingTemplate ? current : Math.max(current + 1, 1),
      );
      closeEditor();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel salvar o modelo.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateTemplate(template: DocumentTemplate) {
    setIsSaving(true);
    setError('');

    try {
      await apiRequest(`/document-templates/${template.id}`, {
        method: 'DELETE',
        token: sessionToken,
      });
      setTemplates((current) =>
        current.filter((currentTemplate) => currentTemplate.id !== template.id),
      );
      setTemplateTotal((current) => Math.max(current - 1, 0));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel inativar o modelo.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-grid document-template-workspace modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">{environment}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={() => openEditor()}
              type="button"
            >
              Novo modelo
            </button>
            <span className="inline-badge">
              {templateTotal} cadastro(s)
            </span>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearch}
          description="Pesquise por codigo, nome, descricao, grupo, layout ou variavel do documento."
          error={error}
          isLoading={status === 'loading'}
          onChange={setSearch}
          onClear={clearSearch}
          onSearch={searchTemplates}
          placeholder="Ex: ATESTADO, PEDIDO EXAME, LAUDO..."
          resultText={
            status === 'ready'
              ? `${templates.length} de ${templateTotal} modelos encontrados`
              : undefined
          }
          title="Localize antes de editar ou cadastrar."
          value={search}
        />

        <div className="table-shell">
          <div className="table-head document-template-grid">
            <span>Codigo</span>
            <span>Nome</span>
            <span>Grupo</span>
            <span>Layout</span>
            <span>Status</span>
            <span>Acoes</span>
          </div>

          {status === 'loading' ? (
            <p className="empty-state">Buscando modelos cadastrados...</p>
          ) : templates.length === 0 ? (
            <DirectoryState
              code={templateType === 'DOCUMENT' ? 'MD' : 'ML'}
              title="Nenhum modelo encontrado."
              description="Cadastre modelos padrao para o consultorio usar na geracao de documentos e laudos."
            />
          ) : (
            templates.map((template) => (
              <div className="table-row document-template-grid" key={template.id}>
                <span>
                  {template.code}
                  <small>{templateTypeLabel[template.type]}</small>
                </span>
                <span>
                  {template.name}
                  <small>{template.description || 'Sem descricao'}</small>
                </span>
                <span>{template.group}</span>
                <span>{template.layout || 'PADRAO'}</span>
                <span>{template.active ? 'Ativo' : 'Inativo'}</span>
                <div className="patient-actions">
                  <button
                    className="mini-button"
                    onClick={() => openEditor(template)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="mini-button"
                    disabled={isSaving}
                    onClick={() => void deactivateTemplate(template)}
                    type="button"
                  >
                    Inativar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ResultPagination
          currentPage={templatePage}
          isLoading={status === 'loading'}
          label="modelos"
          onPageChange={(page) => void loadTemplates(searchTerm, page)}
          pageSize={templatePageSize}
          totalItems={templateTotal}
        />
      </article>

      <OperationalModal
        eyebrow="Cadastro de modelo"
        isOpen={isEditorOpen}
        onClose={closeEditor}
        size="clinical"
        title={editingTemplate ? 'Editar modelo' : 'Novo modelo'}
        toneLabel={templateTypeLabel[form.type]}
      >
        <form className="modal-form-panel template-editor" onSubmit={saveTemplate}>
          <section className="section-block">
            <p className="section-title">Dados gerais</p>
            <div className="field-grid three-columns">
              <label className="field">
                <span>Codigo</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="DOC-ATESTADO-MEDICO"
                  value={form.code}
                />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as DocumentTemplateType,
                    }))
                  }
                  value={form.type}
                >
                  <option value="DOCUMENT">Documento</option>
                  <option value="REPORT">Laudo</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.value === 'true',
                    }))
                  }
                  value={String(form.active)}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
              <label className="field full-row">
                <span>Nome</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="ATESTADO MEDICO"
                  value={form.name}
                />
              </label>
              <label className="field">
                <span>Grupo</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      group: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="ATESTADOS"
                  value={form.group}
                />
              </label>
              <label className="field">
                <span>Layout</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      layout: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="PADRAO A4"
                  value={form.layout}
                />
              </label>
              <label className="field full-row">
                <span>Descricao</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Uso do modelo dentro do atendimento."
                  value={form.description}
                />
              </label>
            </div>
          </section>

          <section className="template-editor-grid">
            <label className="field">
              <span>Modelo do documento</span>
              <textarea
                className="template-content-textarea"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                value={form.content}
              />
            </label>

            <aside className="template-preview-card">
              <div>
                <p className="eyebrow">Preview com variaveis</p>
                <h3>Exemplo renderizado</h3>
              </div>
              <pre>{previewContent}</pre>
            </aside>
          </section>

          <section className="section-block">
            <p className="section-title">Variaveis do modelo</p>
            <div className="template-variable-list">
              {detectedVariables.length === 0 ? (
                <span>Nenhuma variavel detectada.</span>
              ) : (
                detectedVariables.map((variable) => (
                  <span key={variable}>{variable}</span>
                ))
              )}
            </div>
            <label className="field">
              <span>Variaveis manuais</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    variables: event.target.value,
                  }))
                }
                placeholder="#NOMEPACIENTE#, #CPFPACIENTE#..."
                value={form.variables}
              />
            </label>
          </section>

          <div className="patient-editor-actions">
            <button className="ghost-button" onClick={closeEditor} type="button">
              Fechar
            </button>
            <button
              className="primary-button"
              disabled={isSaving || !canSave}
              type="submit"
            >
              {isSaving ? 'Salvando...' : 'Salvar modelo'}
            </button>
          </div>
        </form>
      </OperationalModal>
    </section>
  );
}

function createInitialTemplateForm(
  type: DocumentTemplateType,
): TemplateFormState {
  return {
    active: true,
    code: type === 'DOCUMENT' ? 'DOC-' : 'LAUDO-',
    content: defaultTemplateContent[type],
    description: '',
    group: type === 'DOCUMENT' ? 'ATESTADOS' : 'LAUDOS',
    layout: 'PADRAO A4',
    name: '',
    type,
    variables: '',
  };
}

function createTemplateForm(template: DocumentTemplate): TemplateFormState {
  return {
    active: template.active,
    code: template.code,
    content: template.content,
    description: template.description ?? '',
    group: template.group,
    layout: template.layout ?? '',
    name: template.name,
    type: template.type,
    variables: template.variables.join(', '),
  };
}

function createTemplatePayload(
  form: TemplateFormState,
  detectedVariables: string[],
) {
  return {
    active: form.active,
    code: form.code,
    content: form.content,
    description: form.description || undefined,
    group: form.group,
    layout: form.layout || undefined,
    name: form.name,
    type: form.type,
    variables: Array.from(
      new Set([
        ...detectedVariables,
        ...form.variables
          .split(/[,\n;]/)
          .map((variable) => normalizeVariable(variable))
          .filter(Boolean),
      ]),
    ),
  };
}

function extractVariables(content: string) {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/#[A-Z0-9_]+#/gi), (match) =>
        normalizeVariable(match[0]),
      ).filter(Boolean),
    ),
  ).sort();
}

function normalizeVariable(variable: string) {
  const normalized = variable
    .trim()
    .replace(/#/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();

  return normalized ? `#${normalized}#` : '';
}

function renderPreview(content: string) {
  return content.replace(/#[A-Z0-9_]+#/gi, (token) => {
    return sampleVariables[token.toUpperCase()] ?? token;
  });
}
