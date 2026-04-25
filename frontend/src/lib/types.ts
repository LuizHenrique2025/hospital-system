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
  specialties: string[];
  phone?: string | null;
  bio?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
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
