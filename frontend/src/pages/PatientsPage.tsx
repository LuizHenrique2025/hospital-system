import { useState } from 'react';
import type React from 'react';

import { DirectoryState } from '../components/ui/DirectoryState';
import { EmptyState } from '../components/ui/EmptyState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import { RecordLine } from '../components/ui/RecordLine';
import { ResultPagination } from '../components/ui/ResultPagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { apiRequest } from '../lib/api';
import {
  bloodTypes,
  compactPageSize,
  formatDate,
  genders,
  isPatientActive,
  normalizeDigits,
  patientStatusLabel,
  patientStatusOptions,
  patientStatusTone,
  type PatientFormState,
} from '../lib/appSupport';
import type { PaginatedResponse, Patient, PatientStatus } from '../lib/types';
type PatientsPageProps = {
  editingPatientId: string | null;
  form: PatientFormState;
  isSubmitting: boolean;
  onEditPatient: (patient: Patient) => void;
  onPreparePatient: (patientId: string) => void;
  onResetPatient: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  patients: Patient[];
  patientTotal: number;
  sessionToken: string;
  setForm: React.Dispatch<React.SetStateAction<PatientFormState>>;
};

export function PatientsPage({
  editingPatientId,
  form,
  isSubmitting,
  onEditPatient,
  onPreparePatient,
  onResetPatient,
  onSubmit,
  patients,
  patientTotal,
  sessionToken,
  setForm,
}: PatientsPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedPatients, setHasSearchedPatients] = useState(false);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientResultTotal, setPatientResultTotal] = useState(0);
  const [patientPage, setPatientPage] = useState(1);
  const [patientSearchStatus, setPatientSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [patientSearchError, setPatientSearchError] = useState('');
  const [isEditorRequested, setIsEditorRequested] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'identificacao' | 'contato' | 'saude' | 'status'
  >('identificacao');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const searchTerm = search.trim();
  const canSearchPatient = searchTerm.length >= 2;
  const previewPatient = hasSearchedPatients
    ? (patientResults[0] ?? null)
    : null;
  const selectedPatient =
    patientResults.find((patient) => patient.id === selectedPatientId) ?? null;
  const focusedPatient = selectedPatient ?? previewPatient;
  const isEditorVisible = isEditorRequested || Boolean(editingPatientId);
  const editingPatient =
    patientResults.find((patient) => patient.id === editingPatientId) ??
    patients.find((patient) => patient.id === editingPatientId) ??
    null;
  const cpfConflict = patients.some(
    (patient) =>
      normalizeDigits(patient.cpf) === normalizeDigits(form.cpf) &&
      patient.id !== editingPatientId,
  );
  const canSavePatient =
    [form.name, form.cpf, form.birthDate, form.phone].every(
      (value) => value.trim().length > 0,
    ) && !cpfConflict;
  const tabs = [
    { id: 'identificacao', label: 'Identificacao', hint: 'Dados gerais' },
    { id: 'contato', label: 'Contato', hint: 'Endereco e emergencia' },
    { id: 'saude', label: 'Saude', hint: 'Alergias e historico' },
    { id: 'status', label: 'Status', hint: 'Fluxo do prontuario' },
  ] as const;

  async function loadPatientPage(page = patientPage) {
    if (!canSearchPatient) {
      setPatientSearchStatus('idle');
      setPatientSearchError('Digite ao menos 2 caracteres para pesquisar.');
      return;
    }

    setPatientSearchStatus('loading');
    setPatientSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(compactPageSize),
        q: searchTerm,
      });
      const response = await apiRequest<PaginatedResponse<Patient>>(
        `/patients?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextPatients = response.data ?? [];
      const nextTotal =
        response.meta?.total ?? response.total ?? nextPatients.length;

      setPatientResults(nextPatients);
      setPatientResultTotal(nextTotal);
      setPatientPage(page);
      setSelectedPatientId(null);
      setHasSearchedPatients(true);
      setPatientSearchStatus('ready');
    } catch (error) {
      setPatientResults([]);
      setPatientResultTotal(0);
      setSelectedPatientId(null);
      setHasSearchedPatients(true);
      setPatientSearchStatus('error');
      setPatientSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar pacientes.',
      );
    }
  }

  async function searchPatients(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadPatientPage(1);
  }

  function openNewPatientEditor() {
    onResetPatient();
    setSelectedPatientId(null);
    setIsEditorRequested(true);
    setActiveTab('identificacao');
  }

  function closePatientEditor() {
    onResetPatient();
    setIsEditorRequested(false);
    setActiveTab('identificacao');
  }

  function clearPatientSearch() {
    setSearch('');
    setHasSearchedPatients(false);
    setPatientResults([]);
    setPatientResultTotal(0);
    setPatientPage(1);
    setPatientSearchStatus('idle');
    setPatientSearchError('');
    setSelectedPatientId(null);
    closePatientEditor();
  }

  function openPatientForEdit(patient: Patient) {
    setSelectedPatientId(null);
    setIsEditorRequested(true);
    setActiveTab('identificacao');
    onEditPatient(patient);
  }

  return (
    <section className="page-grid patients-workspace modal-workspace">
      <article className="panel patient-directory">
        <div className="page-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Buscar ou cadastrar</h2>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={openNewPatientEditor}
              type="button"
            >
              Novo paciente
            </button>
            <span className="inline-badge">{patientTotal} no cadastro</span>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearchPatient}
          description="Pesquise por nome, CPF, RG, telefone, email ou cidade. A busca vai direto no banco e retorna resultados paginados."
          error={patientSearchError}
          isLoading={patientSearchStatus === 'loading'}
          onChange={setSearch}
          onClear={clearPatientSearch}
          onSearch={searchPatients}
          placeholder="Digite ao menos 2 caracteres"
          title="Localize antes de abrir uma ficha."
          value={search}
        />

        {focusedPatient ? (
          <aside className="patient-preview-card">
            <div>
              <span className="section-title">Paciente em foco</span>
              <strong>{focusedPatient.name}</strong>
              <small>
                {focusedPatient.cpf} - {formatDate(focusedPatient.birthDate)}
              </small>
            </div>
            <div className="patient-preview-meta">
              <span>{focusedPatient.phone}</span>
              <span>{focusedPatient.city || 'Cidade nao informada'}</span>
              <span>
                {focusedPatient.bloodType || 'Tipo sanguineo pendente'}
              </span>
              <span>{patientStatusLabel(focusedPatient.status)}</span>
            </div>
          </aside>
        ) : null}

        <div className="table-shell">
          <div className="table-head patients-grid">
            <span>Paciente</span>
            <span>Documento</span>
            <span>Status</span>
            <span>Telefone</span>
            <span>Acoes</span>
          </div>

          {!hasSearchedPatients ? (
            <DirectoryState
              code="01"
              title="Nenhum paciente carregado automaticamente."
              description="Use a busca acima para consultar a base ou clique em Novo paciente para abrir um cadastro limpo."
            />
          ) : patientSearchStatus === 'loading' ? (
            <EmptyState
              icon="..."
              title="Consultando o cadastro"
              description="Estamos buscando pacientes no banco de dados."
            />
          ) : patientSearchStatus === 'error' ? (
            <EmptyState
              icon="!"
              title="Busca indisponivel"
              description={
                patientSearchError || 'Nao foi possivel buscar pacientes.'
              }
              action="Tente novamente em instantes."
            />
          ) : patientResults.length === 0 ? (
            <EmptyState
              icon="+"
              title="Nenhum paciente encontrado."
              description="Confira o termo pesquisado ou inicie um novo cadastro se for uma primeira passagem."
              action="Use o botao Novo paciente para cadastrar."
            />
          ) : (
            <>
              <p className="result-caption">
                {patientResults.length} de {patientResultTotal} pacientes
                encontrados
              </p>
              {patientResults.map((patient) => (
                <div className="table-row patients-grid" key={patient.id}>
                  <span>
                    {patient.name}
                    <small>{patient.email || 'Sem email cadastrado'}</small>
                  </span>
                  <span>
                    {patient.cpf}
                    <small>
                      {patient.rg ? `RG ${patient.rg}` : 'RG pendente'}
                    </small>
                  </span>
                  <span>
                    <StatusBadge
                      label={patientStatusLabel(patient.status)}
                      tone={patientStatusTone(patient.status)}
                    />
                    <small>{patient.city || 'Cidade nao informada'}</small>
                  </span>
                  <span>{patient.phone}</span>
                  <div className="patient-actions">
                    <button
                      className="mini-button"
                      onClick={() => setSelectedPatientId(patient.id)}
                      type="button"
                    >
                      Ficha
                    </button>
                    <button
                      className="mini-button"
                      onClick={() => openPatientForEdit(patient)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="mini-button"
                      disabled={!isPatientActive(patient)}
                      onClick={() => onPreparePatient(patient.id)}
                      type="button"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <ResultPagination
          currentPage={patientPage}
          isLoading={patientSearchStatus === 'loading'}
          label="pacientes"
          onPageChange={(page) => void loadPatientPage(page)}
          pageSize={compactPageSize}
          totalItems={patientResultTotal}
        />

        <OperationalModal
          eyebrow="Ficha completa"
          isOpen={Boolean(selectedPatient)}
          onClose={() => setSelectedPatientId(null)}
          title={selectedPatient?.name ?? 'Paciente'}
          toneLabel={
            selectedPatient ? patientStatusLabel(selectedPatient.status) : ''
          }
        >
          {selectedPatient ? (
            <section className="patient-record-card modal-record-card">
              <div className="modal-action-row">
                <button
                  className="ghost-button"
                  onClick={() => openPatientForEdit(selectedPatient)}
                  type="button"
                >
                  Editar ficha
                </button>
              </div>

              <div className="record-grid">
                <RecordLine label="CPF" value={selectedPatient.cpf} />
                <RecordLine label="RG" value={selectedPatient.rg} />
                <RecordLine
                  label="Nascimento"
                  value={formatDate(selectedPatient.birthDate)}
                />
                <RecordLine
                  label="Status"
                  value={patientStatusLabel(selectedPatient.status)}
                />
                <RecordLine label="Telefone" value={selectedPatient.phone} />
                <RecordLine label="Email" value={selectedPatient.email} />
                <RecordLine label="Endereco" value={selectedPatient.address} />
                <RecordLine
                  label="Cidade/UF"
                  value={[selectedPatient.city, selectedPatient.state]
                    .filter(Boolean)
                    .join(' / ')}
                />
                <RecordLine
                  label="Contato emergencia"
                  value={selectedPatient.emergencyContact}
                />
                <RecordLine
                  label="Telefone emergencia"
                  value={selectedPatient.emergencyPhone}
                />
                <RecordLine
                  label="Alergias"
                  value={selectedPatient.allergies}
                />
                <RecordLine
                  label="Historico"
                  value={selectedPatient.medicalHistory}
                />
              </div>

              {selectedPatient.blockReason ? (
                <p className="empty-state compact">
                  {selectedPatient.blockReason}
                </p>
              ) : null}

              <div className="document-list">
                <span className="section-title">Documentos anexados</span>
                {selectedPatient.documents &&
                selectedPatient.documents.length > 0 ? (
                  selectedPatient.documents.map((document) => (
                    <small key={document}>{document}</small>
                  ))
                ) : (
                  <small>Nenhum documento registrado ainda.</small>
                )}
              </div>
            </section>
          ) : null}
        </OperationalModal>
      </article>

      <OperationalModal
        eyebrow="Cadastro assistido"
        isOpen={isEditorVisible}
        onClose={closePatientEditor}
        title={editingPatient ? 'Editar paciente' : 'Novo paciente'}
        toneLabel={editingPatient ? 'Ficha em edicao' : 'Cadastro em abas'}
      >
        <form className="modal-form-panel patient-editor" onSubmit={onSubmit}>
          <div
            className="patient-tabs"
            role="tablist"
            aria-label="Cadastro do paciente"
          >
            {tabs.map((tab) => (
              <button
                aria-pressed={activeTab === tab.id}
                className={`patient-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <strong>{tab.label}</strong>
                <small>{tab.hint}</small>
              </button>
            ))}
          </div>

          {activeTab === 'identificacao' ? (
            <div className="section-block">
              <p className="section-title">Identificacao</p>
              <div className="field-grid three-columns">
                <label className="field full-row">
                  <span>Nome completo</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>CPF</span>
                  <input
                    value={form.cpf}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cpf: normalizeDigits(event.target.value).slice(0, 11),
                      }))
                    }
                    required
                  />
                  {cpfConflict ? (
                    <small className="form-warning">
                      CPF ja esta vinculado a outro paciente.
                    </small>
                  ) : null}
                </label>
                <label className="field">
                  <span>RG</span>
                  <input
                    value={form.rg}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rg: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Nascimento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Genero</span>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        gender: event.target
                          .value as PatientFormState['gender'],
                      }))
                    }
                  >
                    {genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'contato' ? (
            <div className="section-block">
              <p className="section-title">Contato e endereco</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>CEP</span>
                  <input
                    value={form.zipCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        zipCode: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <input
                    value={form.state}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        state: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Contato emergencia</span>
                  <input
                    value={form.emergencyContact}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        emergencyContact: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Telefone emergencia</span>
                  <input
                    value={form.emergencyPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        emergencyPhone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Endereco</span>
                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'saude' ? (
            <div className="section-block">
              <p className="section-title">Dados clinicos de referencia</p>
              <div className="field-grid two-columns">
                <label className="field">
                  <span>Tipo sanguineo</span>
                  <select
                    value={form.bloodType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bloodType: event.target.value,
                      }))
                    }
                  >
                    {bloodTypes.map((bloodType) => (
                      <option key={bloodType || 'none'} value={bloodType}>
                        {bloodType || 'Nao informado'}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="helper-block patient-form-note">
                  <span>Como usar</span>
                  <strong>
                    Registre apenas sinais importantes para triagem.
                  </strong>
                  <small>
                    O consultorio medico depois detalha evolucao, diagnostico e
                    prescricao em modulo proprio.
                  </small>
                </div>
                <label className="field full-row">
                  <span>Alergias</span>
                  <textarea
                    value={form.allergies}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allergies: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Historico medico</span>
                  <textarea
                    value={form.medicalHistory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        medicalHistory: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'status' ? (
            <div className="section-block">
              <p className="section-title">Status operacional</p>
              <div className="field-grid two-columns">
                <label className="field">
                  <span>Status do paciente</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as PatientStatus,
                        blockReason:
                          event.target.value === 'BLOCKED'
                            ? current.blockReason
                            : '',
                      }))
                    }
                  >
                    {patientStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="status-checklist">
                  {patientStatusOptions.map((option) => (
                    <article key={option.value}>
                      <span>{option.label}</span>
                      <strong>
                        {form.status === option.value
                          ? 'Selecionado'
                          : 'Disponivel'}
                      </strong>
                      <small>{option.hint}</small>
                    </article>
                  ))}
                </div>
                <label className="field full-row">
                  <span>Motivo do bloqueio</span>
                  <textarea
                    disabled={form.status !== 'BLOCKED'}
                    placeholder="Obrigatorio apenas quando o paciente estiver bloqueado."
                    value={form.blockReason}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        blockReason: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Documentos anexados</span>
                  <textarea
                    placeholder="Informe um documento por linha: RG, CPF, comprovante, autorizacao..."
                    value={form.documents}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        documents: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="patient-editor-actions">
            <button
              className="ghost-button"
              onClick={closePatientEditor}
              type="button"
            >
              {editingPatient ? 'Cancelar edicao' : 'Fechar cadastro'}
            </button>
            <button
              className="primary-button"
              disabled={isSubmitting || !canSavePatient}
              type="submit"
            >
              {isSubmitting
                ? 'Salvando...'
                : canSavePatient
                  ? editingPatient
                    ? 'Atualizar ficha'
                    : 'Salvar paciente'
                  : 'Preencha identificacao'}
            </button>
          </div>
        </form>
      </OperationalModal>
    </section>
  );
}


