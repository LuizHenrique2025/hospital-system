import type {
  Appointment,
  Doctor,
  Nurse,
  Patient,
  PatientStatus,
  PricingTableType,
  Sector,
} from './types';

export type PatientFormState = {
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string;
  medicalHistory: string;
  status: PatientStatus;
  blockReason: string;
  documents: string;
};

export type DoctorFormState = {
  name: string;
  username: string;
  email: string;
  password: string;
  crm: string;
  crmUf: string;
  sectorId: string;
  specialties: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  documents: string;
  bio: string;
};

export type NurseFormState = {
  name: string;
  username: string;
  email: string;
  password: string;
  coren: string;
  corenUf: string;
  sectorId: string;
  shift: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  documents: string;
};

export type SectorFormState = {
  name: string;
  code: string;
  description: string;
  active: boolean;
};

export type AppointmentFormState = {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  type: string;
  status: string;
  notes: string;
};

export type AgreementPricingRuleFormState = {
  pricingTableId: string;
  multiplierPercent: string;
  requiresAuthorization: boolean;
  active: boolean;
  validFrom: string;
  validTo: string;
  notes: string;
};

export type CareRecordPayload = {
  status: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
};

export type CareRecordFormState = {
  status: string;
  notes: string;
  diagnosis: string;
  prescription: string;
};

export type CareModalVariant = 'default' | 'consultorio';

export const compactPageSize = 12;

export const genders = ['MASCULINO', 'FEMININO', 'OUTRO'] as const;

export const bloodTypes = [
  '',
  'A_POSITIVO',
  'A_NEGATIVO',
  'B_POSITIVO',
  'B_NEGATIVO',
  'AB_POSITIVO',
  'AB_NEGATIVO',
  'O_POSITIVO',
  'O_NEGATIVO',
];

export const appointmentTypes = [
  'PRIMEIRA_CONSULTA',
  'RETORNO',
  'URGENCIA',
  'EXAME',
];

export const appointmentStatuses = [
  'AGENDADA',
  'CONFIRMADA',
  'REALIZADA',
  'CANCELADA',
  'NAO_COMPARECEU',
];

export const patientStatusOptions: Array<{
  value: PatientStatus;
  label: string;
  hint: string;
}> = [
  {
    value: 'ACTIVE',
    label: 'Ativo',
    hint: 'Paciente liberado para agendamento e atendimento.',
  },
  {
    value: 'BLOCKED',
    label: 'Bloqueado',
    hint: 'Paciente exige revisao antes de novos atendimentos.',
  },
  {
    value: 'INACTIVE',
    label: 'Inativo',
    hint: 'Paciente fica visivel, mas fora do fluxo operacional.',
  },
];

export const initialAgreementPricingRuleForm: AgreementPricingRuleFormState = {
  pricingTableId: '',
  multiplierPercent: '100',
  requiresAuthorization: false,
  active: true,
  validFrom: '',
  validTo: '',
  notes: '',
};

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function parsePercentInput(value: string) {
  const cleanValue = value.trim().replace(/[^\d,.]/g, '');

  if (!cleanValue) {
    return 100;
  }

  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue;
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 100;
}

export function createAgreementPricingRulePayload(
  form: AgreementPricingRuleFormState,
) {
  return {
    pricingTableId: form.pricingTableId,
    multiplierPercent: parsePercentInput(form.multiplierPercent),
    requiresAuthorization: form.requiresAuthorization,
    active: form.active,
    validFrom: form.validFrom || undefined,
    validTo: form.validTo || undefined,
    notes: form.notes.trim() || undefined,
  };
}

export function pricingTableTypeLabel(type: PricingTableType) {
  switch (type) {
    case 'CBHPM':
      return 'CBHPM';
    case 'AGREEMENT':
      return 'Convenio';
    case 'OPERATIONAL_FEE':
      return 'Taxa operacional';
    case 'MATERIAL_MEDICATION':
      return 'Material/medicamento';
    default:
      return 'Propria';
  }
}

