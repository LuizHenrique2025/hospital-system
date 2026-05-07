import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type React from 'react';

import { DetailItem } from '../components/ui/DetailItem';
import { DirectoryState } from '../components/ui/DirectoryState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import { apiRequest } from '../lib/api';
import {
  appointmentStatuses,
  calculateAge,
  careStatusSummary,
  createCareRecordForm,
  formatDate,
  formatDateTime,
  formatTime,
  humanizeEnum,
  matchAppointment,
  normalizeCareRecord,
  statusTone,
  type CareModalVariant,
  type CareRecordFormState,
  type CareRecordPayload,
} from '../lib/appSupport';
import type {
  Appointment,
  DocumentTemplate,
  PaginatedResponse,
  Patient,
} from '../lib/types';
type CarePageProps = {
  appointments: Appointment[];
  canManageCare: boolean;
  emptyMessage?: string;
  eyebrow?: string;
  focusEyebrow?: string;
  initiallyShowQueue?: boolean;
  isSubmitting: boolean;
  modalVariant?: CareModalVariant;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  patients: Patient[];
  queueActionLabel?: string;
  sessionToken?: string;
  statusEyebrow?: string;
  statusTitle?: string;
  title?: string;
};

export function CarePage({
  appointments,
  canManageCare,
  emptyMessage = 'Nenhum atendimento visivel na fila.',
  eyebrow = 'Atendimento',
  focusEyebrow = 'Paciente em foco',
  initiallyShowQueue = false,
  isSubmitting,
  modalVariant = 'default',
  onSaveCareRecord,
  patients,
  queueActionLabel = 'Abrir ficha',
  sessionToken,
  statusEyebrow = 'Leitura operacional',
  statusTitle = 'Status e proxima acao',
  title = 'Fila operacional',
}: CarePageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedQueue, setHasSearchedQueue] = useState(initiallyShowQueue);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    null | string
  >(null);
  const [isCareModalOpen, setIsCareModalOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchQueue = search.trim().length >= 2;
  const filteredQueue = useMemo(
    () =>
      hasSearchedQueue
        ? [...appointments]
            .filter((appointment) => appointment.status !== 'CANCELADA')
            .filter((appointment) =>
              matchAppointment(appointment, deferredSearch),
            )
            .sort(
              (left, right) =>
                new Date(left.appointmentDate).getTime() -
                new Date(right.appointmentDate).getTime(),
            )
        : [],
    [appointments, deferredSearch, hasSearchedQueue],
  );
  const activeAppointment = selectedAppointmentId
    ? (filteredQueue.find(
        (appointment) => appointment.id === selectedAppointmentId,
      ) ?? null)
    : null;
  const activePatientAppointments = activeAppointment
    ? appointments
        .filter(
          (appointment) =>
            appointment.patient.id === activeAppointment.patient.id,
        )
        .sort(
          (left, right) =>
            new Date(right.appointmentDate).getTime() -
            new Date(left.appointmentDate).getTime(),
        )
    : [];
  const waitingCount = appointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === 'CONFIRMADA',
  ).length;
  const completedCount = appointments.filter(
    (appointment) => appointment.status === 'REALIZADA',
  ).length;
  const missingCount = appointments.filter(
    (appointment) => appointment.status === 'NAO_COMPARECEU',
  ).length;

  useEffect(() => {
    if (
      selectedAppointmentId &&
      !filteredQueue.some(
        (appointment) => appointment.id === selectedAppointmentId,
      )
    ) {
      setSelectedAppointmentId(null);
      setIsCareModalOpen(false);
    }
  }, [filteredQueue, selectedAppointmentId]);

  function searchQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchQueue) {
      setHasSearchedQueue(true);
    }
  }

  function clearQueueSearch() {
    setSearch('');
    setHasSearchedQueue(false);
    setSelectedAppointmentId(null);
    setIsCareModalOpen(false);
  }

  function openAppointmentModal(appointment: Appointment) {
    setSelectedAppointmentId(appointment.id);
    setIsCareModalOpen(true);
  }

  function closeAppointmentModal() {
    setIsCareModalOpen(false);
  }

  return (
    <>
      <section className="summary-strip care-strip">
        <article className="summary-card">
          <span>Abertos</span>
          <strong>{waitingCount}</strong>
          <small>agendados e confirmados</small>
        </article>
        <article className="summary-card">
          <span>Confirmadas</span>
          <strong>{confirmedCount}</strong>
          <small>prontas para chamada</small>
        </article>
        <article className="summary-card">
          <span>Realizadas</span>
          <strong>{completedCount}</strong>
          <small>consultas encerradas</small>
        </article>
        <article className="summary-card">
          <span>Base assistencial</span>
          <strong>{patients.length}</strong>
          <small>pacientes cadastrados</small>
        </article>
      </section>

      <section className="page-grid modal-workspace care-list-workspace">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
            </div>
            <span className="inline-badge">
              {appointments.length} registros
            </span>
          </div>

          <OperationalSearchCard
            canSearch={canSearchQueue}
            description={
              modalVariant === 'consultorio'
                ? 'Atendimentos abertos pela recepcao aparecem nesta fila do medico. Use a busca para localizar paciente, status ou tipo.'
                : 'Pesquise por paciente, medico, status ou tipo para abrir apenas a fila relacionada ao atendimento desejado.'
            }
            onChange={setSearch}
            onClear={clearQueueSearch}
            onSearch={searchQueue}
            placeholder="Buscar por paciente, medico, status ou tipo"
            resultText={
              hasSearchedQueue
                ? `${filteredQueue.length} atendimentos encontrados`
                : undefined
            }
            title="Abra a fila pelo contexto de trabalho."
            value={search}
          />

          <div className="queue-shell">
            {!hasSearchedQueue ? (
              <DirectoryState
                code="01"
                title="Nenhum atendimento carregado automaticamente."
                description="Use a busca acima para localizar paciente, medico ou status antes de abrir a fila."
              />
            ) : filteredQueue.length === 0 ? (
              <p className="empty-state">{emptyMessage}</p>
            ) : (
              filteredQueue.map((appointment) => (
                <button
                  className={`queue-card ${
                    activeAppointment?.id === appointment.id ? 'is-active' : ''
                  }`}
                  key={appointment.id}
                  onClick={() => openAppointmentModal(appointment)}
                  type="button"
                >
                  <div className="card-topline">
                    <div className="queue-identity">
                      <strong>{appointment.patient.name}</strong>
                      <span>{appointment.doctor.user.name}</span>
                    </div>
                    <span className="queue-status">
                      <em
                        className={`status-dot ${statusTone(appointment.status)}`}
                      />
                      {humanizeEnum(appointment.status)}
                    </span>
                  </div>
                  <div className="queue-meta">
                    <span>{formatDateTime(appointment.appointmentDate)}</span>
                    <span>{humanizeEnum(appointment.type)}</span>
                    <span>{appointment.patient.phone || 'Sem telefone'}</span>
                    <span>{queueActionLabel}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">{focusEyebrow}</p>
                <h2>
                  {activeAppointment
                    ? activeAppointment.patient.name
                    : 'Selecione um atendimento'}
                </h2>
              </div>
              {activeAppointment ? (
                <span className="inline-badge">
                  {humanizeEnum(activeAppointment.status)}
                </span>
              ) : null}
            </div>

            {activeAppointment ? (
              <>
                <div className="context-band">
                  <article className="context-card">
                    <span>Horario</span>
                    <strong>
                      {formatTime(activeAppointment.appointmentDate)}
                    </strong>
                    <small>
                      {formatDate(activeAppointment.appointmentDate)}
                    </small>
                  </article>
                  <article className="context-card">
                    <span>Idade</span>
                    <strong>
                      {calculateAge(activeAppointment.patient.birthDate)} anos
                    </strong>
                    <small>
                      {formatDate(activeAppointment.patient.birthDate)}
                    </small>
                  </article>
                </div>

                <div className="field-grid two-columns">
                  <div className="helper-block">
                    <span>CPF</span>
                    <strong>{activeAppointment.patient.cpf}</strong>
                  </div>
                  <div className="helper-block">
                    <span>Contato</span>
                    <strong>
                      {activeAppointment.patient.phone || 'Nao informado'}
                    </strong>
                  </div>
                  <div className="helper-block">
                    <span>Tipo sanguineo</span>
                    <strong>
                      {activeAppointment.patient.bloodType || 'Nao informado'}
                    </strong>
                  </div>
                  <div className="helper-block">
                    <span>Cidade</span>
                    <strong>
                      {activeAppointment.patient.city
                        ? `${activeAppointment.patient.city}${
                            activeAppointment.patient.state
                              ? ` / ${activeAppointment.patient.state}`
                              : ''
                          }`
                        : 'Nao informada'}
                    </strong>
                  </div>
                  <div className="helper-block full-row">
                    <span>Alergias</span>
                    <strong>
                      {activeAppointment.patient.allergies ||
                        'Nenhuma alergia informada'}
                    </strong>
                  </div>
                  <div className="helper-block full-row">
                    <span>Historico clinico</span>
                    <strong>
                      {activeAppointment.patient.medicalHistory ||
                        'Historico ainda nao preenchido'}
                    </strong>
                  </div>
                  <div className="helper-block full-row">
                    <span>Profissional responsavel</span>
                    <strong>
                      {activeAppointment.doctor.user.name} â€¢ CRM{' '}
                      {activeAppointment.doctor.crm}/
                      {activeAppointment.doctor.crmUf}
                    </strong>
                    <span>
                      {activeAppointment.doctor.specialties.length > 0
                        ? activeAppointment.doctor.specialties.join(', ')
                        : 'Especialidade nao informada'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="empty-state compact">
                Escolha um atendimento da fila para abrir o contexto do
                paciente.
              </p>
            )}
          </article>

          <CareRecordPanel
            appointment={activeAppointment}
            canManageCare={canManageCare}
            isSubmitting={isSubmitting}
            key={
              activeAppointment
                ? `${activeAppointment.id}-${activeAppointment.updatedAt ?? activeAppointment.status}`
                : 'care-record-empty'
            }
            onSaveCareRecord={onSaveCareRecord}
          />

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">{statusEyebrow}</p>
                <h2>{statusTitle}</h2>
              </div>
            </div>

            <div className="list-shell">
              <div className="list-row">
                <div>
                  <strong>Aguardando atendimento</strong>
                  <span>agendadas ou confirmadas</span>
                </div>
                <div>
                  <span>{waitingCount}</span>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Realizadas</strong>
                  <span>consulta fechada</span>
                </div>
                <div>
                  <span>{completedCount}</span>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Ausencias</strong>
                  <span>nao compareceu</span>
                </div>
                <div>
                  <span>{missingCount}</span>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Leitura atual</strong>
                  <span>
                    {activeAppointment
                      ? careStatusSummary(activeAppointment.status)
                      : 'Nenhum atendimento selecionado'}
                  </span>
                </div>
                <div>
                  <span>
                    {activeAppointment
                      ? humanizeEnum(activeAppointment.type)
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <OperationalModal
        eyebrow={focusEyebrow}
        isOpen={Boolean(activeAppointment) && isCareModalOpen}
        onClose={closeAppointmentModal}
        size={modalVariant === 'consultorio' ? 'clinical' : 'wide'}
        title={activeAppointment?.patient.name ?? 'Atendimento'}
        toneLabel={
          activeAppointment ? humanizeEnum(activeAppointment.status) : undefined
        }
      >
        {activeAppointment && modalVariant === 'consultorio' ? (
          <ConsultorioRecordPanel
            appointment={activeAppointment}
            canManageCare={canManageCare}
            completedCount={completedCount}
            isSubmitting={isSubmitting}
            key={`${activeAppointment.id}-${
              activeAppointment.updatedAt ?? activeAppointment.status
            }-consultorio`}
            missingCount={missingCount}
            onSaveCareRecord={onSaveCareRecord}
            relatedAppointments={activePatientAppointments}
            sessionToken={sessionToken}
            waitingCount={waitingCount}
          />
        ) : activeAppointment ? (
          <div className="care-modal-layout">
            <section className="modal-record-card">
              <div className="context-band care-context-band">
                <article className="context-card">
                  <span>Horario</span>
                  <strong>
                    {formatTime(activeAppointment.appointmentDate)}
                  </strong>
                  <small>{formatDate(activeAppointment.appointmentDate)}</small>
                </article>
                <article className="context-card">
                  <span>Idade</span>
                  <strong>
                    {calculateAge(activeAppointment.patient.birthDate)} anos
                  </strong>
                  <small>
                    {formatDate(activeAppointment.patient.birthDate)}
                  </small>
                </article>
                <article className="context-card">
                  <span>Atendimento</span>
                  <strong>{humanizeEnum(activeAppointment.type)}</strong>
                  <small>{careStatusSummary(activeAppointment.status)}</small>
                </article>
              </div>

              <div className="field-grid two-columns">
                <div className="helper-block">
                  <span>CPF</span>
                  <strong>{activeAppointment.patient.cpf}</strong>
                </div>
                <div className="helper-block">
                  <span>Contato</span>
                  <strong>
                    {activeAppointment.patient.phone || 'Nao informado'}
                  </strong>
                </div>
                <div className="helper-block">
                  <span>Tipo sanguineo</span>
                  <strong>
                    {activeAppointment.patient.bloodType || 'Nao informado'}
                  </strong>
                </div>
                <div className="helper-block">
                  <span>Cidade</span>
                  <strong>
                    {activeAppointment.patient.city
                      ? `${activeAppointment.patient.city}${
                          activeAppointment.patient.state
                            ? ` / ${activeAppointment.patient.state}`
                            : ''
                        }`
                      : 'Nao informada'}
                  </strong>
                </div>
                <div className="helper-block full-row">
                  <span>Alergias</span>
                  <strong>
                    {activeAppointment.patient.allergies ||
                      'Nenhuma alergia informada'}
                  </strong>
                </div>
                <div className="helper-block full-row">
                  <span>Historico clinico</span>
                  <strong>
                    {activeAppointment.patient.medicalHistory ||
                      'Historico ainda nao preenchido'}
                  </strong>
                </div>
                <div className="helper-block full-row">
                  <span>Profissional responsavel</span>
                  <strong>
                    {activeAppointment.doctor.user.name} - CRM{' '}
                    {activeAppointment.doctor.crm}/
                    {activeAppointment.doctor.crmUf}
                  </strong>
                  <span>
                    {activeAppointment.doctor.specialties.length > 0
                      ? activeAppointment.doctor.specialties.join(', ')
                      : 'Especialidade nao informada'}
                  </span>
                </div>
              </div>
            </section>

            <CareRecordPanel
              appointment={activeAppointment}
              canManageCare={canManageCare}
              isSubmitting={isSubmitting}
              key={`${activeAppointment.id}-${
                activeAppointment.updatedAt ?? activeAppointment.status
              }`}
              onSaveCareRecord={onSaveCareRecord}
            />

            <section className="panel care-status-panel">
              <div className="page-header">
                <div>
                  <p className="eyebrow">{statusEyebrow}</p>
                  <h2>{statusTitle}</h2>
                </div>
              </div>

              <div className="list-shell">
                <div className="list-row">
                  <div>
                    <strong>Aguardando atendimento</strong>
                    <span>agendadas ou confirmadas</span>
                  </div>
                  <div>
                    <span>{waitingCount}</span>
                  </div>
                </div>
                <div className="list-row">
                  <div>
                    <strong>Realizadas</strong>
                    <span>consulta fechada</span>
                  </div>
                  <div>
                    <span>{completedCount}</span>
                  </div>
                </div>
                <div className="list-row">
                  <div>
                    <strong>Ausencias</strong>
                    <span>nao compareceu</span>
                  </div>
                  <div>
                    <span>{missingCount}</span>
                  </div>
                </div>
                <div className="list-row">
                  <div>
                    <strong>Leitura atual</strong>
                    <span>{careStatusSummary(activeAppointment.status)}</span>
                  </div>
                  <div>
                    <span>{humanizeEnum(activeAppointment.type)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </OperationalModal>
    </>
  );
}

type CareRecordPanelProps = {
  appointment: Appointment | null;
  canManageCare: boolean;
  isSubmitting: boolean;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
};

function CareRecordPanel({
  appointment,
  canManageCare,
  isSubmitting,
  onSaveCareRecord,
}: CareRecordPanelProps) {
  const [form, setForm] = useState<CareRecordFormState>(() =>
    appointment
      ? createCareRecordForm(appointment)
      : {
          status: 'AGENDADA',
          notes: '',
          diagnosis: '',
          prescription: '',
        },
  );

  if (!appointment) {
    return (
      <article className="panel form-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Ficha rapida</p>
            <h2>Conduta e fechamento</h2>
          </div>
        </div>

        <p className="empty-state compact">
          Selecione um atendimento para registrar observacoes, diagnostico,
          prescricao e status.
        </p>
      </article>
    );
  }

  const activeAppointment = appointment;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageCare) {
      return;
    }

    await onSaveCareRecord(activeAppointment.id, normalizeCareRecord(form));
  }

  async function applyQuickStatus(nextStatus: string) {
    if (!canManageCare) {
      return;
    }

    const nextForm = {
      ...form,
      status: nextStatus,
    };

    setForm(nextForm);
    await onSaveCareRecord(activeAppointment.id, normalizeCareRecord(nextForm));
  }

  return (
    <article className="panel form-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ficha rapida</p>
          <h2>Conduta e fechamento</h2>
        </div>
        <span className="inline-badge">
          {humanizeEnum(activeAppointment.type)}
        </span>
      </div>

      <form className="section-block" onSubmit={handleSubmit}>
        <div className="field-grid two-columns">
          <label className="field">
            <span>Status do atendimento</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {humanizeEnum(status)}
                </option>
              ))}
            </select>
          </label>

          <div className="helper-block">
            <span>Resumo do status</span>
            <strong>{careStatusSummary(form.status)}</strong>
            <span>{formatDateTime(activeAppointment.appointmentDate)}</span>
          </div>

          <label className="field full-row">
            <span>Anotacoes do atendimento</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Recepcao, triagem, orientacoes ou observacoes clinicas."
            />
          </label>

          <label className="field full-row">
            <span>Diagnostico</span>
            <textarea
              value={form.diagnosis}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  diagnosis: event.target.value,
                }))
              }
              placeholder="Diagnostico principal ou hipoteses levantadas."
            />
          </label>

          <label className="field full-row">
            <span>Prescricao e conduta</span>
            <textarea
              value={form.prescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  prescription: event.target.value,
                }))
              }
              placeholder="Medicacao, orientacoes, retorno e encaminhamentos."
            />
          </label>
        </div>

        <div className="quick-actions care-actions">
          <button
            className={`mini-button ${
              form.status === 'CONFIRMADA' ? 'is-active' : ''
            }`}
            disabled={isSubmitting || !canManageCare}
            onClick={() => void applyQuickStatus('CONFIRMADA')}
            type="button"
          >
            Confirmar chegada
          </button>
          <button
            className={`mini-button ${
              form.status === 'REALIZADA' ? 'is-active' : ''
            }`}
            disabled={isSubmitting || !canManageCare}
            onClick={() => void applyQuickStatus('REALIZADA')}
            type="button"
          >
            Fechar atendimento
          </button>
          <button
            className={`mini-button ${
              form.status === 'NAO_COMPARECEU' ? 'is-active' : ''
            }`}
            disabled={isSubmitting || !canManageCare}
            onClick={() => void applyQuickStatus('NAO_COMPARECEU')}
            type="button"
          >
            Registrar ausencia
          </button>
        </div>

        {canManageCare ? (
          <button
            className="primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Salvando atendimento...' : 'Salvar ficha'}
          </button>
        ) : (
          <p className="empty-state compact">
            Este perfil pode consultar a fila, mas nao possui permissao para
            atualizar a ficha do atendimento.
          </p>
        )}
      </form>
    </article>
  );
}

