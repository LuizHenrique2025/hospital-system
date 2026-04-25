export type Role = 'ADMIN' | 'MEDICO' | 'ENFERMEIRO' | 'ATENDENTE';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  bloodType?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
};

export type Doctor = {
  id: string;
  userId: string;
  crm: string;
  crmUf: string;
  sectorId?: string | null;
  specialties: string[];
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  documents?: string[];
  bio?: string | null;
  sector?: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role?: Role;
  };
};

export type Nurse = {
  id: string;
  userId: string;
  coren: string;
  corenUf: string;
  sectorId?: string | null;
  shift?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  documents?: string[];
  sector?: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role?: Role;
  };
};

export type Sector = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  doctors?: Array<{
    id: string;
    crm: string;
    crmUf: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  nurses?: Array<{
    id: string;
    coren: string;
    corenUf: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

export type Appointment = {
  id: string;
  appointmentDate: string;
  status: string;
  type: string;
  notes?: string | null;
  diagnosis?: string | null;
  prescription?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patient: Patient;
  doctor: Doctor;
};
