import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type React from 'react';

import { DetailItem } from '../components/ui/DetailItem';
import { DirectoryState } from '../components/ui/DirectoryState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
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
import type { Appointment, Patient } from '../lib/types';
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
  waitingCount: number;
};

type ConsultorioSection =
  | 'rosto'
  | 'exame'
  | 'prescricao'
  | 'exames'
  | 'finalizacao';

function ConsultorioRecordPanel({
  appointment,
  canManageCare,
  completedCount,
  isSubmitting,
  missingCount,
  onSaveCareRecord,
  waitingCount,
}: ConsultorioRecordPanelProps) {
  const [activeSection, setActiveSection] =
    useState<ConsultorioSection>('rosto');
  const [form, setForm] = useState<CareRecordFormState>(() =>
    createCareRecordForm(appointment),
  );
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
      id: 'exames',
      label: 'Exames',
      description: 'Pedidos e laudos',
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

        {activeSection === 'exames' ? (
          <section className="clinical-section">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">Exames e procedimentos</p>
                <h3>Pedidos vinculados ao atendimento</h3>
              </div>
              <span className="inline-badge">proximo modulo</span>
            </div>

            <div className="clinical-placeholder-grid">
              <DirectoryState
                code="EX"
                title="Solicitacao estruturada em preparacao."
                description="A tela ja reserva o espaco para pedir exames, procedimentos, imagem e laudos dentro do consultorio."
              />
              <DirectoryState
                code="LA"
                title="Laudos e resultados ficarao vinculados aqui."
                description="Quando o modulo de pedidos estiver conectado, o medico acompanha resultado e impressao por este painel."
              />
            </div>
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