type ConsultorioRecordPanelProps = {
  appointment: Appointment;
  canManageCare: boolean;
  completedCount: number;
  isSubmitting: boolean;
  missingCount: number;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  relatedAppointments: Appointment[];
  sessionToken?: string;
  waitingCount: number;
};

type ConsultorioSection =
  | 'rosto'
  | 'historico'
  | 'exame'
  | 'prescricao'
  | 'pedidos'
  | 'documentos'
  | 'finalizacao';

type ClinicalDocumentType =
  | 'ATESTADO'
  | 'PEDIDO_EXAME'
  | 'RECEITA'
  | 'RELATORIO';

const clinicalDocumentTypeLabels: Record<ClinicalDocumentType, string> = {
  ATESTADO: 'Atestado medico',
  PEDIDO_EXAME: 'Pedido de exame',
  RECEITA: 'Receita / prescricao',
  RELATORIO: 'Relatorio medico',
};

function buildClinicalDocument(
  type: ClinicalDocumentType,
  appointment: Appointment,
  form: CareRecordFormState,
  examRequestDraft: string,
) {
  const patient = appointment.patient;
  const doctor = appointment.doctor;
  const doctorLine = `${doctor.user.name} - CRM ${doctor.crm}/${doctor.crmUf}`;
  const appointmentDate = formatDate(appointment.appointmentDate);
  const documentHeader = `Paciente: ${patient.name}
CPF: ${patient.cpf}
Data: ${appointmentDate}
Profissional: ${doctorLine}`;

  if (type === 'ATESTADO') {
    return `${documentHeader}

ATESTADO MEDICO

Atesto, para os devidos fins, que o(a) paciente acima identificado(a) esteve em atendimento nesta unidade na data informada.

Conduta / observacao:
${form.diagnosis || form.notes || 'Sem observacao complementar registrada.'}

Assinatura e carimbo do profissional`;
  }

  if (type === 'PEDIDO_EXAME') {
    return `${documentHeader}

PEDIDO DE EXAMES / PROCEDIMENTOS

Solicito os seguintes exames/procedimentos:
${examRequestDraft || 'Informe os exames solicitados antes de imprimir.'}

Indicacao clinica:
${form.diagnosis || form.notes || 'Nao informada.'}

Assinatura e carimbo do profissional`;
  }

  if (type === 'RECEITA') {
    return `${documentHeader}

RECEITA / PRESCRICAO

${form.prescription || 'Nenhuma medicacao registrada.'}

Orientacoes:
${form.notes || 'Seguir orientacao medica.'}

Assinatura e carimbo do profissional`;
  }

  return `${documentHeader}

RELATORIO MEDICO

Historico / anamnese:
${form.notes || 'Nao informado.'}

Hipotese diagnostica / diagnostico:
${form.diagnosis || 'Nao informado.'}

Prescricao / conduta:
${form.prescription || 'Nao informada.'}

Assinatura e carimbo do profissional`;
}

