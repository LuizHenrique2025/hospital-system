export type Role =
  | 'ADMIN'
  | 'MEDICO'
  | 'ENFERMEIRO'
  | 'ATENDENTE'
  | 'FARMACIA'
  | 'ESTOQUE'
  | 'FATURAMENTO';

export type UserProfile = {
  id: string;
  name: string;
  username: string;
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

export type CommunicationType = 'UPDATE' | 'NOTICE' | 'HOLIDAY';

export type CommunicationEntry = {
  id: string;
  type: CommunicationType;
  tag?: string | null;
  title: string;
  description: string;
  dateLabel?: string | null;
  publishAt?: string;
};

export type InternalMessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type InternalEmail = {
  id: string;
  from: string;
  to?: string;
  senderId?: string;
  recipientId?: string;
  subject: string;
  preview: string;
  body?: string | null;
  priority?: InternalMessagePriority;
  timeLabel?: string | null;
  unread: boolean;
  sentAt?: string;
  readAt?: string | null;
};

export type InternalRecipient = {
  id: string;
  name: string;
  username: string;
  role: Role;
};

export type MailboxFolder = 'inbox' | 'sent' | 'archived' | 'trash';

export type CommunicationDashboard = {
  updates: CommunicationEntry[];
  notices: CommunicationEntry[];
  commemorativeDates: CommunicationEntry[];
  emails: InternalEmail[];
};

export type Agreement = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AgreementPricingRule = {
  id: string;
  providerId: string;
  pricingTableId: string;
  multiplierBasisPoints: number;
  requiresAuthorization: boolean;
  active: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string | null;
  pricingTable: PricingTable;
};

export type PatientStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE';

export type ProcedureType =
  | 'PROCEDURE'
  | 'LAB_EXAM'
  | 'IMAGE_EXAM'
  | 'CONSULTATION'
  | 'SURGERY'
  | 'ROOM_FEE'
  | 'PACKAGE';
export type PricingTableType =
  | 'CBHPM'
  | 'AGREEMENT'
  | 'OWN'
  | 'OPERATIONAL_FEE'
  | 'MATERIAL_MEDICATION';

export type Procedure = {
  id: string;
  code: string;
  description: string;
  type: ProcedureType;
  tableCode?: string | null;
  groupName?: string | null;
  unit?: string | null;
  referencePriceCents?: number | null;
  requiresAuthorization: boolean;
  requiresReport: boolean;
  billable: boolean;
  active: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PricingTable = {
  id: string;
  name: string;
  type: PricingTableType;
  year?: number | null;
  code?: string | null;
  description?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    prices: number;
  };
};

export type ProcedurePrice = {
  id: string;
  procedureId: string;
  pricingTableId: string;
  priceCents: number;
  operationalCostCents?: number | null;
  billingUnit?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  active: boolean;
  notes?: string | null;
  procedure: Procedure;
  pricingTable: PricingTable;
};

export type CbhpmProcedure = {
  id: string;
  codigo: string;
  procedimento: string;
  porte?: string | null;
  fracaoPorte?: string | null;
  valorPorteCents?: number | null;
  totalPorteCents?: number | null;
  incidencias?: string | null;
  filme?: string | null;
  totalFilmeCents?: number | null;
  uco?: string | null;
  totalUcoCents?: number | null;
  porteAnestesico?: string | null;
  valorPorteAnestesicoCents?: number | null;
  totalPorteAnestesicoCents?: number | null;
  numeroAuxiliares?: number | null;
  totalAuxiliaresCents?: number | null;
  totalPrimeiroAuxiliarCents?: number | null;
  totalSegundoAuxiliarCents?: number | null;
  totalTerceiroAuxiliarCents?: number | null;
  totalQuartoAuxiliarCents?: number | null;
  adicionaisCents?: number | null;
  subtotalCents?: number | null;
  valorPorte?: string | null;
  totalPorte?: string | null;
  totalFilme?: string | null;
  totalUco?: string | null;
  valorPorteAnestesico?: string | null;
  totalPorteAnestesico?: string | null;
  totalAuxiliares?: string | null;
  totalPrimeiroAuxiliar?: string | null;
  totalSegundoAuxiliar?: string | null;
  totalTerceiroAuxiliar?: string | null;
  totalQuartoAuxiliar?: string | null;
  adicionais?: string | null;
  subtotal?: string | null;
  editionYear: number;
  sourceFile?: string | null;
  importedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  availableEditions?: number[];
};

export type CbhpmImportSummary = {
  editionYear: number;
  sourceFile?: string | null;
  total: number;
  importedAt?: string | null;
};

export type CbhpmPorteSummary = {
  editionYear: number;
  porte?: string | null;
  valorPorteCents?: number | null;
  valorPorte?: string | null;
  procedureCount: number;
  fracaoMin?: string | null;
  fracaoMax?: string | null;
  totalPorteMinCents?: number | null;
  totalPorteMaxCents?: number | null;
  totalPorteMin?: string | null;
  totalPorteMax?: string | null;
};

export type ExamOrderStatus =
  | 'REQUESTED'
  | 'AUTHORIZATION_PENDING'
  | 'AUTHORIZED'
  | 'IN_PROGRESS'
  | 'RESULT_READY'
  | 'CANCELED';

export type ExamOrderItem = {
  id: string;
  quantity: number;
  status: ExamOrderStatus;
  notes?: string | null;
  procedure: Procedure;
};

export type ExamOrder = {
  id: string;
  status: ExamOrderStatus;
  priority?: string | null;
  clinicalIndication?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient: Patient;
  requesterDoctor?: Doctor | null;
  appointment?: {
    id: string;
    appointmentDate: string;
    status: string;
    type: string;
  } | null;
  items: ExamOrderItem[];
};

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  rg?: string | null;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  bloodType?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  status?: PatientStatus;
  blockReason?: string | null;
  documents?: string[];
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
    username?: string;
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
    username?: string;
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
      username?: string;
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
      username?: string;
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