export function formatBasisPointsPercent(value: number) {
  return `${(value / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function isPatientActive(patient: Patient) {
  return (patient.status ?? 'ACTIVE') === 'ACTIVE';
}

export function patientStatusLabel(status?: PatientStatus) {
  switch (status ?? 'ACTIVE') {
    case 'BLOCKED':
      return 'Bloqueado';
    case 'INACTIVE':
      return 'Inativo';
    default:
      return 'Ativo';
  }
}

export function patientStatusTone(status?: PatientStatus) {
  switch (status ?? 'ACTIVE') {
    case 'BLOCKED':
      return 'status-blocked';
    case 'INACTIVE':
      return 'status-inactive';
    default:
      return 'status-active';
  }
}

export function matchPatientRecord(patient: Patient, query: string) {
  if (!query) {
    return true;
  }

  const queryDigits = normalizeDigits(query);
  const haystack = [
    patient.name,
    patient.cpf,
    patient.rg,
    patient.phone,
    patient.email,
    patient.address,
    patient.city,
    patient.state,
    patient.zipCode,
    patient.emergencyContact,
    patient.emergencyPhone,
    patientStatusLabel(patient.status),
    patient.blockReason,
    patient.documents?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    haystack.includes(query) ||
    (queryDigits.length > 0 && normalizeDigits(haystack).includes(queryDigits))
  );
}

export function matchDoctor(doctor: Doctor, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    doctor.user.name,
    doctor.user.username,
    doctor.user.email,
    doctor.crm,
    doctor.crmUf,
    doctor.phone,
    doctor.sector?.name,
    doctor.sector?.code,
    doctor.specialties.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function matchNurse(nurse: Nurse, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    nurse.user.name,
    nurse.user.username,
    nurse.user.email,
    nurse.coren,
    nurse.corenUf,
    nurse.phone,
    nurse.shift,
    nurse.sector?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function matchSector(sector: Sector, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    sector.name,
    sector.code,
    sector.description,
    ...(sector.doctors?.map((doctor) => doctor.user.name) ?? []),
    ...(sector.nurses?.map((nurse) => nurse.user.name) ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function matchAppointment(appointment: Appointment, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    appointment.patient.name,
    appointment.doctor.user.name,
    appointment.status,
    appointment.type,
    appointment.notes,
    appointment.diagnosis,
    appointment.prescription,
    appointment.doctor.sector?.name,
    appointment.doctor.sector?.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function sortByAppointmentDate(left: Appointment, right: Appointment) {
  return (
    new Date(left.appointmentDate).getTime() -
    new Date(right.appointmentDate).getTime()
  );
}

export function professionalInSector(
  professional: {
    sectorId?: string | null;
    sector?: { id: string; code: string } | null;
  },
  sectorCode: string,
  sectorId?: string,
) {
  return (
    professional.sector?.code === sectorCode ||
    Boolean(sectorId && professional.sectorId === sectorId)
  );
}

export function getAppointmentSector(
  appointment: Appointment,
  doctors: Doctor[],
) {
  return (
    appointment.doctor.sector ??
    doctors.find((doctor) => doctor.id === appointment.doctor.id)?.sector ??
    null
  );
}

export function isEmergencyAppointment(
  appointment: Appointment,
  doctors: Doctor[],
) {
  return (
    appointment.type === 'URGENCIA' ||
    getAppointmentSector(appointment, doctors)?.code === 'PA'
  );
}

export function isSameLocalDate(value: string) {
  const target = new Date(value);
  const today = new Date();

  return (
    target.getFullYear() === today.getFullYear() &&
    target.getMonth() === today.getMonth() &&
    target.getDate() === today.getDate()
  );
}

export function createCareRecordForm(
  appointment: Appointment,
): CareRecordFormState {
  return {
    status: appointment.status,
    notes: appointment.notes ?? '',
    diagnosis: appointment.diagnosis ?? '',
    prescription: appointment.prescription ?? '',
  };
}

export function normalizeCareRecord(
  form: CareRecordFormState,
): CareRecordPayload {
  return {
    status: form.status,
    notes: form.notes.trim() || undefined,
    diagnosis: form.diagnosis.trim() || undefined,
    prescription: form.prescription.trim() || undefined,
  };
}

export function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function calculateAge(value: string) {
  const birthDate = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function careStatusSummary(status: string) {
  switch (status) {
    case 'CONFIRMADA':
      return 'Paciente pronto para ser chamado';
    case 'REALIZADA':
      return 'Consulta encerrada e registrada';
    case 'NAO_COMPARECEU':
      return 'Ausencia registrada na agenda';
    case 'CANCELADA':
      return 'Consulta retirada da trilha operacional';
    default:
      return 'Paciente ainda aguardando confirmacao ou chamada';
  }
}

export function statusTone(status: string) {
  switch (status) {
    case 'CONFIRMADA':
    case 'REALIZADA':
      return 'tone-positive';
    case 'CANCELADA':
      return 'tone-danger';
    case 'NAO_COMPARECEU':
      return 'tone-muted';
    default:
      return 'tone-info';
  }
}