function createClinicalVariables(
  appointment: Appointment,
  form: CareRecordFormState,
  examRequestDraft: string,
) {
  const patient = appointment.patient;
  const doctor = appointment.doctor;

  return {
    '#ANAMNESE#': form.notes || 'Nao informado.',
    '#CIDCONS#': 'A DEFINIR',
    '#CONCLUSAOLAUDO#': form.diagnosis || 'Conclusao nao informada.',
    '#CPFPACIENTE#': patient.cpf,
    '#DATADOCUMENTO#': new Date().toLocaleDateString('pt-BR'),
    '#DATANASCIMENTOPACIENTE#': formatDate(patient.birthDate),
    '#DESCRICAOLAUDO#': form.diagnosis || 'Descricao nao informada.',
    '#DIAGNOSTICO#': form.diagnosis || 'Nao informado.',
    '#HORADOCUMENTO#': formatTime(appointment.appointmentDate),
    '#HORAINICIO#': formatTime(appointment.appointmentDate),
    '#INDICACAOCLINICA#': form.diagnosis || form.notes || 'Nao informada.',
    '#LISTAGEMEXAMESPEDIDOEXAME#':
      examRequestDraft || 'Nenhum exame informado.',
    '#NOMECONVENIO#': 'Nao informado',
    '#NOMEPLANO#': '',
    '#NOMEPACIENTE#': patient.name,
    '#NOMEPROCEDIMENTO#': humanizeEnum(appointment.type),
    '#NOMEPROFISSIONAL#': doctor.user.name,
    '#OBSERVACAOCLINICA#': form.notes || 'Sem observacao.',
    '#PRESCRICAO#': form.prescription || 'Nenhuma prescricao registrada.',
    '#CRMPROFISSIONAL#': `${doctor.crm}/${doctor.crmUf}`,
  };
}

