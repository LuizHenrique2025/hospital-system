import { useDeferredValue, useMemo, useState } from 'react';
import type React from 'react';

import { DirectoryState } from '../components/ui/DirectoryState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import {
  appointmentStatuses,
  appointmentTypes,
  formatDateTime,
  isPatientActive,
  matchAppointment,
  matchDoctor,
  matchPatientRecord,
  statusTone,
  type AppointmentFormState,
} from '../lib/appSupport';
import type { Appointment, Doctor, Patient } from '../lib/types';
type SchedulingPageProps = {
  appointmentForm: AppointmentFormState;
  appointments: Appointment[];
  canCreateAppointment: boolean;
  doctors: Doctor[];
  isSubmitting: boolean;
  onOpenTeam: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  patients: Patient[];
  setAppointmentForm: React.Dispatch<
    React.SetStateAction<AppointmentFormState>
  >;
};

export function SchedulingPage({
  appointmentForm,
  appointments,
  canCreateAppointment,
  doctors,
  isSubmitting,
  onOpenTeam,
  onSubmit,
  patients,
  setAppointmentForm,
}: SchedulingPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedAppointments, setHasSearchedAppointments] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [patientPickerSearch, setPatientPickerSearch] = useState('');
  const [doctorPickerSearch, setDoctorPickerSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const deferredPatientPickerSearch = useDeferredValue(
    patientPickerSearch.trim().toLowerCase(),
  );
  const deferredDoctorPickerSearch = useDeferredValue(
    doctorPickerSearch.trim().toLowerCase(),
  );
  const canSearchAppointments = search.trim().length >= 2;
  const filteredAppointments = useMemo(
    () =>
      hasSearchedAppointments
        ? appointments.filter((appointment) =>
            matchAppointment(appointment, deferredSearch),
          )
        : [],
    [appointments, deferredSearch, hasSearchedAppointments],
  );
  const activePatients = useMemo(
    () => patients.filter(isPatientActive),
    [patients],
  );
  const visiblePatientOptions = useMemo(
    () =>
      activePatients.filter(
        (patient) =>
          patient.id === appointmentForm.patientId ||
          (patientPickerSearch.trim().length >= 2 &&
            matchPatientRecord(patient, deferredPatientPickerSearch)),
      ),
    [
      activePatients,
      appointmentForm.patientId,
      deferredPatientPickerSearch,
      patientPickerSearch,
    ],
  );
  const visibleDoctorOptions = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          doctor.id === appointmentForm.doctorId ||
          (doctorPickerSearch.trim().length >= 2 &&
            matchDoctor(doctor, deferredDoctorPickerSearch)),
      ),
    [
      appointmentForm.doctorId,
      deferredDoctorPickerSearch,
      doctorPickerSearch,
      doctors,
    ],
  );
  const selectedPatient =
    patients.find((patient) => patient.id === appointmentForm.patientId) ??
    null;
  const selectedDoctor =
    doctors.find((doctor) => doctor.id === appointmentForm.doctorId) ?? null;

  function searchAppointments(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchAppointments) {
      setHasSearchedAppointments(true);
    }
  }

  function clearAppointmentSearch() {
    setSearch('');
    setHasSearchedAppointments(false);
  }

  return (
    <section className="page-grid module-grid modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Agendamento</p>
            <h2>Buscar agenda</h2>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={() => setIsScheduleModalOpen(true)}
              type="button"
            >
              Novo agendamento
            </button>
            <span className="inline-badge">
              {appointments.length} registros
            </span>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearchAppointments}
          description="Consulte agenda por paciente, medico, status ou tipo antes de abrir a lista de atendimentos."
          onChange={setSearch}
          onClear={clearAppointmentSearch}
          onSearch={searchAppointments}
          placeholder="Buscar por paciente, medico, status ou tipo"
          resultText={
            hasSearchedAppointments
              ? `${filteredAppointments.length} agendamentos encontrados`
              : undefined
          }
          title="Localize o atendimento antes de operar."
          value={search}
        />

        <div className="table-shell">
          <div className="table-head appointments-grid">
            <span>Paciente</span>
            <span>Medico</span>
            <span>Horario</span>
            <span>Status</span>
            <span>Tipo</span>
          </div>

          {!hasSearchedAppointments ? (
            <DirectoryState
              code="01"
              title="Nenhum agendamento carregado automaticamente."
              description="Use a busca para localizar um atendimento especifico ou monte uma nova consulta no formulario ao lado."
            />
          ) : filteredAppointments.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhuma consulta encontrada."
              description="Revise paciente, medico, status ou tipo pesquisado."
            />
          ) : (
            filteredAppointments.map((appointment) => (
              <div className="table-row appointments-grid" key={appointment.id}>
                <span>{appointment.patient.name}</span>
                <span>{appointment.doctor.user.name}</span>
                <span>{formatDateTime(appointment.appointmentDate)}</span>
                <span>
                  <StatusBadge
                    label={appointment.status}
                    tone={statusTone(appointment.status)}
                  />
                </span>
                <span>{appointment.type}</span>
              </div>
            ))
          )}
        </div>
      </article>

      <OperationalModal
        eyebrow="Novo agendamento"
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Montagem da consulta"
        toneLabel="Agenda"
      >
        <form className="modal-form-panel" onSubmit={onSubmit}>
          <div className="page-header">
            <div>
              <p className="eyebrow">Novo agendamento</p>
              <h2>Montagem da consulta</h2>
            </div>
            <button className="ghost-button" onClick={onOpenTeam} type="button">
              Abrir equipe
            </button>
          </div>

          <div className="context-band">
            <div className="context-card">
              <span>Paciente pronto</span>
              <strong>
                {selectedPatient?.name || 'Selecione em pacientes'}
              </strong>
            </div>
            <div className="context-card">
              <span>Medico pronto</span>
              <strong>
                {selectedDoctor?.user.name || 'Selecione em equipe'}
              </strong>
            </div>
          </div>

          <div className="field-grid two-columns">
            <label className="field">
              <span>Buscar paciente</span>
              <input
                placeholder="Nome, CPF ou telefone"
                value={patientPickerSearch}
                onChange={(event) => setPatientPickerSearch(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Paciente</span>
              <select
                value={appointmentForm.patientId}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    patientId: event.target.value,
                  }))
                }
                required
              >
                <option value="">
                  {patientPickerSearch.trim().length >= 2
                    ? 'Selecione'
                    : 'Pesquise o paciente primeiro'}
                </option>
                {visiblePatientOptions.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.cpf}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Buscar medico</span>
              <input
                placeholder="Nome, CRM ou especialidade"
                value={doctorPickerSearch}
                onChange={(event) => setDoctorPickerSearch(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Medico</span>
              <select
                value={appointmentForm.doctorId}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    doctorId: event.target.value,
                  }))
                }
                required
              >
                <option value="">
                  {doctorPickerSearch.trim().length >= 2
                    ? 'Selecione'
                    : 'Pesquise o medico primeiro'}
                </option>
                {visibleDoctorOptions.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user.name} - CRM {doctor.crm}/{doctor.crmUf}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Data e hora</span>
              <input
                type="datetime-local"
                value={appointmentForm.appointmentDate}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    appointmentDate: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={appointmentForm.type}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                {appointmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={appointmentForm.status}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                {appointmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full-row">
              <span>Observacoes</span>
              <textarea
                value={appointmentForm.notes}
                onChange={(event) =>
                  setAppointmentForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <button
            className="primary-button"
            disabled={isSubmitting || !canCreateAppointment}
            type="submit"
          >
            {isSubmitting ? 'Salvando...' : 'Registrar consulta'}
          </button>

          {!canCreateAppointment ? (
            <p className="empty-state compact">
              Cadastre ao menos um paciente ativo e um medico antes de seguir.
            </p>
          ) : null}
        </form>
      </OperationalModal>
    </section>
  );
}