function renderTemplateContent(
  content: string,
  variables: Record<string, string>,
) {
  return content.replace(/#[A-Z0-9_]+#/gi, (token) => {
    return variables[token.toUpperCase()] ?? token;
  });
}

function resolveDocumentType(template: DocumentTemplate): ClinicalDocumentType {
  const haystack = `${template.code} ${template.name} ${template.group}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (haystack.includes('PEDIDO') || haystack.includes('EXAME')) {
    return 'PEDIDO_EXAME';
  }

  if (haystack.includes('RECEIT') || haystack.includes('PRESCR')) {
    return 'RECEITA';
  }

  if (haystack.includes('RELATORIO')) {
    return 'RELATORIO';
  }

  return 'ATESTADO';
}

function findMatchingDocumentTemplate(
  templates: DocumentTemplate[],
  type: ClinicalDocumentType,
) {
  return (
    templates.find((template) => resolveDocumentType(template) === type) ?? null
  );
}

function ConsultorioRecordPanel({
  appointment,
  canManageCare,
  completedCount,
  isSubmitting,
  missingCount,
  onSaveCareRecord,
  relatedAppointments,
  sessionToken,
  waitingCount,
}: ConsultorioRecordPanelProps) {
  const [activeSection, setActiveSection] =
    useState<ConsultorioSection>('rosto');
  const [form, setForm] = useState<CareRecordFormState>(() =>
    createCareRecordForm(appointment),
  );
  const [examRequestDraft, setExamRequestDraft] = useState('');
  const [documentType, setDocumentType] =
    useState<ClinicalDocumentType>('ATESTADO');
  const [documentDraft, setDocumentDraft] = useState(() =>
    buildClinicalDocument(
      'ATESTADO',
      appointment,
      createCareRecordForm(appointment),
      '',
    ),
  );
  const [documentTemplates, setDocumentTemplates] = useState<
    DocumentTemplate[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateStatus, setTemplateStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const patient = appointment.patient;
  const patientInitials = patient.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const medicationLines = form.prescription
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const previousAppointments = relatedAppointments
    .filter((relatedAppointment) => relatedAppointment.id !== appointment.id)
    .slice(0, 6);
  const professionalHistory = Array.from(
    relatedAppointments
      .reduce((professionals, relatedAppointment) => {
        const doctor = relatedAppointment.doctor;
        professionals.set(doctor.id, {
          id: doctor.id,
          lastVisit: relatedAppointment.appointmentDate,
          name: doctor.user.name,
          specialty:
            doctor.specialties.length > 0
              ? doctor.specialties.join(', ')
              : 'Especialidade nao informada',
          crm: `${doctor.crm}/${doctor.crmUf}`,
        });
        return professionals;
      }, new Map<string, { id: string; lastVisit: string; name: string; specialty: string; crm: string }>())
      .values(),
  );
  const selectedDocumentLabel =
    documentTemplates.find((template) => template.id === selectedTemplateId)
      ?.name ?? clinicalDocumentTypeLabels[documentType];
  const consultorioSections: Array<{
    id: ConsultorioSection;
    label: string;
    description: string;
  }> = [
    {
      id: 'rosto',
      label: 'Folha de rosto',
      description: 'Anamnese e contexto inicial',
    },
    {
      id: 'historico',
      label: 'Historico',
      description: 'Consultas e profissionais',
    },
    {
      id: 'exame',
      label: 'Exame fisico',
      description: 'Sinais e diagnostico',
    },
    {
      id: 'prescricao',
      label: 'Prescricao',
      description: 'Medicacao e conduta',
    },
    {
      id: 'pedidos',
      label: 'Pedido de exame',
      description: 'Solicitacao e laudos',
    },
    {
      id: 'documentos',
      label: 'Documentos',
      description: 'Atestados e impressao',
    },
    {
      id: 'finalizacao',
      label: 'Finalizacao',
      description: 'Status e fechamento',
    },
  ];

  async function saveConsultation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageCare) {
      return;
    }

    await onSaveCareRecord(appointment.id, normalizeCareRecord(form));
  }

  async function saveWithStatus(nextStatus: string) {
    if (!canManageCare) {
      return;
    }

    const nextForm = {
      ...form,
      status: nextStatus,
    };

    setForm(nextForm);
    await onSaveCareRecord(appointment.id, normalizeCareRecord(nextForm));
  }

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    let isMounted = true;

    async function loadDocumentTemplates() {
      setTemplateStatus('loading');

      try {
        const queryParams = new URLSearchParams({
          active: 'true',
          limit: '50',
          page: '1',
          type: 'DOCUMENT',
        });
        const response = await apiRequest<PaginatedResponse<DocumentTemplate>>(
          `/document-templates?${queryParams.toString()}`,
          { token: sessionToken },
        );
        const nextTemplates = response.data ?? [];

        if (!isMounted) {
          return;
        }

        setDocumentTemplates(nextTemplates);
        setTemplateStatus('ready');

        const firstTemplate = nextTemplates[0];

        if (firstTemplate && !selectedTemplateId) {
          setSelectedTemplateId(firstTemplate.id);
          setDocumentType(resolveDocumentType(firstTemplate));
          setDocumentDraft(
            renderTemplateContent(
              firstTemplate.content,
              createClinicalVariables(appointment, form, examRequestDraft),
            ),
          );
        }
      } catch {
        if (isMounted) {
          setDocumentTemplates([]);
          setTemplateStatus('error');
        }
      }
    }

    void loadDocumentTemplates();

    return () => {
      isMounted = false;
    };
  }, [appointment.id, selectedTemplateId, sessionToken]);

  function refreshDocument(nextType = documentType) {
    const selectedTemplate = documentTemplates.find(
      (template) => template.id === selectedTemplateId,
    );

    if (selectedTemplate) {
      setDocumentDraft(
        renderTemplateContent(
          selectedTemplate.content,
          createClinicalVariables(appointment, form, examRequestDraft),
        ),
      );
      return;
    }

    setDocumentDraft(buildClinicalDocument(nextType, appointment, form, examRequestDraft));
  }

  function openDocument(nextType: ClinicalDocumentType) {
    const matchingTemplate = findMatchingDocumentTemplate(
      documentTemplates,
      nextType,
    );

    setDocumentType(nextType);
    setSelectedTemplateId(matchingTemplate?.id ?? '');
    setDocumentDraft(
      matchingTemplate
        ? renderTemplateContent(
            matchingTemplate.content,
            createClinicalVariables(appointment, form, examRequestDraft),
          )
        : buildClinicalDocument(nextType, appointment, form, examRequestDraft),
    );
    setActiveSection('documentos');
  }

  return (
    <form className="consultorio-modal-shell" onSubmit={saveConsultation}>
      <aside className="consultorio-patient-rail">
        <div className="consultorio-avatar">{patientInitials || 'PA'}</div>
        <div>
          <p className="eyebrow">Paciente</p>
          <h3>{patient.name}</h3>
          <span>{patient.email || 'Email nao informado'}</span>
          <span>{patient.phone || 'Telefone nao informado'}</span>
        </div>

        <div className="consultorio-rail-grid">
          <DetailItem
            label="Nascimento"
            value={`${formatDate(patient.birthDate)} - ${calculateAge(
              patient.birthDate,
            )} anos`}
          />
          <DetailItem label="CPF" value={patient.cpf} />
          <DetailItem label="Genero" value={humanizeEnum(patient.gender)} />
          <DetailItem
            label="Cidade"
            value={
              patient.city
                ? `${patient.city}${patient.state ? ` / ${patient.state}` : ''}`
                : 'Nao informada'
            }
          />
        </div>

        <div className="consultorio-warning-card">
          <strong>Alergias e alertas</strong>
          <span>
            {patient.allergies ||
              'Nenhuma alergia registrada no cadastro do paciente.'}
          </span>
        </div>

        <nav className="consultorio-section-nav" aria-label="Secoes clinicas">
          {consultorioSections.map((section) => (
            <button
              className={activeSection === section.id ? 'is-active' : undefined}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <strong>{section.label}</strong>
              <span>{section.description}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="consultorio-main-panel">
        <div className="consultorio-hero-card">
          <div>
            <p className="eyebrow">Atendimento do consultorio</p>
            <h3>{appointment.doctor.user.name}</h3>
            <span>
              CRM {appointment.doctor.crm}/{appointment.doctor.crmUf} -{' '}
              {appointment.doctor.specialties.length > 0
                ? appointment.doctor.specialties.join(', ')
                : 'Especialidade nao informada'}
            </span>
          </div>
          <div className="consultorio-clock">
            <strong>{formatTime(appointment.appointmentDate)}</strong>
            <span>{formatDate(appointment.appointmentDate)}</span>
          </div>
          <span className="inline-badge">{humanizeEnum(form.status)}</span>
        </div>

        <div className="consultorio-metric-grid">
          <article>
            <span>Aguardando</span>
            <strong>{waitingCount}</strong>
          </article>
          <article>
            <span>Realizadas</span>
            <strong>{completedCount}</strong>
          </article>
          <article>
            <span>Ausencias</span>
            <strong>{missingCount}</strong>
          </article>
          <article>
            <span>Tipo</span>
            <strong>{humanizeEnum(appointment.type)}</strong>
          </article>
        </div>

        <div className="clinical-command-strip">
          <button
            className="mini-button"
            onClick={() => setActiveSection('historico')}
            type="button"
          >
            Consultas anteriores
          </button>
          <button
            className="mini-button"
            onClick={() => setActiveSection('pedidos')}
            type="button"
          >
            Pedido de exame
          </button>
          <button
            className="mini-button"
            onClick={() => openDocument('ATESTADO')}
            type="button"
          >
            Atestado
          </button>
          <button
            className="mini-button"
            onClick={() => openDocument('RECEITA')}
            type="button"
          >
            Imprimir prescricao
          </button>
        </div>

        {activeSection === 'rosto' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Folha de rosto</p>
                <h3>Queixa principal e anamnese</h3>
              </div>
              <span className="inline-badge">historico clinico</span>
            </div>

            <label className="field">
              <span>Anamnese / observacoes da recepcao e do medico</span>
              <textarea
                className="clinical-large-textarea"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Ex: Queixa principal, HDA, sintomas associados, antecedentes, orientacoes iniciais."
                value={form.notes}
              />
            </label>

            <div className="clinical-two-column">
              <div className="clinical-list-card">
                <strong>Historico do paciente</strong>
                <span>
                  {patient.medicalHistory ||
                    'Historico clinico ainda nao preenchido.'}
                </span>
              </div>
              <div className="clinical-list-card">
                <strong>Lista de problemas</strong>
                <span>
                  {form.diagnosis ||
                    'Nenhum problema registrado neste atendimento.'}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === 'historico' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Historico do paciente</p>
                <h3>Consultas anteriores e profissionais</h3>
              </div>
              <span className="inline-badge">
                {previousAppointments.length} consulta(s)
              </span>
            </div>

            <div className="clinical-two-column">
              <div className="clinical-list-card">
                <strong>Consultas anteriores</strong>
                {previousAppointments.length === 0 ? (
                  <span>
                    Nenhuma consulta anterior encontrada nesta base do
                    consultorio.
                  </span>
                ) : (
                  <div className="clinical-history-list">
                    {previousAppointments.map((previousAppointment) => (
                      <article
                        className="clinical-history-item"
                        key={previousAppointment.id}
                      >
                        <div>
                          <strong>
                            {formatDateTime(
                              previousAppointment.appointmentDate,
                            )}
                          </strong>
                          <span>
                            {previousAppointment.doctor.user.name} -{' '}
                            {humanizeEnum(previousAppointment.status)}
                          </span>
                        </div>
                        <small>{humanizeEnum(previousAppointment.type)}</small>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="clinical-list-card">
                <strong>Profissionais que ja atenderam</strong>
                {professionalHistory.length === 0 ? (
                  <span>Nenhum profissional anterior localizado.</span>
                ) : (
                  <div className="clinical-professional-grid">
                    {professionalHistory.map((professional) => (
                      <article key={professional.id}>
                        <strong>{professional.name}</strong>
                        <span>CRM {professional.crm}</span>
                        <span>{professional.specialty}</span>
                        <small>
                          Ultimo registro: {formatDate(professional.lastVisit)}
                        </small>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="clinical-list-card">
              <strong>Historico clinico cadastral</strong>
              <span>
                {patient.medicalHistory ||
                  'Historico clinico ainda nao preenchido no cadastro.'}
              </span>
            </div>
          </section>
        ) : null}

        {activeSection === 'exame' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Exame fisico</p>
                <h3>Exame, hipotese e diagnostico</h3>
              </div>
              <span className="inline-badge">avaliacao medica</span>
            </div>

            <div className="clinical-vitals-grid">
              {['Pressao', 'FC', 'FR', 'SPO2', 'Temperatura', 'Dor'].map(
                (vital) => (
                  <article key={vital}>
                    <span>{vital}</span>
                    <strong>--</strong>
                    <small>parametro futuro</small>
                  </article>
                ),
              )}
            </div>

            <label className="field">
              <span>Exame fisico, hipotese diagnostica e diagnostico</span>
              <textarea
                className="clinical-large-textarea"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    diagnosis: event.target.value,
                  }))
                }
                placeholder="Ex: BEG, hidratado, exame segmentar, hipotese diagnostica, CID quando aplicavel."
                value={form.diagnosis}
              />
            </label>
          </section>
        ) : null}

        {activeSection === 'prescricao' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Prescricao</p>
                <h3>Medicamentos, conduta e orientacoes</h3>
              </div>
              <span className="inline-badge">dispensacao futura</span>
            </div>

            <label className="field">
              <span>Prescricao e conduta</span>
              <textarea
                className="clinical-large-textarea"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    prescription: event.target.value,
                  }))
                }
                placeholder="Digite uma medicacao ou conduta por linha. Ex: Dipirona 1g EV se dor."
                value={form.prescription}
              />
            </label>

            <div className="clinical-list-card">
              <strong>Medicamentos prescritos</strong>
              {medicationLines.length === 0 ? (
                <span>Nenhuma medicacao registrada neste atendimento.</span>
              ) : (
                <ul className="clinical-line-list">
                  {medicationLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {activeSection === 'pedidos' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Pedido de exame</p>
                <h3>Solicitacao, laudos e cobranca</h3>
              </div>
              <span className="inline-badge">rascunho medico</span>
            </div>

            <div className="clinical-order-builder">
              <label className="field">
                <span>Exames / procedimentos solicitados</span>
                <textarea
                  className="clinical-large-textarea compact"
                  onChange={(event) => setExamRequestDraft(event.target.value)}
                  placeholder="Digite um exame por linha. Ex: Hemograma completo, PCR, Raio-X torax PA e perfil."
                  value={examRequestDraft}
                />
              </label>

              <div className="clinical-list-card">
                <strong>Fluxo previsto</strong>
                <ul className="clinical-line-list">
                  <li>Pedido fica vinculado ao atendimento do consultorio.</li>
                  <li>Recepcao/financeiro confere autorizacao e cobranca.</li>
                  <li>Resultado/laudo retorna para leitura do medico.</li>
                </ul>
              </div>
            </div>

            <div className="clinical-placeholder-grid">
              <button
                className="clinical-action-card"
                onClick={() => openDocument('PEDIDO_EXAME')}
                type="button"
              >
                <strong>Gerar pedido para impressao</strong>
                <span>
                  Monta o documento com paciente, medico, indicacao clinica e
                  lista de exames.
                </span>
              </button>
              <button
                className="clinical-action-card"
                onClick={() => setActiveSection('documentos')}
                type="button"
              >
                <strong>Ver documentos do atendimento</strong>
                <span>
                  Centraliza atestados, receitas, relatorios e pedidos.
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {activeSection === 'documentos' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Documentos medicos</p>
                <h3>Gerar, revisar e imprimir</h3>
              </div>
              <span className="inline-badge">impressao local</span>
            </div>

            <div className="clinical-document-toolbar">
              <label className="field">
                <span>Modelo cadastrado</span>
                <select
                  onChange={(event) => {
                    const templateId = event.target.value;
                    const selectedTemplate = documentTemplates.find(
                      (template) => template.id === templateId,
                    );

                    setSelectedTemplateId(templateId);

                    if (!selectedTemplate) {
                      setDocumentDraft(
                        buildClinicalDocument(
                          documentType,
                          appointment,
                          form,
                          examRequestDraft,
                        ),
                      );
                      return;
                    }

                    const nextType = resolveDocumentType(selectedTemplate);

                    setDocumentType(nextType);
                    setDocumentDraft(
                      renderTemplateContent(
                        selectedTemplate.content,
                        createClinicalVariables(
                          appointment,
                          form,
                          examRequestDraft,
                        ),
                      ),
                    );
                  }}
                  value={selectedTemplateId}
                >
                  <option value="">
                    {templateStatus === 'loading'
                      ? 'Carregando modelos...'
                      : 'Selecione um modelo'}
                  </option>
                  {documentTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.group}
                    </option>
                  ))}
                </select>
                <small>
                  {templateStatus === 'error'
                    ? 'Nao foi possivel carregar modelos do banco.'
                    : `${documentTemplates.length} modelo(s) disponiveis`}
                </small>
              </label>

              <label className="field">
                <span>Tipo rapido</span>
                <select
                  onChange={(event) => openDocument(event.target.value as ClinicalDocumentType)}
                  value={documentType}
                >
                  {Object.entries(clinicalDocumentTypeLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="clinical-document-actions">
                <button
                  className="ghost-button"
                  onClick={() => refreshDocument()}
                  type="button"
                >
                  Gerar texto
                </button>
                <button
                  className="primary-button"
                  onClick={() => window.print()}
                  type="button"
                >
                  Imprimir documento
                </button>
              </div>
            </div>

            <label className="field">
              <span>Conteudo do documento</span>
              <textarea
                className="clinical-document-textarea"
                onChange={(event) => setDocumentDraft(event.target.value)}
                value={documentDraft}
              />
            </label>

            <article className="clinical-print-document">
              <div>
                <p>Hospital Revitalize</p>
                <h3>{selectedDocumentLabel}</h3>
              </div>
              <pre>{documentDraft}</pre>
            </article>
          </section>
        ) : null}

        {activeSection === 'finalizacao' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Finalizacao</p>
                <h3>Status, fechamento e historico</h3>
              </div>
              <span className="inline-badge">
                {careStatusSummary(form.status)}
              </span>
            </div>

            <div className="clinical-two-column">
              <label className="field">
                <span>Status do atendimento</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={form.status}
                >
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {humanizeEnum(status)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="clinical-list-card">
                <strong>Gravar no historico clinico</strong>
                <span>
                  Nesta etapa inicial, anamnese, diagnostico e prescricao ficam
                  salvos no atendimento. Depois ligaremos com historico clinico
                  estruturado.
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <footer className="consultorio-action-bar">
          <div className="quick-actions care-actions">
            <button
              className={`mini-button ${
                form.status === 'CONFIRMADA' ? 'is-active' : ''
              }`}
              disabled={isSubmitting || !canManageCare}
              onClick={() => void saveWithStatus('CONFIRMADA')}
              type="button"
            >
              Chamar paciente
            </button>
            <button
              className={`mini-button ${
                form.status === 'NAO_COMPARECEU' ? 'is-active' : ''
              }`}
              disabled={isSubmitting || !canManageCare}
              onClick={() => void saveWithStatus('NAO_COMPARECEU')}
              type="button"
            >
              Registrar ausencia
            </button>
          </div>

          <div className="consultorio-save-actions">
            <button
              className="ghost-button"
              disabled={isSubmitting || !canManageCare}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar evolucao'}
            </button>
            <button
              className="primary-button"
              disabled={isSubmitting || !canManageCare}
              onClick={() => void saveWithStatus('REALIZADA')}
              type="button"
            >
              Salvar e finalizar atendimento
            </button>
          </div>
        </footer>

        {!canManageCare ? (
          <p className="empty-state compact">
            Este perfil pode consultar a ficha, mas nao possui permissao para
            alterar o atendimento.
          </p>
        ) : null}
      </section>
    </form>
  );
}



