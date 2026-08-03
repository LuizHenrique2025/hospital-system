import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { z } from 'zod';
import './App.css';
import { RouteFallback } from './components/layout/RouteFallback';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { DetailItem } from './components/ui/DetailItem';
import { DirectoryState } from './components/ui/DirectoryState';
import { OperationalModal } from './components/ui/OperationalModal';
import { OperationalSearchCard } from './components/ui/OperationalSearchCard';
import { RecordLine } from './components/ui/RecordLine';
import { ResultPagination } from './components/ui/ResultPagination';
import {
  activeModules,
  environmentStorageKey,
  getNavigationEnvironment,
  isEnvironmentId,
  navigationEnvironments,
  type EnvironmentId,
  type NavigationEnvironment,
} from './config/navigation';
import { useAuth } from './contexts/AuthContext';
import { useDashboard } from './contexts/DashboardContext';
import { API_URL, apiRequest } from './lib/api';
import { normalizeLogin } from './lib/normalizers';
import {
  getRolePermissionOptions,
  roleLabel,
  roleOptions,
  userParameterOptions,
  type PermissionPreviewOption,
} from './lib/roles';
import type {
  Appointment,
  AuditAction,
  AuditLog,
  AuditSummary,
  CbhpmImportSummary,
  CbhpmPorteSummary,
  CbhpmProcedure,
  CommunicationDashboard,
  Doctor,
  ExamOrder,
  ExamOrderStatus,
  InternalEmail,
  InternalMessagePriority,
  InternalRecipient,
  MailboxFolder,
  Nurse,
  PaginatedResponse,
  Patient,
  PatientStatus,
  PricingTable,
  PricingTableType,
  Procedure,
  ProcedurePrice,
  ProcedureType,
  Role,
  Sector,
  UserProfile,
} from './lib/types';
const AgreementsPage = lazy(() =>
  import('./pages/AgreementsPage').then((module) => ({
    default: module.AgreementsPage,
  })),
);
const BillingWorkspacePage = lazy(() =>
  import('./pages/BillingWorkspacePage').then((module) => ({
    default: module.BillingWorkspacePage,
  })),
);
const BudgetCalculatorPage = lazy(() =>
  import('./pages/BudgetCalculatorPage').then((module) => ({
    default: module.BudgetCalculatorPage,
  })),
);
const CarePage = lazy(() =>
  import('./pages/CarePage').then((module) => ({
    default: module.CarePage,
  })),
);
const DocumentTemplatesPage = lazy(() =>
  import('./pages/DocumentTemplatesPage').then((module) => ({
    default: module.DocumentTemplatesPage,
  })),
);
const LoginScreen = lazy(() =>
  import('./pages/LoginPage').then((module) => ({
    default: module.LoginScreen,
  })),
);
const ModulePlaceholderPage = lazy(() =>
  import('./pages/ModulePlaceholderPage').then((module) => ({
    default: module.ModulePlaceholderPage,
  })),
);
const PatientsPage = lazy(() =>
  import('./pages/PatientsPage').then((module) => ({
    default: module.PatientsPage,
  })),
);
const SchedulingPage = lazy(() =>
  import('./pages/SchedulingPage').then((module) => ({
    default: module.SchedulingPage,
  })),
);
const TeamPage = lazy(() =>
  import('./pages/TeamPage').then((module) => ({
    default: module.TeamPage,
  })),
);

type Notice = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

type PatientFormState = {
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

const patientFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome completo do paciente.'),
    cpf: z
      .string()
      .transform((value) => normalizeDigits(value))
      .refine((value) => value.length === 11, 'Informe um CPF com 11 digitos.'),
    rg: z.string().optional(),
    birthDate: z
      .string()
      .min(1, 'Informe a data de nascimento.')
      .refine((value) => {
        const date = new Date(value);

        return !Number.isNaN(date.getTime()) && date <= new Date();
      }, 'Informe uma data de nascimento valida.'),
    gender: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
    bloodType: z.string().optional(),
    phone: z
      .string()
      .trim()
      .min(8, 'Informe um telefone de contato valido.'),
    email: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || z.email().safeParse(value).success,
        'Informe um email valido.',
      ),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    allergies: z.string().optional(),
    medicalHistory: z.string().optional(),
    status: z.enum(['ACTIVE', 'BLOCKED', 'INACTIVE']),
    blockReason: z.string().optional(),
    documents: z.string().optional(),
  })
  .refine(
    (form) => form.status !== 'BLOCKED' || Boolean(form.blockReason?.trim()),
    {
      message: 'Informe o motivo quando o paciente estiver bloqueado.',
      path: ['blockReason'],
    },
  );

type DoctorFormState = {
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

type NurseFormState = {
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

type SectorFormState = {
  name: string;
  code: string;
  description: string;
  active: boolean;
};

type UserFormState = {
  name: string;
  username: string;
  email: string;
  role: Role;
  password: string;
};

type AppointmentFormState = {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  type: string;
  status: string;
  notes: string;
};

type EmergencyEntryPayload = {
  agreement: string;
  classification: string;
  doctorId: string;
  initialProcedure: string;
  internalNotes: string;
  medicationMaterial: string;
  notes: string;
  paymentMethod: string;
  patientId: string;
  plan: string;
  requester: string;
  socialName: string;
  tax: string;
};

type ProcedureFormState = {
  code: string;
  description: string;
  type: ProcedureType;
  tableCode: string;
  groupName: string;
  unit: string;
  referencePrice: string;
  requiresAuthorization: boolean;
  requiresReport: boolean;
  billable: boolean;
  active: boolean;
  notes: string;
};

type PricingTableFormState = {
  name: string;
  type: PricingTableType;
  year: string;
  code: string;
  description: string;
  active: boolean;
};

type ProcedurePriceFormState = {
  procedureId: string;
  pricingTableId: string;
  price: string;
  operationalCost: string;
  billingUnit: string;
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
  notes: string;
};

type ExamOrderFormItem = {
  procedureId: string;
  quantity: number;
  notes: string;
};

type ExamOrderFormState = {
  patientId: string;
  requesterDoctorId: string;
  priority: string;
  clinicalIndication: string;
  notes: string;
  items: ExamOrderFormItem[];
};

type CareRecordPayload = {
  status?: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
};

const compactPageSize = 12;
const regularPageSize = 20;
const auditPageSize = 12;

const auditActionOptions: Array<{ label: string; value: AuditAction | '' }> = [
  { label: 'Todas as acoes', value: '' },
  { label: 'Leitura', value: 'READ' },
  { label: 'Criacao', value: 'CREATE' },
  { label: 'Alteracao', value: 'UPDATE' },
  { label: 'Exclusao', value: 'DELETE' },
];

const auditPeriodOptions = [
  { label: 'Ultimas 24h', value: '1' },
  { label: 'Ultimos 7 dias', value: '7' },
  { label: 'Ultimos 30 dias', value: '30' },
  { label: 'Todo o historico', value: 'all' },
];

const auditResourceOptions = [
  { label: 'Todos os modulos', value: '' },
  { label: 'Pacientes', value: 'patients' },
  { label: 'Atendimentos', value: 'appointments' },
  { label: 'Pedidos de exames', value: 'exam-orders' },
  { label: 'Usuarios', value: 'users' },
  { label: 'Auditoria', value: 'audit' },
  { label: 'CBHPM', value: 'cbhpm' },
  { label: 'Convenios', value: 'agreements' },
  { label: 'Procedimentos', value: 'procedures' },
  { label: 'Faturamento', value: 'pricing' },
  { label: 'Comunicacao', value: 'communications' },
];

const procedureTypes: ProcedureType[] = [
  'PROCEDURE',
  'LAB_EXAM',
  'IMAGE_EXAM',
  'CONSULTATION',
  'SURGERY',
  'ROOM_FEE',
  'PACKAGE',
];
const pricingTableTypes: PricingTableType[] = [
  'CBHPM',
  'AGREEMENT',
  'OWN',
  'OPERATIONAL_FEE',
  'MATERIAL_MEDICATION',
];
const initialPatientForm: PatientFormState = {
  name: '',
  cpf: '',
  rg: '',
  birthDate: '',
  gender: 'MASCULINO',
  bloodType: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  emergencyContact: '',
  emergencyPhone: '',
  allergies: '',
  medicalHistory: '',
  status: 'ACTIVE',
  blockReason: '',
  documents: '',
};

const initialDoctorForm: DoctorFormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  crm: '',
  crmUf: 'SP',
  sectorId: '',
  specialties: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  documents: '',
  bio: '',
};

const initialNurseForm: NurseFormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  coren: '',
  corenUf: 'SC',
  sectorId: '',
  shift: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  documents: '',
};

const initialSectorForm: SectorFormState = {
  name: '',
  code: '',
  description: '',
  active: true,
};

const initialUserForm: UserFormState = {
  name: '',
  username: '',
  email: '',
  role: 'ATENDENTE',
  password: '',
};

const initialAppointmentForm: AppointmentFormState = {
  patientId: '',
  doctorId: '',
  appointmentDate: '',
  type: 'PRIMEIRA_CONSULTA',
  status: 'AGENDADA',
  notes: '',
};

const initialProcedureForm: ProcedureFormState = {
  code: '',
  description: '',
  type: 'PROCEDURE',
  tableCode: '',
  groupName: '',
  unit: '',
  referencePrice: '',
  requiresAuthorization: false,
  requiresReport: false,
  billable: true,
  active: true,
  notes: '',
};

const initialPricingTableForm: PricingTableFormState = {
  name: '',
  type: 'CBHPM',
  year: '',
  code: '',
  description: '',
  active: true,
};

const initialProcedurePriceForm: ProcedurePriceFormState = {
  procedureId: '',
  pricingTableId: '',
  price: '',
  operationalCost: '',
  billingUnit: 'Unidade',
  effectiveFrom: '',
  effectiveTo: '',
  active: true,
  notes: '',
};

const initialExamOrderForm: ExamOrderFormState = {
  patientId: '',
  requesterDoctorId: '',
  priority: 'Rotina',
  clinicalIndication: '',
  notes: '',
  items: [],
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession, restoredSessionToken, session } = useAuth();
  const {
    appointments,
    auditSummary,
    communicationDashboard,
    doctors,
    loadDashboard,
    nurses,
    patients,
    patientTotal,
    resetDashboard,
    sectors,
    users,
  } = useDashboard();
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<EnvironmentId>(() => {
      const storedEnvironment = localStorage.getItem(environmentStorageKey);

      return isEnvironmentId(storedEnvironment)
        ? storedEnvironment
        : 'hospitalar';
    });
  const [isEnvironmentPickerOpen, setIsEnvironmentPickerOpen] = useState(false);
  const [transitionEnvironment, setTransitionEnvironment] =
    useState<NavigationEnvironment | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [nurseForm, setNurseForm] = useState(initialNurseForm);
  const [sectorForm, setSectorForm] = useState(initialSectorForm);
  const [appointmentForm, setAppointmentForm] = useState(
    initialAppointmentForm,
  );

  const handleDashboardSyncError = useCallback((error: unknown) => {
    const fallbackMessage = 'Sessao expirada. Entre novamente.';
    const message = error instanceof Error ? error.message : fallbackMessage;

    setNotice({
      kind: 'info',
      text: message === 'Unauthorized' ? fallbackMessage : message,
    });
  }, []);

  useEffect(() => {
    if (!session?.token || !restoredSessionToken) {
      return;
    }

    if (session.token !== restoredSessionToken) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void loadDashboard(session.token, session.refreshToken).catch(
        handleDashboardSyncError,
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [
    handleDashboardSyncError,
    loadDashboard,
    restoredSessionToken,
    session?.refreshToken,
    session?.token,
  ]);

  useEffect(() => {
    if (!session?.token) {
      return undefined;
    }

    const queueEvents = new EventSource(`${API_URL}/realtime/queue`);

    queueEvents.onmessage = () => {
      void loadDashboard(session.token, session.refreshToken).catch(
        handleDashboardSyncError,
      );
    };

    queueEvents.onerror = () => {
      queueEvents.close();
    };

    return () => queueEvents.close();
  }, [
    handleDashboardSyncError,
    loadDashboard,
    session?.refreshToken,
    session?.token,
  ]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const auth = await apiRequest<{
        access_token: string;
        refresh_token: string;
      }>('/auth/login', {
        body: loginForm,
      });

      await loadDashboard(auth.access_token, auth.refresh_token);
      navigate(location.pathname === '/' ? '/central' : location.pathname, {
        replace: true,
      });
      setNotice({
        kind: 'success',
        text: 'Sessao iniciada. Ambiente pronto para operacao.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel entrar no sistema.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createUserAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token || session.profile.role !== 'ADMIN') {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<UserProfile>('/users', {
        token: session.token,
        body: {
          name: userForm.name,
          username: normalizeLogin(userForm.username),
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
        },
      });

      setUserForm(initialUserForm);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Usuario cadastrado com login unico.',
      });
      navigate('/usuarios');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel cadastrar o usuario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    const refreshToken = session?.refreshToken;

    if (refreshToken) {
      try {
        await apiRequest<{ message: string }>('/auth/logout', {
          body: { refreshToken },
        });
      } catch {
        // Mesmo se a revogacao remota falhar, a sessao local precisa encerrar.
      }
    }

    clearSession();
    resetDashboard();
    setPatientForm(initialPatientForm);
    setEditingPatientId(null);
    setUserForm(initialUserForm);
    setDoctorForm(initialDoctorForm);
    setNurseForm(initialNurseForm);
    setSectorForm(initialSectorForm);
    setAppointmentForm(initialAppointmentForm);
    setNotice({
      kind: 'info',
      text: 'Sessao encerrada. Volte quando quiser.',
    });
    navigate('/', { replace: true });
  }

  async function savePatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const isEditingPatient = Boolean(editingPatientId);

      await apiRequest<Patient>(
        isEditingPatient ? `/patients/${editingPatientId}` : '/patients',
        {
          token: session.token,
          method: isEditingPatient ? 'PATCH' : undefined,
          body: createPatientPayload(patientForm),
        },
      );

      setPatientForm(initialPatientForm);
      setEditingPatientId(null);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: isEditingPatient
          ? 'Ficha do paciente atualizada com sucesso.'
          : 'Paciente cadastrado com sucesso.',
      });
      navigate('/pacientes');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel salvar o paciente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function editPatient(patient: Patient) {
    setPatientForm(createPatientForm(patient));
    setEditingPatientId(patient.id);
    setNotice({
      kind: 'info',
      text: 'Ficha carregada para edicao.',
    });
    navigate('/pacientes');
  }

  function resetPatientEditor() {
    setPatientForm(initialPatientForm);
    setEditingPatientId(null);
  }

  async function createDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await apiRequest<UserProfile>('/users', {
        token: session.token,
        body: {
          name: doctorForm.name,
          username: normalizeLogin(doctorForm.username),
          email: doctorForm.email,
          password: doctorForm.password,
          role: 'MEDICO' satisfies Role,
        },
      });

      await apiRequest<Doctor>('/doctors', {
        token: session.token,
        body: {
          userId: user.id,
          crm: doctorForm.crm,
          crmUf: doctorForm.crmUf.toUpperCase(),
          sectorId: doctorForm.sectorId || undefined,
          specialties: doctorForm.specialties
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          phone: doctorForm.phone || undefined,
          address: doctorForm.address || undefined,
          city: doctorForm.city || undefined,
          state: doctorForm.state || undefined,
          zipCode: doctorForm.zipCode || undefined,
          documents: parseDocumentReferences(doctorForm.documents),
          bio: doctorForm.bio || undefined,
        },
      });

      setDoctorForm(initialDoctorForm);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Medico cadastrado e liberado para agenda.',
      });
      navigate('/equipe');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel cadastrar o medico.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createNurse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await apiRequest<UserProfile>('/users', {
        token: session.token,
        body: {
          name: nurseForm.name,
          username: normalizeLogin(nurseForm.username),
          email: nurseForm.email,
          password: nurseForm.password,
          role: 'ENFERMEIRO' satisfies Role,
        },
      });

      await apiRequest<Nurse>('/nurses', {
        token: session.token,
        body: {
          userId: user.id,
          coren: nurseForm.coren,
          corenUf: nurseForm.corenUf.toUpperCase(),
          sectorId: nurseForm.sectorId || undefined,
          shift: nurseForm.shift || undefined,
          phone: nurseForm.phone || undefined,
          address: nurseForm.address || undefined,
          city: nurseForm.city || undefined,
          state: nurseForm.state || undefined,
          zipCode: nurseForm.zipCode || undefined,
          documents: parseDocumentReferences(nurseForm.documents),
        },
      });

      setNurseForm(initialNurseForm);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Enfermeiro cadastrado com sucesso.',
      });
      navigate('/equipe');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel cadastrar o enfermeiro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createSector(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<Sector>('/sectors', {
        token: session.token,
        body: {
          name: sectorForm.name,
          code: sectorForm.code.toUpperCase(),
          description: sectorForm.description || undefined,
          active: sectorForm.active,
        },
      });

      setSectorForm(initialSectorForm);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Setor cadastrado com sucesso.',
      });
      navigate('/equipe');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel cadastrar o setor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<Appointment>('/appointments', {
        token: session.token,
        body: {
          ...appointmentForm,
          appointmentDate: new Date(
            appointmentForm.appointmentDate,
          ).toISOString(),
          notes: appointmentForm.notes || undefined,
        },
      });

      setAppointmentForm(initialAppointmentForm);
      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Consulta registrada com sucesso.',
      });
      navigate('/agendamento');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel criar a consulta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createEmergencyEntry(payload: EmergencyEntryPayload) {
    if (!session?.token) {
      return;
    }

    const validation = patientFormSchema.safeParse(patientForm);

    if (!validation.success) {
      setNotice({
        kind: 'error',
        text: validation.error.issues[0]?.message ?? 'Revise o cadastro.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<Appointment>('/appointments', {
        token: session.token,
        body: {
          patientId: payload.patientId,
          doctorId: payload.doctorId,
          appointmentDate: new Date().toISOString(),
          status: 'AGENDADA',
          type: 'URGENCIA',
          notes: [
            '[PA][AGUARDANDO_TRIAGEM] Entrada imediata de pronto atendimento.',
            payload.notes.trim()
              ? `Queixa inicial: ${payload.notes.trim()}`
              : '',
            payload.internalNotes.trim()
              ? `Obs. interna: ${payload.internalNotes.trim()}`
              : '',
            payload.agreement ? `Convenio: ${payload.agreement}` : '',
            payload.plan ? `Plano: ${payload.plan}` : '',
            payload.classification
              ? `Classificacao recepcao: ${payload.classification}`
              : '',
            payload.requester
              ? `Profissional requisitante: ${payload.requester}`
              : '',
            payload.initialProcedure
              ? `Procedimento inicial: ${payload.initialProcedure}`
              : '',
            payload.medicationMaterial
              ? `Material/medicamento: ${payload.medicationMaterial}`
              : '',
            payload.tax ? `Taxa: ${payload.tax}` : '',
            payload.paymentMethod
              ? `Forma pagamento: ${payload.paymentMethod}`
              : '',
          ]
            .filter(Boolean)
            .join(' | '),
        },
      });

      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Entrada de Pronto Atendimento aberta e enviada para triagem.',
      });
      navigate('/pa-triagem');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel abrir a entrada de Pronto Atendimento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveCareRecord(
    appointmentId: string,
    payload: CareRecordPayload,
  ) {
    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<Appointment>(`/appointments/${appointmentId}`, {
        token: session.token,
        method: 'PATCH',
        body: {
          status: payload.status,
          notes: payload.notes || undefined,
          diagnosis: payload.diagnosis || undefined,
          prescription: payload.prescription || undefined,
        },
      });

      await loadDashboard(session.token, session.refreshToken);
      setNotice({
        kind: 'success',
        text: 'Atendimento atualizado com sucesso.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel atualizar o atendimento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function preparePatientForScheduling(patientId: string) {
    const patient = patients.find((item) => item.id === patientId);

    if (patient && !isPatientActive(patient)) {
      setNotice({
        kind: 'error',
        text: 'Paciente bloqueado ou inativo nao pode ser agendado.',
      });
      navigate('/pacientes');
      return;
    }

    setAppointmentForm((current) => ({
      ...current,
      patientId,
    }));
    setNotice({
      kind: 'info',
      text: 'Paciente preparado para o proximo agendamento.',
    });
    navigate('/agendamento');
  }

  function prepareDoctorForScheduling(doctorId: string) {
    setAppointmentForm((current) => ({
      ...current,
      doctorId,
    }));
    setNotice({
      kind: 'info',
      text: 'Medico preparado para o proximo agendamento.',
    });
    navigate('/agendamento');
  }

  function openTeamModule() {
    navigate('/equipe');
  }

  const canCreateAppointment =
    patients.some(isPatientActive) && doctors.length > 0;
  const canManageCare = Boolean(
    session &&
    ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'].includes(
      session.profile.role,
    ),
  );
  const storedEnvironment = getNavigationEnvironment(selectedEnvironmentId);
  const routeEnvironment =
    session &&
    location.pathname !== '/' &&
    !storedEnvironment.modulePaths.includes(location.pathname)
      ? navigationEnvironments.find((environment) =>
          environment.modulePaths.includes(location.pathname),
        )
      : null;
  const activeEnvironment = routeEnvironment ?? storedEnvironment;
  const accessibleModules = session
    ? activeModules.filter(
        (moduleItem) =>
          session.profile.role === 'ADMIN' ||
          !moduleItem.roles ||
          moduleItem.roles.includes(session.profile.role),
      )
    : activeModules;
  const accessibleModulesByPath = new Map(
    accessibleModules.map((moduleItem) => [moduleItem.path, moduleItem]),
  );
  const environmentModules = activeEnvironment.modulePaths
    .map((path) => accessibleModulesByPath.get(path))
    .filter((moduleItem): moduleItem is (typeof accessibleModules)[number] =>
      Boolean(moduleItem),
    );
  const visibleModules =
    environmentModules.length > 0
      ? environmentModules
      : accessibleModules.filter(
          (moduleItem) => moduleItem.path === '/central',
        );

  function changeEnvironment(environmentId: EnvironmentId) {
    const nextEnvironment = getNavigationEnvironment(environmentId);
    const targetModule =
      accessibleModules.find((moduleItem) =>
        nextEnvironment.modulePaths.includes(moduleItem.path),
      ) ?? accessibleModules[0];

    setIsEnvironmentPickerOpen(false);
    setTransitionEnvironment(nextEnvironment);
    localStorage.setItem(environmentStorageKey, nextEnvironment.id);
    startTransition(() => {
      setSelectedEnvironmentId(nextEnvironment.id);
    });

    if (targetModule) {
      navigate(targetModule.path);
    }

    window.setTimeout(() => {
      setTransitionEnvironment(null);
    }, 620);
  }

  if (!session) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginScreen
          handleLogin={handleLogin}
          isSubmitting={isSubmitting}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
        />
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route
        element={
          <WorkspaceLayout
            activeEnvironment={activeEnvironment}
            activeModules={visibleModules}
            environments={navigationEnvironments}
            handleLogout={handleLogout}
            isEnvironmentPickerOpen={isEnvironmentPickerOpen}
            notice={notice}
            onChangeEnvironment={changeEnvironment}
            onCloseEnvironmentPicker={() => setIsEnvironmentPickerOpen(false)}
            onOpenEnvironmentPicker={() => setIsEnvironmentPickerOpen(true)}
            session={session}
            transitionEnvironment={transitionEnvironment}
          />
        }
      >
        <Route index element={<Navigate replace to="/central" />} />
        <Route
          path="/central"
          element={
            <OverviewPage
              appointments={appointments}
              communicationDashboard={communicationDashboard}
              onDashboardRefresh={() =>
                loadDashboard(session.token, session.refreshToken).catch(
                  handleDashboardSyncError,
                )
              }
              patientTotal={patientTotal}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/cadastros"
          element={
            <RegistrationsPage
              doctors={doctors}
              nurses={nurses}
              patientTotal={patientTotal}
              sectors={sectors}
              users={users}
            />
          }
        />
        <Route
          path="/convenios"
          element={<AgreementsPage sessionToken={session.token} />}
        />
        <Route
          path="/configuracoes"
          element={
            session.profile.role === 'ADMIN' ? (
              <SettingsPage
                auditSummary={auditSummary}
                sessionToken={session.token}
                users={users}
              />
            ) : (
              <Navigate replace to="/central" />
            )
          }
        />
        <Route
          path="/usuarios"
          element={
            session.profile.role === 'ADMIN' ? (
              <UsersPage
                form={userForm}
                isSubmitting={isSubmitting}
                onSubmit={createUserAccount}
                setForm={setUserForm}
                users={users}
              />
            ) : (
              <Navigate replace to="/central" />
            )
          }
        />
        <Route
          path="/pacientes"
          element={
            <PatientsPage
              editingPatientId={editingPatientId}
              form={patientForm}
              isSubmitting={isSubmitting}
              onEditPatient={editPatient}
              onPreparePatient={preparePatientForScheduling}
              onResetPatient={resetPatientEditor}
              onSubmit={savePatient}
              patients={patients}
              patientTotal={patientTotal}
              sessionToken={session.token}
              setForm={setPatientForm}
            />
          }
        />
        <Route
          path="/procedimentos"
          element={<ProceduresPage sessionToken={session.token} />}
        />
        <Route
          path="/tabelas-precos"
          element={<PricingTablesPage sessionToken={session.token} />}
        />
        <Route
          path="/orcamentos"
          element={<BudgetCalculatorPage sessionToken={session.token} />}
        />
        <Route
          path="/cbhpm"
          element={<CbhpmPage sessionToken={session.token} />}
        />
        <Route
          path="/procedimentos-exames"
          element={<Navigate replace to="/procedimentos" />}
        />
        <Route
          path="/agendamento"
          element={
            <SchedulingPage
              appointmentForm={appointmentForm}
              appointments={appointments}
              canCreateAppointment={canCreateAppointment}
              doctors={doctors}
              isSubmitting={isSubmitting}
              onOpenTeam={openTeamModule}
              onSubmit={createAppointment}
              patients={patients}
              setAppointmentForm={setAppointmentForm}
            />
          }
        />
        <Route
          path="/pronto-atendimento"
          element={
            <EmergencyCarePage
              appointments={appointments}
              canManageCare={canManageCare}
              doctors={doctors}
              isSubmitting={isSubmitting}
              nurses={nurses}
              onSaveCareRecord={saveCareRecord}
              patients={patients}
              sessionToken={session.token}
              sectors={sectors}
            />
          }
        />
        <Route
          path="/atendimento"
          element={<Navigate replace to="/pronto-atendimento" />}
        />
        <Route
          path="/atender"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Atender"
              description="Fluxo eletivo para atendimento de pacientes agendados."
              steps={[
                'Selecionar paciente da agenda eletiva',
                'Registrar chegada e status do atendimento',
                'Encaminhar para consultorio, exames ou faturamento',
              ]}
            />
          }
        />
        <Route
          path="/pedidos-exames"
          element={
            <ExamOrdersPage
              doctors={doctors}
              patients={patients}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/laudos"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Laudos"
              description="Resultados, modelos e liberacao de laudos."
              steps={[
                'Listar exames pendentes de laudo',
                'Aplicar modelo por tipo de exame',
                'Liberar resultado para consultorio e faturamento',
              ]}
            />
          }
        />
        <Route
          path="/modelos-documentos"
          element={
            <DocumentTemplatesPage
              description="Cadastre atestados, receitas, pedidos de exame, relatorios e demais documentos usados no consultorio."
              environment="Consultorio"
              sessionToken={session.token}
              templateType="DOCUMENT"
              title="Modelos de Documento"
            />
          }
        />
        <Route
          path="/modelos-laudos"
          element={
            <DocumentTemplatesPage
              description="Cadastre modelos de laudo por grupo, layout e variaveis para resultados medicos."
              environment="Consultorio"
              sessionToken={session.token}
              templateType="REPORT"
              title="Modelos de Laudo"
            />
          }
        />
        <Route
          path="/recibo-nfse"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Recibo / NFS-e"
              description="Emissao de recibos e notas fiscais da rotina hospitalar."
              steps={[
                'Vincular recibo ao atendimento',
                'Preparar nota fiscal de servico',
                'Enviar pendencias ao faturamento',
              ]}
            />
          }
        />
        <Route
          path="/autorizacao"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Autorizacao"
              description="Controle de senhas, liberacoes e autorizacoes de convenio."
              steps={[
                'Registrar guia ou senha solicitada',
                'Acompanhar retorno do convenio',
                'Liberar atendimento autorizado',
              ]}
            />
          }
        />
        <Route
          path="/mapa-cirurgia"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Mapa de Cirurgia"
              description="Agenda cirurgica, salas, equipes e preparo."
              steps={[
                'Montar mapa por sala e horario',
                'Relacionar paciente, medico e equipe',
                'Controlar status pre, intra e pos-cirurgico',
              ]}
            />
          }
        />
        <Route
          path="/leitos"
          element={
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Leitos"
              description="Ocupacao, movimentacao e disponibilidade de leitos."
              steps={[
                'Visualizar leitos livres e ocupados',
                'Registrar entrada, transferencia e alta',
                'Relacionar leito ao atendimento hospitalar',
              ]}
            />
          }
        />
        <Route
          path="/pa-recepcao"
          element={
            <EmergencyOperationalPage
              appointments={appointments}
              doctors={doctors}
              isSubmitting={isSubmitting}
              mode="reception"
              nurses={nurses}
              onCreateEmergencyEntry={createEmergencyEntry}
              patients={patients}
              sectors={sectors}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/pa-triagem"
          element={
            <EmergencyOperationalPage
              appointments={appointments}
              doctors={doctors}
              isSubmitting={isSubmitting}
              mode="nursing"
              nurses={nurses}
              onCreateEmergencyEntry={createEmergencyEntry}
              patients={patients}
              sectors={sectors}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/pa-enfermagem"
          element={<Navigate replace to="/pa-triagem" />}
        />
        <Route
          path="/pa-pedidos"
          element={
            <ExamOrdersPage
              doctors={doctors}
              patients={patients}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/pa-dispensacao-medica"
          element={
            <EmergencyOperationalPage
              appointments={appointments}
              doctors={doctors}
              isSubmitting={isSubmitting}
              mode="dispensation"
              nurses={nurses}
              onCreateEmergencyEntry={createEmergencyEntry}
              patients={patients}
              sectors={sectors}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/pa-imagem"
          element={
            <EmergencyOperationalPage
              appointments={appointments}
              doctors={doctors}
              isSubmitting={isSubmitting}
              mode="imaging"
              nurses={nurses}
              onCreateEmergencyEntry={createEmergencyEntry}
              patients={patients}
              sectors={sectors}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/pa-exames-ambulatoriais"
          element={<Navigate replace to="/pa-pedidos" />}
        />
        <Route
          path="/consultorio"
          element={
            <DoctorOfficePage
              appointments={appointments}
              canManageCare={canManageCare}
              doctors={doctors}
              isSubmitting={isSubmitting}
              onSaveCareRecord={saveCareRecord}
              patients={patients}
              profile={session.profile}
              sessionToken={session.token}
            />
          }
        />
        <Route
          path="/equipe"
          element={
            <TeamPage
              doctors={doctors}
              nurses={nurses}
              sectors={sectors}
              form={doctorForm}
              nurseForm={nurseForm}
              sectorForm={sectorForm}
              isSubmitting={isSubmitting}
              onNurseSubmit={createNurse}
              onSectorSubmit={createSector}
              onPrepareDoctor={prepareDoctorForScheduling}
              onSubmit={createDoctor}
              setForm={setDoctorForm}
              setNurseForm={setNurseForm}
              setSectorForm={setSectorForm}
            />
          }
        />
        <Route
          path="/farmacia"
          element={
            <PharmacyPage
              appointments={appointments}
              nurses={nurses}
              sectors={sectors}
            />
          }
        />
        <Route
          path="/estoque-produtos"
          element={
            <ModulePlaceholderPage
              environment="Farmacia / Estoque"
              title="Cadastro de Produtos"
              description="Produtos, materiais e itens controlados pelo estoque."
              steps={[
                'Cadastrar produto e unidade de controle',
                'Definir categoria, estoque minimo e local',
                'Relacionar produto a lote ou medicamento',
              ]}
            />
          }
        />
        <Route
          path="/estoque-lotes"
          element={
            <ModulePlaceholderPage
              environment="Farmacia / Estoque"
              title="Lotes"
              description="Controle de lote, validade, entrada e saldo."
              steps={[
                'Registrar entrada por lote',
                'Controlar validade e saldo',
                'Bloquear lote vencido ou inconsistente',
              ]}
            />
          }
        />
        <Route
          path="/medicamentos"
          element={
            <ModulePlaceholderPage
              environment="Farmacia / Estoque"
              title="Medicamentos"
              description="Base medicamentosa para prescricao e dispensacao."
              steps={[
                'Cadastrar principio ativo e apresentacao',
                'Relacionar medicamento ao produto de estoque',
                'Controlar dispensacao por paciente',
              ]}
            />
          }
        />
        <Route
          path="/tabelas-medicamentos"
          element={
            <ModulePlaceholderPage
              environment="Farmacia / Estoque"
              title="Tabelas de Medicamentos"
              description="Tabelas negociadas para precificacao de medicamentos, materiais e OPME."
              steps={[
                'Cadastrar tabela por operadora ou origem comercial',
                'Importar valores de medicamentos e materiais',
                'Aplicar tabela na dispensacao e no faturamento',
              ]}
            />
          }
        />
        <Route
          path="/faturamento"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="overview"
            />
          }
        />
        <Route
          path="/guias"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="guides"
            />
          }
        />
        <Route
          path="/contas"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="accounts"
            />
          }
        />
        <Route
          path="/notas-fiscais"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="invoices"
            />
          }
        />
        <Route
          path="/glosas"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="denials"
            />
          }
        />
        <Route
          path="/importacao-xml"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="xml"
            />
          }
        />
        <Route
          path="/movimentacao-guias"
          element={
            <BillingWorkspacePage
              appointments={appointments}
              patientTotal={patientTotal}
              view="movements"
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/central" />} />
      </Route>
    </Routes>
  );
}

type UsersPageProps = {
  form: UserFormState;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  users: UserProfile[];
};

type SettingsPageProps = {
  auditSummary: AuditSummary;
  sessionToken: string;
  users: UserProfile[];
};

type SettingsTabId = 'general' | 'events' | 'information';

function SettingsPage({
  auditSummary,
  sessionToken,
  users,
}: SettingsPageProps) {
  const userCount = users.length;
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('general');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [focusedAuditLog, setFocusedAuditLog] = useState<AuditLog | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState<AuditAction | ''>('');
  const [auditRole, setAuditRole] = useState<Role | ''>('');
  const [auditResource, setAuditResource] = useState('');
  const [auditPeriod, setAuditPeriod] = useState('7');
  const [auditSensitiveOnly, setAuditSensitiveOnly] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const deferredAuditSearch = useDeferredValue(auditSearch.trim());
  const sensitiveLogCount = auditLogs.filter(isSensitiveAuditLog).length;
  const settingsTabs: Array<{
    description: string;
    id: SettingsTabId;
    label: string;
    metric: string;
  }> = [
    {
      id: 'general',
      label: 'Geral',
      description: 'Acessos, permissoes e parametros principais.',
      metric: `${userCount} usuarios`,
    },
    {
      id: 'events',
      label: 'Eventos do sistema',
      description: 'Logs auditaveis com filtros por acao, perfil e modulo.',
      metric: `${auditSummary.total.toLocaleString('pt-BR')} eventos`,
    },
    {
      id: 'information',
      label: 'Informacoes',
      description: 'Bases importadas, tabelas e rastreabilidade tecnica.',
      metric: 'CBHPM',
    },
  ];
  const settingsBlocks: Array<{
    action: string;
    description: string;
    icon: React.ReactNode;
    path?: string;
    tab?: SettingsTabId;
    title: string;
  }> = [
    {
      title: 'Acessos e permissoes',
      description:
        'Cadastre usuarios, defina cargos e mantenha logins unicos para evitar conflito operacional.',
      path: '/usuarios',
      action: 'Abrir usuarios',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: 'Setores e ambientes',
      description:
        'Organize a navegacao por setor para que cada profissional veja apenas o necessario.',
      action: 'Planejado',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      ),
    },
    {
      title: 'Auditoria LGPD/SBIS',
      description:
        'Consulte usuario, perfil, rota, acao, horario e finalidade operacional dos acessos autenticados.',
      action: 'Abrir eventos',
      tab: 'events',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      title: 'Parametros operacionais',
      description:
        'Centralize regras de busca, paginacao, seguranca, auditoria e comportamento dos modulos.',
      action: 'Em parametrizacao',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2.1 2.1 0 1 1-2.98 2.98l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.4a2.1 2.1 0 1 1-4.2 0v-.14A1.8 1.8 0 0 0 8.4 19.6a1.8 1.8 0 0 0-1.98.36l-.06.06a2.1 2.1 0 1 1-2.98-2.98l.06-.06A1.8 1.8 0 0 0 3.8 15a1.8 1.8 0 0 0-1.66-1.1H2a2.1 2.1 0 1 1 0-4.2h.14A1.8 1.8 0 0 0 3.8 8.6a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2.1 2.1 0 1 1 2.98-2.98l.06.06A1.8 1.8 0 0 0 8.4 4a1.8 1.8 0 0 0 1.1-1.66V2.2a2.1 2.1 0 1 1 4.2 0v.14A1.8 1.8 0 0 0 14.8 4a1.8 1.8 0 0 0 1.98-.36l.06-.06a2.1 2.1 0 1 1 2.98 2.98l-.06.06A1.8 1.8 0 0 0 19.4 8.6a1.8 1.8 0 0 0 1.66 1.1h.14a2.1 2.1 0 1 1 0 4.2h-.14A1.8 1.8 0 0 0 19.4 15Z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    if (settingsTab !== 'events') {
      return undefined;
    }

    let ignore = false;

    async function loadAuditLogs() {
      setIsAuditLoading(true);
      setAuditError(null);

      try {
        const params = new URLSearchParams({
          limit: String(auditPageSize),
          page: String(auditPage),
        });

        if (auditAction) {
          params.set('action', auditAction);
        }

        if (auditRole) {
          params.set('actorRole', auditRole);
        }

        if (auditResource) {
          params.set('resource', auditResource);
        }

        if (auditSensitiveOnly) {
          params.set('sensitive', 'true');
        }

        if (deferredAuditSearch.length >= 2) {
          params.set('search', deferredAuditSearch);
        }

        if (auditPeriod !== 'all') {
          const from = new Date();
          from.setDate(from.getDate() - Number(auditPeriod));
          params.set('from', from.toISOString());
        }

        const response = await apiRequest<PaginatedResponse<AuditLog>>(
          `/audit?${params.toString()}`,
          { token: sessionToken },
        );

        if (ignore) {
          return;
        }

        const nextLogs = response.data ?? [];
        setAuditLogs(nextLogs);
        setAuditTotal(
          response.total ?? response.meta?.total ?? nextLogs.length,
        );
        setFocusedAuditLog(nextLogs[0] ?? null);
      } catch (error) {
        if (ignore) {
          return;
        }

        setAuditLogs([]);
        setAuditTotal(0);
        setFocusedAuditLog(null);
        setAuditError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar a auditoria.',
        );
      } finally {
        if (!ignore) {
          setIsAuditLoading(false);
        }
      }
    }

    void loadAuditLogs();

    return () => {
      ignore = true;
    };
  }, [
    auditAction,
    auditPage,
    auditPeriod,
    auditResource,
    auditRole,
    auditSensitiveOnly,
    deferredAuditSearch,
    sessionToken,
    settingsTab,
  ]);

  function resetAuditFilters() {
    setAuditPage(1);
    setAuditSearch('');
    setAuditAction('');
    setAuditRole('');
    setAuditResource('');
    setAuditPeriod('7');
    setAuditSensitiveOnly(false);
  }

  function exportAuditCsv() {
    const header = [
      'Data',
      'Usuario',
      'Perfil',
      'Acao',
      'Modulo',
      'Recurso ID',
      'Status',
      'Finalidade',
      'Sensivel',
      'Rota',
    ];
    const rows = auditLogs.map((log) => [
      formatDateTime(log.createdAt),
      auditActorName(log),
      log.actorRole ? roleLabel(log.actorRole) : 'Sem perfil',
      auditActionLabel(log.action),
      auditResourceLabel(log.resource),
      log.resourceId ?? '',
      log.statusCode ?? '',
      auditPurposeLabel(log.metadata?.lgpd?.purpose),
      isSensitiveAuditLog(log) ? 'Sim' : 'Nao',
      log.route,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsvCell).join(';'))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `auditoria-lgpd-sbis-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="settings-page-stack">
      <div className="settings-tabs" role="tablist" aria-label="Configuracoes">
        {settingsTabs.map((tab) => (
          <button
            aria-selected={settingsTab === tab.id}
            className={
              settingsTab === tab.id
                ? 'settings-tab-button is-active'
                : 'settings-tab-button'
            }
            key={tab.id}
            onClick={() => setSettingsTab(tab.id)}
            role="tab"
            type="button"
          >
            <span>
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </span>
            <em>{tab.metric}</em>
          </button>
        ))}
      </div>

      {settingsTab === 'general' ? (
        <div className="page-grid settings-workspace">
        <article className="panel settings-vision-panel">
          <div>
            <p className="eyebrow">Configuracoes</p>
            <h2>Centro administrativo do sistema</h2>
            <p>
              Reuna aqui as regras que afetam acesso, seguranca, ambientes e
              parametros globais. A tela segue o modelo de blocos com icones
              para ficar mais rapida de ler e menos poluida.
            </p>
          </div>

          <div className="settings-icon-blocks">
            {settingsBlocks.map((block) => (
              <div className="settings-icon-block" key={block.title}>
                <span className="settings-icon">{block.icon}</span>
                <div>
                  <h3>{block.title}</h3>
                  <p>{block.description}</p>
                  {block.path ? (
                    <NavLink className="settings-action" to={block.path}>
                      {block.action}
                    </NavLink>
                  ) : block.tab ? (
                    <button
                      className="settings-action"
                      onClick={() => setSettingsTab(block.tab!)}
                      type="button"
                    >
                      {block.action}
                    </button>
                  ) : (
                    <span className="settings-action disabled">
                      {block.action}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel settings-status-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Controle</p>
              <h2>Resumo admin</h2>
            </div>
            <span className="inline-badge">ADMIN</span>
          </div>

          <div className="settings-metrics">
            <article>
              <span>Eventos auditados</span>
              <strong>{auditSummary.total}</strong>
            </article>
            <article>
              <span>Ultimas 24h</span>
              <strong>{auditSummary.last24h}</strong>
            </article>
            <article>
              <span>Acessos a pacientes</span>
              <strong>{auditSummary.patientAccesses}</strong>
            </article>
            <article>
              <span>Alteracoes registradas</span>
              <strong>{auditSummary.writeOperations}</strong>
            </article>
          </div>

          <div className="helper-block">
            <strong>Acesso protegido</strong>
            <span>
              {auditSummary.retentionPolicy} Hoje existem {userCount} usuarios,
              {` ${adminCount} `}administradores e {roleOptions.length} perfis
              base configurados.
            </span>
          </div>
        </aside>
        </div>
      ) : null}

      {settingsTab === 'information' ? (
        <CbhpmInformationPanel sessionToken={sessionToken} />
      ) : null}

      {settingsTab === 'events' ? (
        <article className="panel audit-console-panel settings-tab-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Auditoria e seguranca</p>
            <h2>Trilha LGPD/SBIS</h2>
            <p>
              Consulte acessos e alteracoes por usuario, perfil, acao, modulo e
              periodo. Eventos sensiveis ficam destacados para investigacao
              rapida.
            </p>
          </div>
          <div className="audit-actions">
            <span className="inline-badge">
              {auditTotal.toLocaleString('pt-BR')} eventos
            </span>
            <button
              className="ghost-button"
              disabled={auditLogs.length === 0}
              onClick={exportAuditCsv}
              type="button"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="audit-filter-grid">
          <label className="field">
            <span>Busca</span>
            <input
              onChange={(event) => {
                setAuditPage(1);
                setAuditSearch(event.target.value);
              }}
              placeholder="Usuario, rota, modulo ou ID"
              value={auditSearch}
            />
          </label>

          <label className="field">
            <span>Acao</span>
            <select
              onChange={(event) => {
                setAuditPage(1);
                setAuditAction(event.target.value as AuditAction | '');
              }}
              value={auditAction}
            >
              {auditActionOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Perfil</span>
            <select
              onChange={(event) => {
                setAuditPage(1);
                setAuditRole(event.target.value as Role | '');
              }}
              value={auditRole}
            >
              <option value="">Todos os perfis</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Modulo</span>
            <select
              disabled={auditSensitiveOnly}
              onChange={(event) => {
                setAuditPage(1);
                setAuditResource(event.target.value);
              }}
              value={auditResource}
            >
              {auditResourceOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Periodo</span>
            <select
              onChange={(event) => {
                setAuditPage(1);
                setAuditPeriod(event.target.value);
              }}
              value={auditPeriod}
            >
              {auditPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="audit-check-card">
            <input
              checked={auditSensitiveOnly}
              onChange={(event) => {
                setAuditPage(1);
                setAuditSensitiveOnly(event.target.checked);

                if (event.target.checked) {
                  setAuditResource('');
                }
              }}
              type="checkbox"
            />
            <span>
              <strong>Somente dados sensiveis</strong>
              <small>Pacientes, atendimentos, pedidos e autenticacao.</small>
            </span>
          </label>
        </div>

        <div className="audit-toolbar">
          <span>
            {sensitiveLogCount} sensiveis nesta pagina
            {isAuditLoading ? ' - atualizando...' : ''}
          </span>
          <button
            className="ghost-button"
            onClick={resetAuditFilters}
            type="button"
          >
            Limpar filtros
          </button>
        </div>

        {auditError ? <p className="form-error">{auditError}</p> : null}

        <div className="audit-layout">
          <div className="table-shell">
            <div className="table-head audit-grid">
              <span>Data</span>
              <span>Usuario</span>
              <span>Acao</span>
              <span>Modulo</span>
              <span>Finalidade</span>
              <span>Status</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum evento encontrado.</strong>
                <span>
                  Ajuste os filtros ou aguarde novas acoes no sistema.
                </span>
              </div>
            ) : (
              auditLogs.map((log) => (
                <button
                  className={
                    focusedAuditLog?.id === log.id
                      ? `table-row audit-grid audit-row is-active ${
                          isSensitiveAuditLog(log) ? 'is-sensitive' : ''
                        }`
                      : `table-row audit-grid audit-row ${
                          isSensitiveAuditLog(log) ? 'is-sensitive' : ''
                        }`
                  }
                  key={log.id}
                  onClick={() => setFocusedAuditLog(log)}
                  type="button"
                >
                  <span>
                    {formatDateTime(log.createdAt)}
                    <small>{log.method}</small>
                  </span>
                  <span>
                    {auditActorName(log)}
                    <small>
                      {log.actorRole ? roleLabel(log.actorRole) : 'Sem perfil'}
                    </small>
                  </span>
                  <span>
                    <strong>{auditActionLabel(log.action)}</strong>
                    <small>{log.resourceId ?? 'Sem ID vinculado'}</small>
                  </span>
                  <span>
                    {auditResourceLabel(log.resource)}
                    <small>{log.resource}</small>
                  </span>
                  <span>
                    {auditPurposeLabel(log.metadata?.lgpd?.purpose)}
                    <small>
                      {isSensitiveAuditLog(log)
                        ? 'Dado sensivel'
                        : 'Operacional'}
                    </small>
                  </span>
                  <span>
                    <strong>{log.statusCode ?? '-'}</strong>
                    <small>{auditStatusLabel(log.statusCode)}</small>
                  </span>
                </button>
              ))
            )}

            <ResultPagination
              currentPage={auditPage}
              isLoading={isAuditLoading}
              label="auditoria"
              onPageChange={setAuditPage}
              pageSize={auditPageSize}
              totalItems={auditTotal}
            />
          </div>

          <aside className="audit-detail-card">
            {focusedAuditLog ? (
              <>
                <div>
                  <p className="eyebrow">Evento em foco</p>
                  <h3>{auditActionLabel(focusedAuditLog.action)}</h3>
                  <p>{focusedAuditLog.route}</p>
                </div>

                <div className="record-grid">
                  <DetailItem
                    label="Usuario"
                    value={auditActorName(focusedAuditLog)}
                  />
                  <DetailItem
                    label="Perfil"
                    value={
                      focusedAuditLog.actorRole
                        ? roleLabel(focusedAuditLog.actorRole)
                        : 'Sem perfil'
                    }
                  />
                  <DetailItem
                    label="Modulo"
                    value={auditResourceLabel(focusedAuditLog.resource)}
                  />
                  <DetailItem
                    label="Finalidade"
                    value={auditPurposeLabel(
                      focusedAuditLog.metadata?.lgpd?.purpose,
                    )}
                  />
                  <DetailItem
                    label="IP"
                    value={focusedAuditLog.ipAddress ?? 'Nao informado'}
                  />
                  <DetailItem
                    label="Duracao"
                    value={
                      focusedAuditLog.metadata?.durationMs
                        ? `${focusedAuditLog.metadata.durationMs} ms`
                        : 'Nao medida'
                    }
                  />
                </div>

                <div className="helper-block">
                  <strong>
                    {isSensitiveAuditLog(focusedAuditLog)
                      ? 'Evento sensivel'
                      : 'Evento operacional'}
                  </strong>
                  <span>
                    Registro preserva rastreabilidade para investigar acesso,
                    alteracao e finalidade quando necessario.
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Nenhum evento selecionado.</strong>
                <span>Selecione uma linha para ver os detalhes.</span>
              </div>
            )}
          </aside>
        </div>
        </article>
      ) : null}
    </section>
  );
}

type CbhpmInformationPanelProps = {
  sessionToken: string;
};

function CbhpmInformationPanel({ sessionToken }: CbhpmInformationPanelProps) {
  const [summaries, setSummaries] = useState<CbhpmImportSummary[]>([]);
  const [summaryStatus, setSummaryStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [summaryError, setSummaryError] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [porteSearch, setPorteSearch] = useState('');
  const [porteSummaries, setPorteSummaries] = useState<CbhpmPorteSummary[]>([]);
  const [porteStatus, setPorteStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [porteError, setPorteError] = useState('');
  const availableYears = Array.from(
    new Set(summaries.map((summary) => summary.editionYear)),
  ).sort((left, right) => right - left);
  const porteYear = selectedYear || availableYears[0] || '';

  const loadPorteSummaries = useCallback(
    async (year: number | '', term = '') => {
      if (!year) {
        setPorteSummaries([]);
        setPorteStatus('idle');
        return;
      }

      setPorteStatus('loading');
      setPorteError('');

      try {
        const queryParams = new URLSearchParams({
          editionYear: String(year),
          limit: '80',
        });

        if (term) {
          queryParams.set('q', term);
        }

        const response = await apiRequest<CbhpmPorteSummary[]>(
          `/cbhpm/portes?${queryParams.toString()}`,
          { token: sessionToken },
        );

        setPorteSummaries(response);
        setPorteStatus('ready');
      } catch (error) {
        setPorteSummaries([]);
        setPorteStatus('error');
        setPorteError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar os portes CBHPM.',
        );
      }
    },
    [sessionToken],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadImportSummaries() {
      setSummaryStatus('loading');
      setSummaryError('');

      try {
        const response = await apiRequest<CbhpmImportSummary[]>(
          '/cbhpm/imports/summary',
          { token: sessionToken },
        );
        const latestYear = response.reduce(
          (latest, summary) => Math.max(latest, summary.editionYear),
          0,
        );

        if (!isMounted) {
          return;
        }

        setSummaries(response);
        setSelectedYear(latestYear || '');
        setSummaryStatus('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSummaries([]);
        setSummaryStatus('error');
        setSummaryError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar as importacoes CBHPM.',
        );
      }
    }

    void loadImportSummaries();

    return () => {
      isMounted = false;
    };
  }, [sessionToken]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadPorteSummaries(porteYear, porteSearch.trim());
    }, 180);

    return () => window.clearTimeout(handle);
  }, [loadPorteSummaries, porteSearch, porteYear]);

  return (
    <article className="panel cbhpm-information-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Informacoes CBHPM</p>
          <h2>Arquivos importados e portes</h2>
          <p>
            Area informativa para conferir quais edicoes foram importadas,
            origem dos CSVs e valores de porte por ano.
          </p>
        </div>
        <span className="inline-badge">
          {summaries.length.toLocaleString('pt-BR')} edicoes
        </span>
      </div>

      <div className="page-grid cbhpm-information-layout">
        <section className="cbhpm-information-card">
          <div className="page-header compact-header">
            <div>
              <p className="eyebrow">Arquivos importados</p>
              <h3>Historico por edicao</h3>
            </div>
          </div>

          {summaryStatus === 'loading' ? (
            <p className="empty-state compact">Carregando importacoes...</p>
          ) : summaryStatus === 'error' ? (
            <DirectoryState
              code="ER"
              title="Nao foi possivel carregar o historico."
              description={summaryError}
            />
          ) : summaries.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhuma tabela importada."
              description="Assim que os CSVs forem processados, os anos e arquivos aparecem aqui."
            />
          ) : (
            <div className="cbhpm-summary-list">
              {summaries.map((summary) => (
                <button
                  className={`cbhpm-summary-card ${
                    summary.editionYear === selectedYear ? 'active' : ''
                  }`}
                  key={`${summary.editionYear}-${summary.sourceFile}`}
                  onClick={() => setSelectedYear(summary.editionYear)}
                  type="button"
                >
                  <span>CBHPM {summary.editionYear}</span>
                  <strong>{summary.total.toLocaleString('pt-BR')} itens</strong>
                  <small>{summary.sourceFile || 'Arquivo nao informado'}</small>
                  <em>
                    {summary.importedAt
                      ? `Importado em ${formatDateTime(summary.importedAt)}`
                      : 'Sem data de importacao'}
                  </em>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="cbhpm-information-card">
          <div className="page-header compact-header">
            <div>
              <p className="eyebrow">Portes da edicao</p>
              <h3>
                {porteYear ? `CBHPM ${porteYear}` : 'Selecione uma edicao'}
              </h3>
            </div>
          </div>

          <input
            className="search-input"
            placeholder="Buscar porte: 1A, 2B, 10C..."
            value={porteSearch}
            onChange={(event) => setPorteSearch(event.target.value)}
          />

          {porteStatus === 'loading' ? (
            <p className="empty-state compact">Carregando portes...</p>
          ) : porteStatus === 'error' ? (
            <p className="form-warning">{porteError}</p>
          ) : porteSummaries.length === 0 ? (
            <p className="empty-state compact">
              Nenhum porte encontrado para esta edicao.
            </p>
          ) : (
            <div className="cbhpm-porte-list">
              {porteSummaries.map((summary) => (
                <article
                  className="cbhpm-porte-card"
                  key={`${summary.editionYear}-${summary.porte}-${summary.valorPorteCents}`}
                >
                  <span>{summary.porte}</span>
                  <strong>
                    {formatCurrencyFromCents(summary.valorPorteCents)}
                  </strong>
                  <small>{summary.procedureCount} procedimento(s)</small>
                  <em>Fracao {formatFractionRange(summary)}</em>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function UsersPage({
  form,
  isSubmitting,
  onSubmit,
  setForm,
  users,
}: UsersPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchUsers = search.trim().length >= 2;
  const filteredUsers = useMemo(
    () =>
      hasSearchedUsers
        ? users.filter((user) => matchUser(user, deferredSearch))
        : [],
    [deferredSearch, hasSearchedUsers, users],
  );
  const paginatedUsers = useMemo(
    () => paginateRecords(filteredUsers, userPage, compactPageSize),
    [filteredUsers, userPage],
  );
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const selectedRolePermissionOptions = useMemo(
    () => getRolePermissionOptions(form.role),
    [form.role],
  );

  function searchUsers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchUsers) {
      setUserPage(1);
      setHasSearchedUsers(true);
    }
  }

  function clearUsersSearch() {
    setSearch('');
    setUserPage(1);
    setHasSearchedUsers(false);
  }

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Usuarios</span>
          <strong>{users.length}</strong>
          <small>logins cadastrados</small>
        </article>
        <article className="summary-card">
          <span>Admins</span>
          <strong>{adminCount}</strong>
          <small>acesso total</small>
        </article>
        <article className="summary-card">
          <span>Permissoes</span>
          <strong>{roleOptions.length}</strong>
          <small>cargos disponiveis</small>
        </article>
        <article className="summary-card">
          <span>Regra</span>
          <strong>Unico</strong>
          <small>login sem duplicidade</small>
        </article>
      </section>

      <section className="page-grid module-grid modal-workspace">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Usuarios</p>
              <h2>Buscar acessos</h2>
            </div>
            <div className="toolbar-inline">
              <button
                className="primary-button"
                onClick={() => setIsUserModalOpen(true)}
                type="button"
              >
                Novo usuario
              </button>
              <span className="inline-badge">{users.length} no cadastro</span>
            </div>
          </div>

          <OperationalSearchCard
            canSearch={canSearchUsers}
            description="Pesquise antes de abrir a lista de acessos. Isso evita rolagem e reduz risco de alterar o usuario errado."
            onChange={setSearch}
            onClear={clearUsersSearch}
            onSearch={searchUsers}
            placeholder="Buscar por nome, login, email ou cargo"
            resultText={
              hasSearchedUsers
                ? `${filteredUsers.length} usuarios encontrados`
                : undefined
            }
            title="Localize o usuario pelo login ou permissao."
            value={search}
          />

          <div className="table-shell">
            <div className="table-head users-grid">
              <span>Nome</span>
              <span>Login</span>
              <span>Email</span>
              <span>Cargo</span>
            </div>

            {!hasSearchedUsers ? (
              <DirectoryState
                code="01"
                title="Nenhum usuario carregado automaticamente."
                description="Use a busca acima para localizar um login ou abra o cadastro em tela suspensa para criar um novo acesso."
              />
            ) : filteredUsers.length === 0 ? (
              <DirectoryState
                code="00"
                title="Nenhum usuario encontrado."
                description="Revise o termo pesquisado ou cadastre um novo usuario com login unico."
              />
            ) : (
              paginatedUsers.map((user) => (
                <div className="table-row users-grid" key={user.id}>
                  <span>{user.name}</span>
                  <span>{user.username}</span>
                  <span>{user.email}</span>
                  <span>{roleLabel(user.role)}</span>
                </div>
              ))
            )}
          </div>

          <ResultPagination
            currentPage={userPage}
            label="usuarios"
            onPageChange={setUserPage}
            pageSize={compactPageSize}
            totalItems={filteredUsers.length}
          />
        </article>

        <OperationalModal
          eyebrow="Cadastro administrativo"
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title="Novo usuario"
          toneLabel="Acesso admin"
        >
          <form className="modal-form-panel" onSubmit={onSubmit}>
            <div className="section-block">
              <p className="section-title">Identificacao e login</p>
              <div className="field-grid two-columns">
                <label className="field">
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
                  <span>Login unico</span>
                  <input
                    autoComplete="off"
                    placeholder="ex: recepcao01"
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: normalizeLogin(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
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
                    required
                  />
                </label>
                <label className="field">
                  <span>Senha inicial</span>
                  <input
                    minLength={6}
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field full-row">
                  <span>Cargo / permissao</span>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as Role,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <PermissionCheckboxFieldset
              legend={`Permissoes para ${roleLabel(form.role)}`}
              name="role-permissions"
              options={selectedRolePermissionOptions}
              text="Previa do que este cargo consegue acessar. Em uma proxima etapa, estes itens podem virar permissoes granulares salvas no banco."
            />

            <PermissionCheckboxFieldset
              legend="Parametros de seguranca"
              name="user-parameters"
              options={userParameterOptions}
              text="Regras operacionais aplicadas ao cadastro de usuarios e preparadas para auditoria."
            />

            <div className="helper-block">
              <strong>Permissao administrativa</strong>
              <span>
                Apenas ADMIN acessa esta tela. O cargo ADMIN fica com todos os
                modulos liberados; os demais entram por permissao de setor.
              </span>
            </div>

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar usuario'}
            </button>
          </form>
        </OperationalModal>
      </section>
    </>
  );
}

type PermissionCheckboxFieldsetProps = {
  legend: string;
  name: string;
  options: PermissionPreviewOption[];
  text: string;
};

function PermissionCheckboxFieldset({
  legend,
  name,
  options,
  text,
}: PermissionCheckboxFieldsetProps) {
  return (
    <fieldset className="permission-fieldset">
      <legend>{legend}</legend>
      <p>{text}</p>

      <div className="permission-checkbox-group">
        {options.map((option) => (
          <label
            className={
              option.checked
                ? 'permission-checkbox-card checked'
                : 'permission-checkbox-card'
            }
            key={option.value}
          >
            <input
              aria-readonly="true"
              checked={option.checked}
              name={name}
              readOnly
              type="checkbox"
              value={option.value}
            />
            <span className="permission-checkbox-visual" aria-hidden="true" />
            <span className="permission-checkbox-copy">
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type OverviewPageProps = {
  appointments: Appointment[];
  communicationDashboard: CommunicationDashboard;
  onDashboardRefresh: () => Promise<void>;
  patientTotal: number;
  sessionToken: string;
};

const mailboxTabs: Array<{ box: MailboxFolder; label: string }> = [
  { box: 'inbox', label: 'Recebidas' },
  { box: 'sent', label: 'Enviadas' },
  { box: 'archived', label: 'Arquivadas' },
  { box: 'trash', label: 'Excluidas' },
];

const messagePriorityOptions: Array<{
  label: string;
  value: InternalMessagePriority;
}> = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Urgente', value: 'URGENT' },
];

const initialInternalMessageForm = {
  body: '',
  priority: 'NORMAL' as InternalMessagePriority,
  recipientId: '',
  subject: '',
};

function OverviewPage({
  appointments,
  communicationDashboard,
  onDashboardRefresh,
  patientTotal,
  sessionToken,
}: OverviewPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mailboxBox, setMailboxBox] = useState<MailboxFolder>('inbox');
  const [messages, setMessages] = useState<InternalEmail[]>(
    communicationDashboard.emails,
  );
  const [recipients, setRecipients] = useState<InternalRecipient[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [messageForm, setMessageForm] = useState(initialInternalMessageForm);
  const [mailboxStatus, setMailboxStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [mailboxNotice, setMailboxNotice] = useState<Notice | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const muralCount =
    communicationDashboard.notices.length +
    communicationDashboard.updates.length;
  const unreadCount = messages.filter((email) => email.unread).length;
  const selectedMessage =
    messages.find((message) => message.id === selectedMessageId) ?? null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((appointment) =>
    appointment.appointmentDate?.startsWith(todayIso),
  );
  const scheduledAppointments = appointments.filter((appointment) =>
    ['AGENDADO', 'SCHEDULED'].includes(appointment.status.toUpperCase()),
  );
  const confirmedAppointments = appointments.filter((appointment) =>
    ['CONFIRMADO', 'CONFIRMED'].includes(appointment.status.toUpperCase()),
  );
  const finishedAppointments = appointments.filter((appointment) =>
    ['REALIZADO', 'FINALIZADO', 'COMPLETED', 'DONE'].includes(
      appointment.status.toUpperCase(),
    ),
  );
  const canceledAppointments = appointments.filter((appointment) =>
    ['CANCELADO', 'CANCELED', 'CANCELLED', 'NO_SHOW'].includes(
      appointment.status.toUpperCase(),
    ),
  );
  const officeFinishedAppointments = finishedAppointments.filter((appointment) =>
    appointment.type.toUpperCase().includes('CONSULT'),
  );
  const pendingPaAppointments = todayAppointments.filter((appointment) =>
    ['AGENDADO', 'SCHEDULED', 'CONFIRMADO', 'CONFIRMED'].includes(
      appointment.status.toUpperCase(),
    ),
  );
  const attendedAppointments =
    finishedAppointments.length > 0 ? finishedAppointments : todayAppointments;
  const maleAttendedCount = attendedAppointments.filter(
    (appointment) => appointment.patient.gender === 'MASCULINO',
  ).length;
  const femaleAttendedCount = attendedAppointments.filter(
    (appointment) => appointment.patient.gender === 'FEMININO',
  ).length;
  const newPatientAppointments = attendedAppointments.filter((appointment) => {
    const type = appointment.type.toUpperCase();

    return type.includes('PRIMEIRA') || type.includes('FIRST');
  });
  const recurrentAppointments = attendedAppointments.filter(
    (appointment) => !newPatientAppointments.includes(appointment),
  );
  const maxChartValue = Math.max(
    1,
    maleAttendedCount,
    femaleAttendedCount,
    newPatientAppointments.length,
    recurrentAppointments.length,
  );
  const canSendMessage =
    messageForm.recipientId &&
    messageForm.subject.trim().length >= 3 &&
    messageForm.body.trim().length >= 3;

  const overviewStats = [
    {
      accent: 'assist',
      label: 'Agendados',
      detail: 'consultas aguardando fluxo',
      value: scheduledAppointments.length,
    },
    {
      accent: 'clinical',
      label: 'Confirmados',
      detail: 'pacientes prontos para chamada',
      value: confirmedAppointments.length,
    },
    {
      accent: 'danger',
      label: 'Cancelados',
      detail: 'ausencias e cancelamentos',
      value: canceledAppointments.length,
    },
    {
      accent: 'success',
      label: 'Finaliz. consultorio',
      detail: 'atendimentos encerrados',
      value: officeFinishedAppointments.length,
    },
    {
      accent: 'warning',
      label: 'PA pendente',
      detail: 'fila do dia para evoluir',
      value: pendingPaAppointments.length,
    },
    {
      accent: 'mail',
      label: 'Caixa interna',
      detail: `${unreadCount} mensagens nao lidas`,
      value: messages.length,
    },
  ];
  const overviewChartGroups = [
    {
      female: femaleAttendedCount,
      label: 'Pacientes atendidos',
      male: maleAttendedCount,
    },
    {
      female: recurrentAppointments.filter(
        (appointment) => appointment.patient.gender === 'FEMININO',
      ).length,
      label: 'Pacientes recorrentes',
      male: recurrentAppointments.filter(
        (appointment) => appointment.patient.gender === 'MASCULINO',
      ).length,
    },
  ];

  const loadMessages = useCallback(
    async (box: MailboxFolder = mailboxBox) => {
      setMailboxStatus('loading');
      setMailboxNotice(null);

      try {
        const response = await apiRequest<InternalEmail[]>(
          `/communications/messages?box=${box}`,
          { token: sessionToken },
        );

        setMessages(response);
        setSelectedMessageId(null);
        setMailboxStatus('idle');
      } catch (error) {
        setMessages([]);
        setSelectedMessageId(null);
        setMailboxStatus('error');
        setMailboxNotice({
          kind: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar as mensagens.',
        });
      }
    },
    [mailboxBox, sessionToken],
  );

  useEffect(() => {
    void loadMessages(mailboxBox);
  }, [loadMessages, mailboxBox]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    if (searchParams.get('mailbox') === 'open') {
      setIsMailboxOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    async function loadRecipients() {
      try {
        const response = await apiRequest<InternalRecipient[]>(
          '/communications/recipients',
          { token: sessionToken },
        );

        setRecipients(response);
      } catch {
        setRecipients([]);
      }
    }

    void loadRecipients();
  }, [sessionToken]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSendMessage) {
      setMailboxNotice({
        kind: 'error',
        text: 'Informe destinatario, assunto e mensagem para enviar.',
      });
      return;
    }

    setIsSendingMessage(true);
    setMailboxNotice(null);

    try {
      await apiRequest<InternalEmail>('/communications/messages', {
        token: sessionToken,
        body: {
          recipientId: messageForm.recipientId,
          subject: messageForm.subject.trim(),
          body: messageForm.body.trim(),
          priority: messageForm.priority,
        },
      });

      setMessageForm(initialInternalMessageForm);
      setIsComposeOpen(false);
      setMailboxBox('sent');
      await loadMessages('sent');
      await onDashboardRefresh();
      setMailboxNotice({
        kind: 'success',
        text: 'Mensagem interna enviada com sucesso.',
      });
    } catch (error) {
      setMailboxNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel enviar a mensagem.',
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function openMessage(message: InternalEmail) {
    setSelectedMessageId(message.id);

    if (mailboxBox !== 'inbox' || !message.unread) {
      return;
    }

    try {
      const updated = await apiRequest<InternalEmail>(
        `/communications/messages/${message.id}/read`,
        { method: 'PATCH', token: sessionToken },
      );

      setMessages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await onDashboardRefresh();
    } catch {
      setMailboxNotice({
        kind: 'error',
        text: 'Nao foi possivel marcar a mensagem como lida.',
      });
    }
  }

  async function moveSelectedMessage(action: 'archive' | 'delete' | 'restore') {
    if (!selectedMessage) {
      return;
    }

    const path =
      action === 'delete'
        ? `/communications/messages/${selectedMessage.id}`
        : `/communications/messages/${selectedMessage.id}/${action}`;
    const method = action === 'delete' ? 'DELETE' : 'PATCH';

    try {
      await apiRequest<InternalEmail>(path, {
        method,
        token: sessionToken,
      });
      await loadMessages(mailboxBox);
      await onDashboardRefresh();
      setMailboxNotice({
        kind: 'success',
        text: 'Mensagem atualizada.',
      });
    } catch (error) {
      setMailboxNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel atualizar a mensagem.',
      });
    }
  }

  function closeMailbox() {
    setIsMailboxOpen(false);

    if (new URLSearchParams(location.search).get('mailbox') === 'open') {
      navigate('/central', { replace: true });
    }
  }

  return (
    <>
      <section className="overview-workspace">
        <article className="panel internal-board-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Principal</p>
              <h2>Mural interno</h2>
              <small>
                Avisos, comunicados e orientacoes publicados para a equipe.
              </small>
            </div>
            <div className="toolbar-inline">
              <span className="status-pill">{muralCount} publicados</span>
              <button
                className="ghost-button compact-button"
                onClick={() => setIsMailboxOpen(true)}
                type="button"
              >
                Abrir caixa interna
              </button>
            </div>
          </div>

          <div className="notice-list internal-board-list">
            {muralCount === 0 ? (
              <p className="empty-state">
                Nenhum comunicado publicado no mural.
              </p>
            ) : (
              <>
                {communicationDashboard.notices.map((notice) => (
                  <div className="notice-card" key={`notice-${notice.id}`}>
                    <span>Aviso do hospital</span>
                    <strong>{notice.title}</strong>
                    <p>{notice.description}</p>
                  </div>
                ))}

                {communicationDashboard.updates.map((update) => (
                  <div className="notice-card" key={`update-${update.id}`}>
                    <span>{update.tag || 'Comunicado do sistema'}</span>
                    <strong>{update.title}</strong>
                    <p>{update.description}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </article>

        <section className="panel overview-monitoring-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Monitoramento</p>
              <h2>Indicadores operacionais</h2>
              <small>
                Visao rapida da agenda, atendimentos e caixa interna apos o
                mural.
              </small>
            </div>
            <span className="status-pill">{patientTotal} pacientes na base</span>
          </div>

          <div className="overview-stat-strip">
            {overviewStats.map((stat) => (
              <button
                className={`overview-stat-card ${stat.accent}`}
                key={stat.label}
                onClick={() => {
                  if (stat.accent === 'mail') {
                    setIsMailboxOpen(true);
                  }
                }}
                type="button"
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </button>
            ))}
          </div>

          <div className="overview-chart-card">
            <div className="overview-chart-header">
              <div>
                <span>Pacientes atendidos</span>
                <strong>Quantidade total: {attendedAppointments.length}</strong>
              </div>
              <div className="overview-chart-legend">
                <span className="legend-item male">Masculino</span>
                <span className="legend-item female">Feminino</span>
              </div>
            </div>

            <div
              aria-label="Grafico de pacientes atendidos por genero"
              className="overview-bar-chart"
              role="img"
            >
              {overviewChartGroups.map((group) => (
                <div className="overview-chart-group" key={group.label}>
                  <div className="overview-bars">
                    <span
                      className="overview-bar male"
                      style={{
                        height: `${Math.max(10, (group.male / maxChartValue) * 100)}%`,
                      }}
                    >
                      <strong>{group.male}</strong>
                    </span>
                    <span
                      className="overview-bar female"
                      style={{
                        height: `${Math.max(10, (group.female / maxChartValue) * 100)}%`,
                      }}
                    >
                      <strong>{group.female}</strong>
                    </span>
                  </div>
                  <small>{group.label}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <OperationalModal
        eyebrow="Caixa interna"
        isOpen={isMailboxOpen}
        onClose={closeMailbox}
        size="wide"
        title="Email interno"
        toneLabel={`${unreadCount} nao lidas`}
      >
        <div className="internal-mail-modal-grid">
          <section className="internal-mail-list-panel">
            <div className="page-header compact">
              <div>
                <p className="eyebrow">Mensagens</p>
                <h3>Correio interno</h3>
                <small>Contato entre recepcao, medico, faturamento e apoio.</small>
              </div>
              <button
                className="primary-button compact-button"
                onClick={() => setIsComposeOpen(true)}
                type="button"
              >
                Nova mensagem
              </button>
            </div>

            <div className="mailbox-tabs">
              {mailboxTabs.map((tab) => (
                <button
                  className={mailboxBox === tab.box ? 'is-active' : ''}
                  key={tab.box}
                  onClick={() => setMailboxBox(tab.box)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {mailboxNotice ? (
              <p className={`notice-banner notice-${mailboxNotice.kind}`}>
                {mailboxNotice.text}
              </p>
            ) : null}

            <div className="inbox-list modal-inbox-list">
              {mailboxStatus === 'loading' ? (
                <p className="empty-state">Carregando mensagens...</p>
              ) : messages.length === 0 ? (
                <p className="empty-state">Caixa interna sem mensagens.</p>
              ) : (
                messages.map((email) => (
                  <button
                    className={`mail-row mail-row-button ${
                      email.unread ? 'is-unread' : ''
                    } ${selectedMessageId === email.id ? 'is-selected' : ''}`}
                    key={email.id}
                    onClick={() => void openMessage(email)}
                    type="button"
                  >
                    <div>
                      <span>
                        {mailboxBox === 'sent' ? `Para ${email.to}` : email.from}
                      </span>
                      <strong>{email.subject}</strong>
                      <p>{email.preview}</p>
                    </div>
                    <small>
                      {email.timeLabel ||
                        (email.sentAt ? formatTime(email.sentAt) : '--:--')}
                    </small>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="internal-mail-detail-panel">
            {selectedMessage ? (
              <div className="mail-detail-card expanded">
                <div>
                  <p className="eyebrow">Mensagem em foco</p>
                  <h3>{selectedMessage.subject}</h3>
                  <small>
                    De {selectedMessage.from}
                    {selectedMessage.to ? ` para ${selectedMessage.to}` : ''}
                  </small>
                </div>
                <p>{selectedMessage.body || selectedMessage.preview}</p>
                <div className="mail-detail-actions">
                  {mailboxBox === 'trash' || mailboxBox === 'archived' ? (
                    <button
                      className="mini-button"
                      onClick={() => void moveSelectedMessage('restore')}
                      type="button"
                    >
                      Restaurar
                    </button>
                  ) : (
                    <button
                      className="mini-button"
                      onClick={() => void moveSelectedMessage('archive')}
                      type="button"
                    >
                      Arquivar
                    </button>
                  )}
                  {mailboxBox !== 'trash' ? (
                    <button
                      className="mini-button"
                      onClick={() => void moveSelectedMessage('delete')}
                      type="button"
                    >
                      Excluir
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mail-detail-card empty-detail">
                <span className="step-marker">IN</span>
                <strong>Selecione uma mensagem</strong>
                <p>
                  Abra um item da caixa interna para visualizar o conteudo e
                  tomar uma acao.
                </p>
              </div>
            )}
          </section>
        </div>
      </OperationalModal>

      {isComposeOpen ? (
        <div
          className="detail-modal-backdrop"
          onClick={() => setIsComposeOpen(false)}
          role="presentation"
        >
          <form
            aria-labelledby="compose-message-title"
            aria-modal="true"
            className="detail-modal message-compose-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={sendMessage}
            role="dialog"
          >
            <div className="page-header">
              <div>
                <p className="eyebrow">Email interno</p>
                <h2 id="compose-message-title">Nova mensagem</h2>
              </div>
              <button
                className="ghost-button compact-button"
                onClick={() => setIsComposeOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <label className="field">
              <span>Destinatario</span>
              <select
                onChange={(event) =>
                  setMessageForm((current) => ({
                    ...current,
                    recipientId: event.target.value,
                  }))
                }
                required
                value={messageForm.recipientId}
              >
                <option value="">Selecione um usuario</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name} - {roleLabel(recipient.role)}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-grid two-columns">
              <label className="field">
                <span>Assunto</span>
                <input
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Ex: Suporte no atendimento"
                  required
                  value={messageForm.subject}
                />
              </label>

              <label className="field">
                <span>Prioridade</span>
                <select
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      priority: event.target.value as InternalMessagePriority,
                    }))
                  }
                  value={messageForm.priority}
                >
                  {messagePriorityOptions.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Mensagem</span>
              <textarea
                onChange={(event) =>
                  setMessageForm((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Descreva o aviso, suporte ou contato interno."
                required
                value={messageForm.body}
              />
            </label>

            <div className="mail-detail-actions">
              <button
                className="ghost-button"
                onClick={() => setIsComposeOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={!canSendMessage || isSendingMessage}
                type="submit"
              >
                {isSendingMessage ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

type RegistrationsPageProps = {
  doctors: Doctor[];
  nurses: Nurse[];
  patientTotal: number;
  sectors: Sector[];
  users: UserProfile[];
};

const administrativeRegistrationCards = [
  {
    label: 'Convenio',
    hint: 'Operadoras, contratos e regras',
    path: '/convenios',
    status: 'Ativo',
  },
  {
    label: 'Plano',
    hint: 'Planos vinculados aos convenios',
    status: 'Em breve',
  },
  {
    label: 'Profissional',
    hint: 'Medicos, enfermagem e equipe',
    path: '/equipe',
    status: 'Ativo',
  },
  {
    label: 'Procedimento',
    hint: 'Codigos, grupos e exigencias',
    path: '/procedimentos',
    status: 'Ativo',
  },
  {
    label: 'Pacote Proc.',
    hint: 'Pacotes e composicoes',
    status: 'Em breve',
  },
  {
    label: 'Modelo Laudo',
    hint: 'Textos padrao e templates',
    status: 'Em breve',
  },
  {
    label: 'Tabela Proc.',
    hint: 'Tabelas, valores e vigencias',
    path: '/tabelas-precos',
    status: 'Ativo',
  },
  {
    label: 'Grp. Convenio',
    hint: 'Agrupadores de operadoras',
    status: 'Em breve',
  },
  {
    label: 'Requisitante',
    hint: 'Solicitantes externos e internos',
    status: 'Em breve',
  },
];

const operationalRegistrationCards = [
  {
    label: 'Paciente',
    hint: 'Cadastro, busca e dados clinicos',
    path: '/pacientes',
    status: 'Ativo',
  },
  {
    label: 'Pedidos Exames',
    hint: 'Solicitacoes e acompanhamento',
    path: '/pedidos-exames',
    status: 'Proximo',
  },
  {
    label: 'Mov. Guias',
    hint: 'Movimentacao e controle de guias',
    status: 'Em breve',
  },
  {
    label: 'Laudos',
    hint: 'Resultados e modelos de laudo',
    status: 'Em breve',
  },
  {
    label: 'Rec./NFS-e',
    hint: 'Recibos e notas fiscais',
    status: 'Em breve',
  },
  {
    label: 'Autorizacao',
    hint: 'Senhas e liberacoes de atendimento',
    status: 'Em breve',
  },
];

function RegistrationsPage({
  doctors,
  nurses,
  patientTotal,
  sectors,
  users,
}: RegistrationsPageProps) {
  const professionalTotal = doctors.length + nurses.length;

  return (
    <section className="page-grid">
      <section className="summary-strip">
        <article className="summary-card">
          <span>Pacientes</span>
          <strong>{patientTotal}</strong>
          <small>cadastros ativos</small>
        </article>
        <article className="summary-card">
          <span>Profissionais</span>
          <strong>{professionalTotal}</strong>
          <small>medicos e enfermagem</small>
        </article>
        <article className="summary-card">
          <span>Setores</span>
          <strong>{sectors.length}</strong>
          <small>areas operacionais</small>
        </article>
        <article className="summary-card">
          <span>Usuarios</span>
          <strong>{users.length}</strong>
          <small>visivel para admin</small>
        </article>
      </section>

      <article className="panel registrations-hero">
        <div>
          <p className="eyebrow">Modulo 2</p>
          <h2>Central de Cadastros</h2>
          <p>
            Atalhos para a base administrativa e operacional. A ideia e manter a
            logica do sistema atual, mas com menos campos na mesma tela e mais
            organizacao por contexto.
          </p>
        </div>
      </article>

      <section className="registration-section">
        <div className="page-header">
          <div>
            <p className="eyebrow">Cadastros administrativos</p>
            <h2>Base de contratos, profissionais e tabelas</h2>
          </div>
        </div>
        <div className="registration-grid">
          {administrativeRegistrationCards.map((card) => (
            <RegistrationCard card={card} key={card.label} />
          ))}
        </div>
      </section>

      <section className="registration-section">
        <div className="page-header">
          <div>
            <p className="eyebrow">Cadastros operacionais</p>
            <h2>Fluxos ligados ao atendimento</h2>
          </div>
        </div>
        <div className="registration-grid operational">
          {operationalRegistrationCards.map((card) => (
            <RegistrationCard card={card} key={card.label} />
          ))}
        </div>
      </section>
    </section>
  );
}

type RegistrationCardProps = {
  card: {
    label: string;
    hint: string;
    path?: string;
    status: string;
  };
};

function RegistrationCard({ card }: RegistrationCardProps) {
  const content = (
    <>
      <span className="registration-icon">{card.label.slice(0, 2)}</span>
      <strong>{card.label}</strong>
      <small>{card.hint}</small>
      <em>{card.status}</em>
    </>
  );

  if (card.path) {
    return (
      <NavLink className="registration-card is-active" to={card.path}>
        {content}
      </NavLink>
    );
  }

  return (
    <div className="registration-card" aria-disabled="true">
      {content}
    </div>
  );
}

type ProceduresPageProps = {
  sessionToken: string;
};

function ProceduresPage({ sessionToken }: ProceduresPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedProcedures, setHasSearchedProcedures] = useState(false);
  const [procedureResults, setProcedureResults] = useState<Procedure[]>([]);
  const [procedureResultTotal, setProcedureResultTotal] = useState(0);
  const [procedurePage, setProcedurePage] = useState(1);
  const [procedureSearchStatus, setProcedureSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [procedureSearchError, setProcedureSearchError] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(
    null,
  );
  const [isEditorRequested, setIsEditorRequested] = useState(false);
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(
    null,
  );
  const [procedureForm, setProcedureForm] = useState(initialProcedureForm);
  const [isSavingProcedure, setIsSavingProcedure] = useState(false);
  const searchTerm = search.trim();
  const canSearchProcedure = searchTerm.length >= 2;
  const selectedProcedure =
    procedureResults.find(
      (procedure) => procedure.id === selectedProcedureId,
    ) ?? null;
  const focusedProcedure = selectedProcedure ?? procedureResults[0] ?? null;
  const editingProcedure =
    procedureResults.find((procedure) => procedure.id === editingProcedureId) ??
    null;
  const isEditorVisible = isEditorRequested || Boolean(editingProcedureId);
  const canSaveProcedure =
    procedureForm.code.trim().length > 0 &&
    procedureForm.description.trim().length > 2;

  async function performProcedureSearch(term: string, page = procedurePage) {
    if (term.trim().length < 2) {
      setProcedureSearchStatus('idle');
      setProcedureSearchError('Digite ao menos 2 caracteres para pesquisar.');
      return;
    }

    setProcedureSearchStatus('loading');
    setProcedureSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(compactPageSize),
        q: term.trim(),
      });
      const response = await apiRequest<PaginatedResponse<Procedure>>(
        `/procedures?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextProcedures = response.data ?? [];
      const nextTotal =
        response.meta?.total ?? response.total ?? nextProcedures.length;

      setProcedureResults(nextProcedures);
      setProcedureResultTotal(nextTotal);
      setProcedurePage(page);
      setSelectedProcedureId(null);
      setHasSearchedProcedures(true);
      setProcedureSearchStatus('ready');
    } catch (error) {
      setProcedureResults([]);
      setProcedureResultTotal(0);
      setSelectedProcedureId(null);
      setHasSearchedProcedures(true);
      setProcedureSearchStatus('error');
      setProcedureSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar procedimentos.',
      );
    }
  }

  async function searchProcedures(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performProcedureSearch(searchTerm, 1);
  }

  function openNewProcedureEditor() {
    setProcedureForm(initialProcedureForm);
    setEditingProcedureId(null);
    setSelectedProcedureId(null);
    setIsEditorRequested(true);
  }

  function closeProcedureEditor() {
    setProcedureForm(initialProcedureForm);
    setEditingProcedureId(null);
    setIsEditorRequested(false);
  }

  function clearProcedureSearch() {
    setSearch('');
    setHasSearchedProcedures(false);
    setProcedureResults([]);
    setProcedureResultTotal(0);
    setProcedurePage(1);
    setProcedureSearchStatus('idle');
    setProcedureSearchError('');
    setSelectedProcedureId(null);
    closeProcedureEditor();
  }

  function openProcedureForEdit(procedure: Procedure) {
    setProcedureForm(createProcedureForm(procedure));
    setEditingProcedureId(procedure.id);
    setSelectedProcedureId(null);
    setIsEditorRequested(true);
  }

  async function saveProcedure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSaveProcedure) {
      return;
    }

    setIsSavingProcedure(true);

    try {
      const isEditingProcedure = Boolean(editingProcedureId);
      const savedProcedure = await apiRequest<Procedure>(
        isEditingProcedure
          ? `/procedures/${editingProcedureId}`
          : '/procedures',
        {
          token: sessionToken,
          method: isEditingProcedure ? 'PATCH' : undefined,
          body: createProcedurePayload(procedureForm),
        },
      );

      setProcedureForm(initialProcedureForm);
      setEditingProcedureId(null);
      setIsEditorRequested(false);

      if (hasSearchedProcedures && searchTerm.length >= 2) {
        await performProcedureSearch(searchTerm);
      } else {
        setProcedureResults([savedProcedure]);
        setProcedureResultTotal(1);
        setSelectedProcedureId(savedProcedure.id);
        setHasSearchedProcedures(true);
        setProcedureSearchStatus('ready');
      }
    } catch (error) {
      setProcedureSearchStatus('error');
      setProcedureSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar o procedimento.',
      );
    } finally {
      setIsSavingProcedure(false);
    }
  }

  return (
    <section className="page-grid procedures-workspace modal-workspace">
      <article className="panel procedure-directory">
        <div className="page-header">
          <div>
            <p className="eyebrow">Procedimentos e exames</p>
            <h2>Buscar tabela operacional</h2>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={openNewProcedureEditor}
              type="button"
            >
              Novo procedimento
            </button>
            <span className="inline-badge">consulta no banco</span>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearchProcedure}
          description="Pesquise por codigo, descricao, tabela, grupo, unidade ou observacao. O retorno vem direto do banco com paginacao."
          error={procedureSearchError}
          isLoading={procedureSearchStatus === 'loading'}
          onChange={setSearch}
          onClear={clearProcedureSearch}
          onSearch={searchProcedures}
          placeholder="Digite codigo, nome do exame ou grupo"
          resultText={
            hasSearchedProcedures && procedureSearchStatus === 'ready'
              ? `${procedureResults.length} de ${procedureResultTotal} registros encontrados`
              : undefined
          }
          title="Consulte antes de cadastrar ou editar."
          value={search}
        />

        {focusedProcedure ? (
          <aside className="patient-preview-card">
            <div>
              <span className="section-title">Procedimento em foco</span>
              <strong>{focusedProcedure.description}</strong>
              <small>
                {focusedProcedure.code} -{' '}
                {procedureTypeLabel(focusedProcedure.type)}
              </small>
            </div>
            <div className="patient-preview-meta">
              <span>{focusedProcedure.tableCode || 'Tabela pendente'}</span>
              <span>{focusedProcedure.groupName || 'Grupo nao informado'}</span>
              <span>
                {formatCurrencyFromCents(focusedProcedure.referencePriceCents)}
              </span>
              <span>{focusedProcedure.active ? 'Ativo' : 'Inativo'}</span>
            </div>
          </aside>
        ) : null}

        <div className="table-shell">
          <div className="table-head procedures-grid">
            <span>Codigo</span>
            <span>Descricao</span>
            <span>Tipo</span>
            <span>Regras</span>
            <span>Acoes</span>
          </div>

          {!hasSearchedProcedures ? (
            <DirectoryState
              code="01"
              title="Nenhuma tabela carregada automaticamente."
              description="Use a busca para consultar procedimentos/exames ou abra um novo cadastro quando tiver certeza que o item nao existe."
            />
          ) : procedureSearchStatus === 'loading' ? (
            <p className="empty-state">Buscando procedimentos no banco...</p>
          ) : procedureSearchStatus === 'error' ? (
            <p className="empty-state">
              {procedureSearchError || 'Nao foi possivel buscar procedimentos.'}
            </p>
          ) : procedureResults.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhum procedimento encontrado."
              description="Confira o codigo/descricao pesquisado ou cadastre um novo item se for uma tabela nova."
            />
          ) : (
            <>
              <p className="result-caption">
                {procedureResults.length} de {procedureResultTotal} registros
                encontrados
              </p>
              {procedureResults.map((procedure) => (
                <div className="table-row procedures-grid" key={procedure.id}>
                  <span>
                    {procedure.code}
                    <small>{procedure.tableCode || 'Tabela pendente'}</small>
                  </span>
                  <span>
                    {procedure.description}
                    <small>
                      {procedure.groupName || 'Grupo nao informado'}
                    </small>
                  </span>
                  <span>{procedureTypeLabel(procedure.type)}</span>
                  <span>
                    {procedure.requiresAuthorization
                      ? 'Requer autorizacao'
                      : 'Sem autorizacao'}
                    <small>
                      {procedure.requiresReport
                        ? 'Requer laudo'
                        : 'Sem laudo obrigatorio'}
                    </small>
                  </span>
                  <div className="patient-actions">
                    <button
                      className="mini-button"
                      onClick={() => setSelectedProcedureId(procedure.id)}
                      type="button"
                    >
                      Ficha
                    </button>
                    <button
                      className="mini-button"
                      onClick={() => openProcedureForEdit(procedure)}
                      type="button"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <ResultPagination
          currentPage={procedurePage}
          isLoading={procedureSearchStatus === 'loading'}
          label="procedimentos"
          onPageChange={(page) => void performProcedureSearch(searchTerm, page)}
          pageSize={compactPageSize}
          totalItems={procedureResultTotal}
        />

        <OperationalModal
          eyebrow="Ficha tecnica"
          isOpen={Boolean(selectedProcedure)}
          onClose={() => setSelectedProcedureId(null)}
          title={selectedProcedure?.description ?? 'Procedimento'}
          toneLabel={
            selectedProcedure
              ? procedureTypeLabel(selectedProcedure.type)
              : undefined
          }
        >
          {selectedProcedure ? (
            <section className="patient-record-card modal-record-card">
              <div className="modal-action-row">
                <button
                  className="ghost-button"
                  onClick={() => openProcedureForEdit(selectedProcedure)}
                  type="button"
                >
                  Editar procedimento
                </button>
              </div>

              <div className="record-grid">
                <RecordLine label="Codigo" value={selectedProcedure.code} />
                <RecordLine
                  label="Tipo"
                  value={procedureTypeLabel(selectedProcedure.type)}
                />
                <RecordLine
                  label="Tabela"
                  value={selectedProcedure.tableCode}
                />
                <RecordLine label="Grupo" value={selectedProcedure.groupName} />
                <RecordLine label="Unidade" value={selectedProcedure.unit} />
                <RecordLine
                  label="Valor referencia"
                  value={formatCurrencyFromCents(
                    selectedProcedure.referencePriceCents,
                  )}
                />
                <RecordLine
                  label="Autorizacao"
                  value={
                    selectedProcedure.requiresAuthorization
                      ? 'Obrigatoria'
                      : 'Nao obrigatoria'
                  }
                />
                <RecordLine
                  label="Laudo"
                  value={
                    selectedProcedure.requiresReport
                      ? 'Obrigatorio'
                      : 'Nao obrigatorio'
                  }
                />
                <RecordLine
                  label="Faturavel"
                  value={selectedProcedure.billable ? 'Sim' : 'Nao'}
                />
                <RecordLine
                  label="Status"
                  value={selectedProcedure.active ? 'Ativo' : 'Inativo'}
                />
              </div>

              {selectedProcedure.notes ? (
                <p className="empty-state compact">{selectedProcedure.notes}</p>
              ) : null}
            </section>
          ) : null}
        </OperationalModal>
      </article>

      <OperationalModal
        eyebrow="Cadastro parametrizado"
        isOpen={isEditorVisible}
        onClose={closeProcedureEditor}
        title={editingProcedure ? 'Editar procedimento' : 'Novo procedimento'}
        toneLabel={editingProcedure ? 'Ficha em edicao' : 'Base de tabela'}
      >
        <form
          className="modal-form-panel procedure-editor"
          onSubmit={saveProcedure}
        >
          <div className="section-block">
            <p className="section-title">Identificacao</p>
            <div className="field-grid two-columns">
              <label className="field">
                <span>Codigo</span>
                <input
                  value={procedureForm.code}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      code: normalizeProcedureCode(event.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select
                  value={procedureForm.type}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      type: event.target.value as ProcedureType,
                    }))
                  }
                >
                  {procedureTypes.map((type) => (
                    <option key={type} value={type}>
                      {procedureTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-row">
                <span>Descricao</span>
                <input
                  value={procedureForm.description}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </div>

          <div className="section-block">
            <p className="section-title">Tabela e faturamento</p>
            <div className="field-grid three-columns">
              <label className="field">
                <span>Tabela</span>
                <input
                  placeholder="AMB, CBHPM, propria..."
                  value={procedureForm.tableCode}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      tableCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Grupo</span>
                <input
                  placeholder="Laboratorio, imagem..."
                  value={procedureForm.groupName}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      groupName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Unidade</span>
                <input
                  placeholder="Un, pacote, sessao..."
                  value={procedureForm.unit}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Valor referencia</span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={procedureForm.referencePrice}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      referencePrice: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Faturavel</span>
                <select
                  value={procedureForm.billable ? 'SIM' : 'NAO'}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      billable: event.target.value === 'SIM',
                    }))
                  }
                >
                  <option value="SIM">Sim</option>
                  <option value="NAO">Nao</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={procedureForm.active ? 'ATIVO' : 'INATIVO'}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      active: event.target.value === 'ATIVO',
                    }))
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
            </div>
          </div>

          <div className="section-block">
            <p className="section-title">Regras assistenciais</p>
            <div className="procedure-flags">
              <label className="procedure-flag">
                <input
                  checked={procedureForm.requiresAuthorization}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      requiresAuthorization: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  <strong>Requer autorizacao</strong>
                  <small>Controla senha e liberacao de convenio.</small>
                </span>
              </label>
              <label className="procedure-flag">
                <input
                  checked={procedureForm.requiresReport}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      requiresReport: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  <strong>Requer laudo</strong>
                  <small>Envia o item para fluxo de resultados/laudos.</small>
                </span>
              </label>
            </div>
            <label className="field">
              <span>Observacoes operacionais</span>
              <textarea
                placeholder="Preparo, jejum, restricoes, regras internas..."
                value={procedureForm.notes}
                onChange={(event) =>
                  setProcedureForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="patient-editor-actions">
            <button
              className="ghost-button"
              onClick={closeProcedureEditor}
              type="button"
            >
              {editingProcedure ? 'Cancelar edicao' : 'Fechar cadastro'}
            </button>
            <button
              className="primary-button"
              disabled={isSavingProcedure || !canSaveProcedure}
              type="submit"
            >
              {isSavingProcedure
                ? 'Salvando...'
                : canSaveProcedure
                  ? editingProcedure
                    ? 'Atualizar procedimento'
                    : 'Salvar procedimento'
                  : 'Preencha codigo e descricao'}
            </button>
          </div>
        </form>
      </OperationalModal>
    </section>
  );
}

type PricingTablesPageProps = {
  sessionToken: string;
};

function PricingTablesPage({ sessionToken }: PricingTablesPageProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [hasSearchedTables, setHasSearchedTables] = useState(false);
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [pricingTableTotal, setPricingTableTotal] = useState(0);
  const [pricingTablePage, setPricingTablePage] = useState(1);
  const [tableSearchStatus, setTableSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [tableError, setTableError] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState(initialPricingTableForm);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureOptions, setProcedureOptions] = useState<Procedure[]>([]);
  const [procedureSearchStatus, setProcedureSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [priceForm, setPriceForm] = useState(initialProcedurePriceForm);
  const [procedurePrices, setProcedurePrices] = useState<ProcedurePrice[]>([]);
  const [priceTotal, setPriceTotal] = useState(0);
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isCreatingCbhpmRange, setIsCreatingCbhpmRange] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const tableSearchTerm = tableSearch.trim();
  const procedureSearchTerm = procedureSearch.trim();
  const canSearchTables = tableSearchTerm.length >= 2;
  const canSearchProcedure = procedureSearchTerm.length >= 2;
  const selectedTable =
    pricingTables.find((table) => table.id === selectedTableId) ?? null;
  const selectedProcedure =
    procedureOptions.find(
      (procedure) => procedure.id === priceForm.procedureId,
    ) ?? null;
  const canSaveTable = tableForm.name.trim().length > 2;
  const canSavePrice =
    Boolean(priceForm.pricingTableId) &&
    Boolean(priceForm.procedureId) &&
    priceForm.price.trim().length > 0;

  async function searchPricingTables(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearchTables) {
      setTableSearchStatus('idle');
      setTableError('Digite ao menos 2 caracteres para pesquisar tabelas.');
      return;
    }

    await loadPricingTables(tableSearchTerm, 1);
  }

  async function loadPricingTables(
    term = tableSearchTerm,
    page = pricingTablePage,
  ) {
    setTableSearchStatus('loading');
    setTableError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(compactPageSize),
        q: term,
      });
      const response = await apiRequest<PaginatedResponse<PricingTable>>(
        `/pricing-tables?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextTables = response.data ?? [];
      const nextTotal =
        response.meta?.total ?? response.total ?? nextTables.length;

      setPricingTables(nextTables);
      setPricingTableTotal(nextTotal);
      setPricingTablePage(page);
      setSelectedTableId(null);
      setPriceForm((current) => ({
        ...current,
        pricingTableId: '',
      }));
      setHasSearchedTables(true);
      setTableSearchStatus('ready');
      setProcedurePrices([]);
      setPriceTotal(0);
    } catch (error) {
      setPricingTables([]);
      setPricingTableTotal(0);
      setSelectedTableId(null);
      setProcedurePrices([]);
      setPriceTotal(0);
      setHasSearchedTables(true);
      setTableSearchStatus('error');
      setTableError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar tabelas.',
      );
    }
  }

  async function createPricingTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSaveTable) {
      setTableError('Informe o nome da tabela.');
      return;
    }

    setIsSavingTable(true);
    setTableError('');

    try {
      const createdTable = await apiRequest<PricingTable>('/pricing-tables', {
        token: sessionToken,
        body: createPricingTablePayload(tableForm),
      });

      setPricingTables((current) =>
        mergePricingTables([createdTable, ...current]),
      );
      setPricingTableTotal((current) => current + 1);
      setSelectedTableId(createdTable.id);
      setPriceForm((current) => ({
        ...current,
        pricingTableId: createdTable.id,
      }));
      setTableForm(initialPricingTableForm);
      setIsTableModalOpen(false);
      setHasSearchedTables(true);
      setTableSearchStatus('ready');
      await loadProcedurePrices(createdTable.id);
    } catch (error) {
      setTableError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel cadastrar a tabela.',
      );
    } finally {
      setIsSavingTable(false);
    }
  }

  async function createCbhpmRange() {
    setIsCreatingCbhpmRange(true);
    setTableError('');

    try {
      const createdTables = await apiRequest<PricingTable[]>(
        '/pricing-tables/cbhpm-range',
        {
          token: sessionToken,
          body: { startYear: 2004, endYear: 2017 },
        },
      );

      setPricingTables((current) =>
        mergePricingTables([...createdTables, ...current]),
      );
      setPricingTableTotal((current) =>
        Math.max(current, mergePricingTables(createdTables).length),
      );
      setSelectedTableId(null);
      setPriceForm((current) => ({
        ...current,
        pricingTableId: '',
      }));
      setHasSearchedTables(true);
      setTableSearchStatus('ready');
      setProcedurePrices([]);
      setPriceTotal(0);
    } catch (error) {
      setTableError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel criar as tabelas CBHPM.',
      );
    } finally {
      setIsCreatingCbhpmRange(false);
    }
  }

  async function selectPricingTable(table: PricingTable) {
    setSelectedTableId(table.id);
    setPriceForm((current) => ({
      ...current,
      pricingTableId: table.id,
    }));
    await loadProcedurePrices(table.id);
  }

  async function loadProcedurePrices(pricingTableId: string) {
    const queryParams = new URLSearchParams({
      page: '1',
      limit: '50',
      pricingTableId,
    });
    const response = await apiRequest<PaginatedResponse<ProcedurePrice>>(
      `/procedure-prices?${queryParams.toString()}`,
      { token: sessionToken },
    );
    const nextPrices = response.data ?? [];

    setProcedurePrices(nextPrices);
    setPriceTotal(response.meta?.total ?? response.total ?? nextPrices.length);
  }

  async function searchProceduresForPricing(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSearchProcedure) {
      setTableError(
        'Digite ao menos 2 caracteres para localizar procedimento.',
      );
      return;
    }

    setProcedureSearchStatus('loading');
    setTableError('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '15',
        q: procedureSearchTerm,
      });
      const response = await apiRequest<PaginatedResponse<Procedure>>(
        `/procedures?${queryParams.toString()}`,
        { token: sessionToken },
      );

      setProcedureOptions(response.data ?? []);
      setProcedureSearchStatus('ready');
    } catch (error) {
      setProcedureOptions([]);
      setProcedureSearchStatus('error');
      setTableError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar procedimentos.',
      );
    }
  }

  async function createProcedurePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSavePrice) {
      setTableError('Selecione tabela, procedimento e valor.');
      return;
    }

    setIsSavingPrice(true);
    setTableError('');

    try {
      const createdPrice = await apiRequest<ProcedurePrice>(
        '/procedure-prices',
        {
          token: sessionToken,
          body: createProcedurePricePayload(priceForm),
        },
      );

      setProcedurePrices((current) => [createdPrice, ...current]);
      setPriceTotal((current) => current + 1);
      setPriceForm((current) => ({
        ...initialProcedurePriceForm,
        pricingTableId: current.pricingTableId,
      }));
      setProcedureSearch('');
      setProcedureOptions([]);
      setIsPriceModalOpen(false);
      await loadProcedurePrices(createdPrice.pricingTableId);
    } catch (error) {
      setTableError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar o valor.',
      );
    } finally {
      setIsSavingPrice(false);
    }
  }

  function clearTableSearch() {
    setTableSearch('');
    setHasSearchedTables(false);
    setPricingTables([]);
    setPricingTableTotal(0);
    setPricingTablePage(1);
    setSelectedTableId(null);
    setProcedurePrices([]);
    setPriceTotal(0);
    setTableSearchStatus('idle');
    setTableError('');
  }

  return (
    <section className="page-grid pricing-workspace modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Tabelas Proc.</p>
            <h2>CBHPM e precificacao</h2>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={() => setIsTableModalOpen(true)}
              type="button"
            >
              Nova tabela
            </button>
            <button
              className="ghost-button"
              disabled={isCreatingCbhpmRange}
              onClick={createCbhpmRange}
              type="button"
            >
              {isCreatingCbhpmRange ? 'Criando...' : 'Criar CBHPM 2004-2017'}
            </button>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearchTables}
          description="Pesquise por CBHPM, ano, convenio, tabela propria ou taxa operacional."
          error={tableError}
          isLoading={tableSearchStatus === 'loading'}
          onChange={setTableSearch}
          onClear={clearTableSearch}
          onSearch={searchPricingTables}
          placeholder="Ex: CBHPM 2017, Unimed, taxa de sala"
          resultText={
            hasSearchedTables && tableSearchStatus === 'ready'
              ? `${pricingTables.length} de ${pricingTableTotal} tabelas encontradas`
              : undefined
          }
          title="Localize a tabela antes de precificar."
          value={tableSearch}
        />

        <div className="table-shell">
          <div className="table-head pricing-tables-grid">
            <span>Tabela</span>
            <span>Tipo</span>
            <span>Ano</span>
            <span>Itens</span>
            <span>Acoes</span>
          </div>

          {!hasSearchedTables ? (
            <DirectoryState
              code="01"
              title="Nenhuma tabela carregada automaticamente."
              description="Busque uma tabela existente ou crie o intervalo CBHPM 2004-2017 para comecar."
            />
          ) : tableSearchStatus === 'loading' ? (
            <p className="empty-state">Buscando tabelas no banco...</p>
          ) : pricingTables.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhuma tabela encontrada."
              description="Cadastre uma tabela propria, conveniada ou gere o intervalo CBHPM."
            />
          ) : (
            pricingTables.map((table) => (
              <div className="table-row pricing-tables-grid" key={table.id}>
                <span>
                  {table.name}
                  <small>{table.code || 'Sem codigo'}</small>
                </span>
                <span>{pricingTableTypeLabel(table.type)}</span>
                <span>{table.year || 'Livre'}</span>
                <span>{table._count?.prices ?? 0} valores</span>
                <div className="patient-actions">
                  <button
                    className="mini-button"
                    onClick={() => void selectPricingTable(table)}
                    type="button"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ResultPagination
          currentPage={pricingTablePage}
          isLoading={tableSearchStatus === 'loading'}
          label="tabelas"
          onPageChange={(page) => void loadPricingTables(tableSearchTerm, page)}
          pageSize={compactPageSize}
          totalItems={pricingTableTotal}
        />

        <OperationalModal
          eyebrow="Tabela em foco"
          isOpen={Boolean(selectedTable)}
          onClose={() => setSelectedTableId(null)}
          title={selectedTable?.name ?? 'Tabela'}
          toneLabel={
            selectedTable
              ? pricingTableTypeLabel(selectedTable.type)
              : undefined
          }
        >
          {selectedTable ? (
            <section className="patient-record-card modal-record-card">
              <div className="modal-action-row">
                <button
                  className="primary-button"
                  onClick={() => {
                    setPriceForm((current) => ({
                      ...current,
                      pricingTableId: selectedTable.id,
                    }));
                    setIsPriceModalOpen(true);
                  }}
                  type="button"
                >
                  Adicionar valor
                </button>
              </div>

              <div className="record-grid">
                <RecordLine
                  label="Ano"
                  value={String(selectedTable.year || '')}
                />
                <RecordLine label="Codigo" value={selectedTable.code} />
                <RecordLine
                  label="Status"
                  value={selectedTable.active ? 'Ativa' : 'Inativa'}
                />
                <RecordLine label="Valores" value={`${priceTotal} item(ns)`} />
              </div>

              <div className="exam-item-list">
                <span className="section-title">Valores cadastrados</span>
                {procedurePrices.length === 0 ? (
                  <p className="empty-state compact">
                    Nenhum procedimento precificado nesta tabela ainda.
                  </p>
                ) : (
                  procedurePrices.map((price) => (
                    <article className="exam-item-card" key={price.id}>
                      <strong>{price.procedure.description}</strong>
                      <small>
                        {price.procedure.code} -{' '}
                        {formatCurrencyFromCents(price.priceCents)}
                      </small>
                      <small>
                        {price.billingUnit || 'Unidade'}
                        {price.operationalCostCents
                          ? ` - custo ${formatCurrencyFromCents(
                              price.operationalCostCents,
                            )}`
                          : ''}
                      </small>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </OperationalModal>
      </article>

      <OperationalModal
        eyebrow="Nova tabela"
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title="Cadastro de regra"
        toneLabel="Precificacao"
      >
        <form
          className="modal-form-panel section-block"
          onSubmit={createPricingTable}
        >
          <div className="field-grid two-columns">
            <label className="field full-row">
              <span>Nome da tabela</span>
              <input
                placeholder="CBHPM 2017, Tabela particular..."
                value={tableForm.name}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={tableForm.type}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    type: event.target.value as PricingTableType,
                  }))
                }
              >
                {pricingTableTypes.map((type) => (
                  <option key={type} value={type}>
                    {pricingTableTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ano</span>
              <input
                inputMode="numeric"
                placeholder="2017"
                value={tableForm.year}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    year: normalizeDigits(event.target.value).slice(0, 4),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Codigo interno</span>
              <input
                value={tableForm.code}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={tableForm.active ? 'ATIVA' : 'INATIVA'}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    active: event.target.value === 'ATIVA',
                  }))
                }
              >
                <option value="ATIVA">Ativa</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </label>
            <label className="field full-row">
              <span>Descricao</span>
              <textarea
                value={tableForm.description}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <button
            className="primary-button"
            disabled={isSavingTable || !canSaveTable}
            type="submit"
          >
            {isSavingTable ? 'Salvando...' : 'Salvar tabela'}
          </button>
        </form>
      </OperationalModal>

      <OperationalModal
        eyebrow="Precificacao"
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        title="Adicionar valor na tabela"
        toneLabel={selectedTable?.name ?? 'Tabela'}
      >
        <div className="modal-form-panel">
          <form
            className="operational-search-card"
            onSubmit={searchProceduresForPricing}
          >
            <div>
              <span className="section-title">Precificar procedimento</span>
              <strong>Localize o item da base operacional.</strong>
              <small>Use codigo, descricao, grupo ou tabela.</small>
            </div>
            <div className="operational-search-actions">
              <input
                className="search-input"
                placeholder="Ex: consulta, cirurgia, vitamina"
                value={procedureSearch}
                onChange={(event) => setProcedureSearch(event.target.value)}
              />
              <button
                className="ghost-button"
                disabled={
                  procedureSearchStatus === 'loading' || !canSearchProcedure
                }
                type="submit"
              >
                {procedureSearchStatus === 'loading' ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  setProcedureSearch('');
                  setProcedureOptions([]);
                }}
                type="button"
              >
                Limpar
              </button>
            </div>
          </form>

          {procedureOptions.length > 0 ? (
            <div className="selection-list">
              {procedureOptions.map((procedure) => (
                <button
                  className="selection-row"
                  key={procedure.id}
                  onClick={() =>
                    setPriceForm((current) => ({
                      ...current,
                      procedureId: procedure.id,
                    }))
                  }
                  type="button"
                >
                  <strong>{procedure.description}</strong>
                  <small>
                    {procedure.code} - {procedureTypeLabel(procedure.type)}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          <form className="section-block" onSubmit={createProcedurePrice}>
            <div className="field-grid two-columns">
              <label className="field full-row">
                <span>Tabela selecionada</span>
                <select
                  value={priceForm.pricingTableId}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      pricingTableId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Selecione</option>
                  {pricingTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-row">
                <span>Procedimento selecionado</span>
                <input
                  readOnly
                  value={
                    selectedProcedure
                      ? `${selectedProcedure.code} - ${selectedProcedure.description}`
                      : 'Busque e selecione um procedimento'
                  }
                />
              </label>
              <label className="field">
                <span>Valor final</span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={priceForm.price}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Custo operacional</span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={priceForm.operationalCost}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      operationalCost: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Unidade de cobranca</span>
                <input
                  placeholder="Unidade, CH, UCO, taxa..."
                  value={priceForm.billingUnit}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      billingUnit: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={priceForm.active ? 'ATIVO' : 'INATIVO'}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      active: event.target.value === 'ATIVO',
                    }))
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
              <label className="field">
                <span>Vigencia inicial</span>
                <input
                  type="date"
                  value={priceForm.effectiveFrom}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      effectiveFrom: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Vigencia final</span>
                <input
                  type="date"
                  value={priceForm.effectiveTo}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      effectiveTo: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field full-row">
                <span>Observacoes</span>
                <textarea
                  value={priceForm.notes}
                  onChange={(event) =>
                    setPriceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <button
              className="primary-button"
              disabled={isSavingPrice || !canSavePrice}
              type="submit"
            >
              {isSavingPrice ? 'Salvando...' : 'Salvar valor na tabela'}
            </button>
          </form>
        </div>
      </OperationalModal>
    </section>
  );
}

type CbhpmPageProps = {
  sessionToken: string;
};

function CbhpmPage({ sessionToken }: CbhpmPageProps) {
  const [summaries, setSummaries] = useState<CbhpmImportSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [procedures, setProcedures] = useState<CbhpmProcedure[]>([]);
  const [procedureTotal, setProcedureTotal] = useState(0);
  const [procedurePage, setProcedurePage] = useState(1);
  const [searchStatus, setSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [searchError, setSearchError] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(
    null,
  );
  const searchTerm = search.trim();
  const canSearch = searchTerm.length >= 2 || Boolean(selectedYear);
  const importedTotal = summaries.reduce(
    (total, summary) => total + summary.total,
    0,
  );
  const availableYears = Array.from(
    new Set(summaries.map((summary) => summary.editionYear)),
  ).sort((left, right) => right - left);
  const selectedSummary =
    summaries.find((summary) => summary.editionYear === selectedYear) ?? null;
  const focusedProcedure = selectedProcedureId
    ? (procedures.find((procedure) => procedure.id === selectedProcedureId) ??
      null)
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadImportSummaries() {
      try {
        const response = await apiRequest<CbhpmImportSummary[]>(
          '/cbhpm/imports/summary',
          { token: sessionToken },
        );
        const latestYear = response.reduce(
          (latest, summary) => Math.max(latest, summary.editionYear),
          0,
        );

        if (!isMounted) {
          return;
        }

        setSummaries(response);
        setSelectedYear((current) => current || latestYear || '');
      } catch {
        if (!isMounted) {
          return;
        }

        setSummaries([]);
      }
    }

    void loadImportSummaries();

    return () => {
      isMounted = false;
    };
  }, [sessionToken]);

  async function searchCbhpm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearch) {
      setSearchStatus('idle');
      setSearchError('Digite ao menos 2 caracteres ou selecione um ano.');
      return;
    }

    await loadCbhpmProcedures(searchTerm, selectedYear, 1);
  }

  async function loadCbhpmProcedures(
    term = searchTerm,
    year = selectedYear,
    page = procedurePage,
  ) {
    setSearchStatus('loading');
    setSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(regularPageSize),
      });

      if (term) {
        queryParams.set('q', term);
      }

      if (year) {
        queryParams.set('editionYear', String(year));
      }

      const response = await apiRequest<PaginatedResponse<CbhpmProcedure>>(
        `/cbhpm?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextProcedures = response.data ?? [];

      setProcedures(nextProcedures);
      setProcedureTotal(
        response.meta?.total ?? response.total ?? nextProcedures.length,
      );
      setProcedurePage(page);
      setSelectedProcedureId(null);
      setHasSearched(true);
      setSearchStatus('ready');
    } catch (error) {
      setProcedures([]);
      setProcedureTotal(0);
      setSelectedProcedureId(null);
      setHasSearched(true);
      setSearchStatus('error');
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar procedimentos CBHPM.',
      );
    }
  }

  function clearSearch() {
    setSearch('');
    setSelectedYear('');
    setHasSearched(false);
    setProcedures([]);
    setProcedureTotal(0);
    setProcedurePage(1);
    setSelectedProcedureId(null);
    setSearchStatus('idle');
    setSearchError('');
  }

  return (
    <section className="page-grid cbhpm-workspace modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">CBHPM importada</p>
            <h2>Consulta por codigo e edicao</h2>
          </div>
          <span className="inline-badge">
            {importedTotal.toLocaleString('pt-BR')} registros
          </span>
        </div>

        <div className="cbhpm-stat-grid">
          <article className="summary-card">
            <span>Edicoes</span>
            <strong>{availableYears.length}</strong>
            <small>
              {availableYears.join(', ') || 'Aguardando importacao'}
            </small>
          </article>
          <article className="summary-card">
            <span>Ano em foco</span>
            <strong>{selectedYear || 'Todos'}</strong>
            <small>{selectedSummary?.sourceFile || 'Filtro livre'}</small>
          </article>
          <article className="summary-card">
            <span>Resultado</span>
            <strong>{hasSearched ? procedureTotal : 0}</strong>
            <small>itens encontrados na consulta</small>
          </article>
        </div>

        <OperationalSearchCard
          canSearch={canSearch}
          description="Use codigo, nome do procedimento, porte ou arquivo. Selecione um ano para conferir a edicao correta."
          error={searchError}
          isLoading={searchStatus === 'loading'}
          label="Consulta parametrizada"
          onChange={setSearch}
          onClear={clearSearch}
          onSearch={searchCbhpm}
          placeholder="Ex: 10101012, consulta, anestesico..."
          resultText={
            hasSearched && searchStatus === 'ready'
              ? `${procedures.length} de ${procedureTotal} procedimentos encontrados`
              : undefined
          }
          title="Localize o procedimento antes de precificar."
          value={search}
        />

        <label className="field cbhpm-year-filter">
          <span>Filtrar por edicao</span>
          <select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(
                event.target.value ? Number(event.target.value) : '',
              )
            }
          >
            <option value="">Todas as edicoes</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                CBHPM {year}
              </option>
            ))}
          </select>
        </label>

        <div className="table-shell">
          <div className="table-head cbhpm-grid">
            <span>Codigo</span>
            <span>Procedimento</span>
            <span>Ano</span>
            <span>Porte</span>
            <span>Valores</span>
            <span>Acoes</span>
          </div>

          {!hasSearched ? (
            <DirectoryState
              code="01"
              title="Nenhum procedimento carregado automaticamente."
              description="Pesquise por codigo ou escolha um ano para consultar a base importada."
            />
          ) : searchStatus === 'loading' ? (
            <p className="empty-state">Buscando na base CBHPM...</p>
          ) : procedures.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhum procedimento encontrado."
              description="Revise o codigo, descricao ou selecione outra edicao da CBHPM."
            />
          ) : (
            procedures.map((procedure) => (
              <div className="table-row cbhpm-grid" key={procedure.id}>
                <span>
                  {procedure.codigo}
                  <small>{procedure.sourceFile || 'Fonte nao informada'}</small>
                </span>
                <span>{procedure.procedimento}</span>
                <span>{procedure.editionYear}</span>
                <span>{procedure.porte || 'Sem porte'}</span>
                <span>
                  Honorario {formatCurrencyFromCents(procedure.totalPorteCents)}
                  <small>
                    Total{' '}
                    {formatCurrencyFromCents(
                      procedure.subtotalCents ?? procedure.totalPorteCents,
                    )}
                  </small>
                </span>
                <div className="patient-actions">
                  <button
                    className="mini-button"
                    onClick={() => setSelectedProcedureId(procedure.id)}
                    type="button"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ResultPagination
          currentPage={procedurePage}
          isLoading={searchStatus === 'loading'}
          label="CBHPM"
          onPageChange={(page) =>
            void loadCbhpmProcedures(searchTerm, selectedYear, page)
          }
          pageSize={regularPageSize}
          totalItems={procedureTotal}
        />
      </article>

      {focusedProcedure ? (
        <div
          className="detail-modal-backdrop"
          onClick={() => setSelectedProcedureId(null)}
          role="presentation"
        >
          <section
            aria-labelledby="cbhpm-detail-title"
            aria-modal="true"
            className="detail-modal cbhpm-detail-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="page-header">
              <div>
                <p className="eyebrow">Procedimento em foco</p>
                <h2 id="cbhpm-detail-title">{focusedProcedure.procedimento}</h2>
              </div>
              <div className="toolbar-inline">
                <span className="inline-badge">
                  CBHPM {focusedProcedure.editionYear}
                </span>
                <button
                  className="ghost-button"
                  onClick={() => setSelectedProcedureId(null)}
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="record-grid">
              <RecordLine label="Codigo" value={focusedProcedure.codigo} />
              <RecordLine label="Porte" value={focusedProcedure.porte} />
              <RecordLine
                label="Fracao porte"
                value={formatDecimalValue(focusedProcedure.fracaoPorte)}
              />
              <RecordLine
                label="Valor base do porte"
                value={formatCurrencyFromCents(
                  focusedProcedure.valorPorteCents,
                )}
              />
              <RecordLine
                label="Honorario / total porte"
                value={formatCurrencyFromCents(
                  focusedProcedure.totalPorteCents,
                )}
              />
              <RecordLine
                label="Adicionais"
                value={formatCurrencyFromCents(
                  focusedProcedure.adicionaisCents,
                )}
              />
              <RecordLine
                label="Subtotal final"
                value={formatCurrencyFromCents(
                  focusedProcedure.subtotalCents ??
                    focusedProcedure.totalPorteCents,
                )}
              />
              <RecordLine
                label="Filme"
                value={formatCurrencyFromCents(
                  focusedProcedure.totalFilmeCents,
                )}
              />
              <RecordLine
                label="UCO"
                value={formatCurrencyFromCents(focusedProcedure.totalUcoCents)}
              />
              <RecordLine
                label="Porte anestesico"
                value={focusedProcedure.porteAnestesico}
              />
              <RecordLine
                label="Total anestesico"
                value={formatCurrencyFromCents(
                  focusedProcedure.totalPorteAnestesicoCents,
                )}
              />
              <RecordLine
                label="Auxiliares"
                value={formatCurrencyFromCents(
                  focusedProcedure.totalAuxiliaresCents,
                )}
              />
              <RecordLine label="Arquivo" value={focusedProcedure.sourceFile} />
              <RecordLine
                label="Importado em"
                value={
                  focusedProcedure.importedAt
                    ? formatDateTime(focusedProcedure.importedAt)
                    : ''
                }
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type ExamOrdersPageProps = {
  doctors: Doctor[];
  patients: Patient[];
  sessionToken: string;
};

function ExamOrdersPage({
  doctors,
  patients,
  sessionToken,
}: ExamOrdersPageProps) {
  const [orderSearch, setOrderSearch] = useState('');
  const [hasSearchedOrders, setHasSearchedOrders] = useState(false);
  const [orderResults, setOrderResults] = useState<ExamOrder[]>([]);
  const [orderResultTotal, setOrderResultTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearchStatus, setOrderSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [orderSearchError, setOrderSearchError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [patientSearchStatus, setPatientSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureOptions, setProcedureOptions] = useState<Procedure[]>([]);
  const [knownProcedures, setKnownProcedures] = useState<Procedure[]>([]);
  const [procedureSearchStatus, setProcedureSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [form, setForm] = useState(initialExamOrderForm);
  const [formError, setFormError] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const orderSearchTerm = orderSearch.trim();
  const patientSearchTerm = patientSearch.trim();
  const procedureSearchTerm = procedureSearch.trim();
  const canSearchOrders = orderSearchTerm.length >= 2;
  const canSearchPatient = patientSearchTerm.length >= 2;
  const canSearchProcedure = procedureSearchTerm.length >= 2;
  const selectedOrder =
    orderResults.find((order) => order.id === selectedOrderId) ?? null;
  const selectedPatient =
    patientOptions.find((patient) => patient.id === form.patientId) ??
    patients.find((patient) => patient.id === form.patientId) ??
    null;
  const selectedDoctor =
    doctors.find((doctor) => doctor.id === form.requesterDoctorId) ?? null;
  const selectedItems = form.items.map((item) => ({
    ...item,
    procedure:
      knownProcedures.find((procedure) => procedure.id === item.procedureId) ??
      null,
  }));
  const canSaveOrder = Boolean(form.patientId) && form.items.length > 0;

  async function loadOrderPage(page = orderPage) {
    if (!canSearchOrders) {
      setOrderSearchStatus('idle');
      setOrderSearchError('Digite ao menos 2 caracteres para pesquisar.');
      return;
    }

    setOrderSearchStatus('loading');
    setOrderSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(compactPageSize),
        q: orderSearchTerm,
      });
      const response = await apiRequest<PaginatedResponse<ExamOrder>>(
        `/exam-orders?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextOrders = response.data ?? [];
      const nextTotal =
        response.meta?.total ?? response.total ?? nextOrders.length;

      setOrderResults(nextOrders);
      setOrderResultTotal(nextTotal);
      setOrderPage(page);
      setSelectedOrderId(null);
      setHasSearchedOrders(true);
      setOrderSearchStatus('ready');
    } catch (error) {
      setOrderResults([]);
      setOrderResultTotal(0);
      setSelectedOrderId(null);
      setHasSearchedOrders(true);
      setOrderSearchStatus('error');
      setOrderSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar pedidos.',
      );
    }
  }

  async function searchOrders(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadOrderPage(1);
  }

  async function searchPatientsForOrder(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSearchPatient) {
      setPatientSearchStatus('idle');
      setFormError('Digite ao menos 2 caracteres para localizar o paciente.');
      return;
    }

    setPatientSearchStatus('loading');
    setFormError('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '12',
        q: patientSearchTerm,
      });
      const response = await apiRequest<PaginatedResponse<Patient>>(
        `/patients?${queryParams.toString()}`,
        { token: sessionToken },
      );

      setPatientOptions(response.data ?? []);
      setPatientSearchStatus('ready');
    } catch (error) {
      setPatientOptions([]);
      setPatientSearchStatus('error');
      setFormError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar pacientes.',
      );
    }
  }

  async function searchProceduresForOrder(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSearchProcedure) {
      setProcedureSearchStatus('idle');
      setFormError('Digite ao menos 2 caracteres para localizar o exame.');
      return;
    }

    setProcedureSearchStatus('loading');
    setFormError('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '12',
        q: procedureSearchTerm,
      });
      const response = await apiRequest<PaginatedResponse<Procedure>>(
        `/procedures?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextProcedures = response.data ?? [];

      setProcedureOptions(nextProcedures);
      setKnownProcedures((current) => mergeProcedures(current, nextProcedures));
      setProcedureSearchStatus('ready');
    } catch (error) {
      setProcedureOptions([]);
      setProcedureSearchStatus('error');
      setFormError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar procedimentos.',
      );
    }
  }

  function selectPatient(patient: Patient) {
    setPatientOptions((current) => mergePatients(current, [patient]));
    setForm((current) => ({
      ...current,
      patientId: patient.id,
    }));
    setFormError('');
  }

  function addProcedureToOrder(procedure: Procedure) {
    if (!procedure.active) {
      setFormError('Procedimento inativo nao pode entrar no pedido.');
      return;
    }

    if (form.items.some((item) => item.procedureId === procedure.id)) {
      setFormError('Este procedimento ja esta no pedido.');
      return;
    }

    setKnownProcedures((current) => mergeProcedures(current, [procedure]));
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { procedureId: procedure.id, quantity: 1, notes: '' },
      ],
    }));
    setFormError('');
  }

  function updateOrderItem(
    procedureId: string,
    nextItem: Partial<ExamOrderFormItem>,
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.procedureId === procedureId ? { ...item, ...nextItem } : item,
      ),
    }));
  }

  function removeOrderItem(procedureId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.procedureId !== procedureId),
    }));
  }

  async function saveExamOrder() {
    if (!canSaveOrder) {
      setFormError('Selecione o paciente e ao menos um procedimento.');
      return;
    }

    setIsSavingOrder(true);
    setFormError('');

    try {
      const savedOrder = await apiRequest<ExamOrder>('/exam-orders', {
        token: sessionToken,
        body: createExamOrderPayload(form),
      });

      setOrderResults((current) => [savedOrder, ...current]);
      setOrderResultTotal((current) => current + 1);
      setSelectedOrderId(savedOrder.id);
      setIsOrderModalOpen(false);
      setHasSearchedOrders(true);
      setOrderSearchStatus('ready');
      setForm(initialExamOrderForm);
      setPatientSearch('');
      setProcedureSearch('');
      setProcedureOptions([]);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar o pedido.',
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  function clearOrderSearch() {
    setOrderSearch('');
    setHasSearchedOrders(false);
    setOrderResults([]);
    setOrderResultTotal(0);
    setOrderPage(1);
    setOrderSearchStatus('idle');
    setOrderSearchError('');
    setSelectedOrderId(null);
  }

  return (
    <section className="page-grid exam-orders-workspace modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Pedidos Exames</p>
            <h2>Buscar solicitações</h2>
          </div>
          <div className="toolbar-inline">
            <button
              className="primary-button"
              onClick={() => setIsOrderModalOpen(true)}
              type="button"
            >
              Novo pedido
            </button>
            <span className="inline-badge">fluxo assistencial</span>
          </div>
        </div>

        <OperationalSearchCard
          canSearch={canSearchOrders}
          description="Pesquise por paciente, CPF, medico, procedimento, prioridade ou observacao. Nada e carregado automaticamente."
          error={orderSearchError}
          isLoading={orderSearchStatus === 'loading'}
          onChange={setOrderSearch}
          onClear={clearOrderSearch}
          onSearch={searchOrders}
          placeholder="Paciente, CPF, exame ou medico"
          resultText={
            hasSearchedOrders && orderSearchStatus === 'ready'
              ? `${orderResults.length} de ${orderResultTotal} pedidos encontrados`
              : undefined
          }
          title="Localize antes de abrir um pedido."
          value={orderSearch}
        />

        <div className="table-shell">
          <div className="table-head exam-orders-grid">
            <span>Paciente</span>
            <span>Solicitante</span>
            <span>Itens</span>
            <span>Status</span>
            <span>Acoes</span>
          </div>

          {!hasSearchedOrders ? (
            <DirectoryState
              code="01"
              title="Nenhum pedido carregado automaticamente."
              description="Use a busca para localizar pedidos existentes ou monte uma nova solicitacao no painel ao lado."
            />
          ) : orderSearchStatus === 'loading' ? (
            <p className="empty-state">Buscando pedidos no banco...</p>
          ) : orderSearchStatus === 'error' ? (
            <p className="empty-state">
              {orderSearchError || 'Nao foi possivel buscar pedidos.'}
            </p>
          ) : orderResults.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhum pedido encontrado."
              description="Confira o termo pesquisado ou crie uma nova solicitacao quando necessario."
            />
          ) : (
            <>
              <p className="result-caption">
                {orderResults.length} de {orderResultTotal} pedidos encontrados
              </p>
              {orderResults.map((order) => (
                <div className="table-row exam-orders-grid" key={order.id}>
                  <span>
                    {order.patient.name}
                    <small>{order.patient.cpf}</small>
                  </span>
                  <span>
                    {order.requesterDoctor?.user.name || 'Nao informado'}
                    <small>
                      {order.requesterDoctor
                        ? `CRM ${order.requesterDoctor.crm}/${order.requesterDoctor.crmUf}`
                        : 'Sem medico solicitante'}
                    </small>
                  </span>
                  <span>
                    {summarizeExamOrderItems(order)}
                    <small>{formatDateTime(order.createdAt)}</small>
                  </span>
                  <span>{examOrderStatusLabel(order.status)}</span>
                  <div className="patient-actions">
                    <button
                      className="mini-button"
                      onClick={() => setSelectedOrderId(order.id)}
                      type="button"
                    >
                      Ficha
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <ResultPagination
          currentPage={orderPage}
          isLoading={orderSearchStatus === 'loading'}
          label="pedidos de exame"
          onPageChange={(page) => void loadOrderPage(page)}
          pageSize={compactPageSize}
          totalItems={orderResultTotal}
        />

        <OperationalModal
          eyebrow="Pedido em foco"
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrderId(null)}
          title={selectedOrder?.patient.name ?? 'Pedido de exames'}
          toneLabel={
            selectedOrder
              ? examOrderStatusLabel(selectedOrder.status)
              : undefined
          }
        >
          {selectedOrder ? (
            <section className="patient-record-card modal-record-card">
              <div className="record-grid">
                <RecordLine
                  label="Paciente"
                  value={selectedOrder.patient.name}
                />
                <RecordLine label="CPF" value={selectedOrder.patient.cpf} />
                <RecordLine
                  label="Solicitante"
                  value={selectedOrder.requesterDoctor?.user.name}
                />
                <RecordLine label="Prioridade" value={selectedOrder.priority} />
                <RecordLine
                  label="Criado em"
                  value={formatDateTime(selectedOrder.createdAt)}
                />
                <RecordLine
                  label="Itens"
                  value={`${selectedOrder.items.length} procedimento(s)`}
                />
              </div>

              <div className="exam-item-list">
                <span className="section-title">Procedimentos solicitados</span>
                {selectedOrder.items.map((item) => (
                  <article className="exam-item-card" key={item.id}>
                    <strong>{item.procedure.description}</strong>
                    <small>
                      {item.procedure.code} -{' '}
                      {procedureTypeLabel(item.procedure.type)}
                    </small>
                    <small>
                      Qtd. {item.quantity}
                      {item.notes ? ` - ${item.notes}` : ''}
                    </small>
                  </article>
                ))}
              </div>

              {selectedOrder.clinicalIndication ? (
                <p className="empty-state compact">
                  {selectedOrder.clinicalIndication}
                </p>
              ) : null}
            </section>
          ) : null}
        </OperationalModal>
      </article>

      <OperationalModal
        eyebrow="Nova solicitacao"
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Montar pedido"
        toneLabel={`${form.items.length} item(ns)`}
      >
        <div className="modal-form-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Nova solicitação</p>
              <h2>Montar pedido</h2>
            </div>
            <span className="inline-badge">{form.items.length} item(ns)</span>
          </div>

          <form
            className="operational-search-card"
            onSubmit={searchPatientsForOrder}
          >
            <div>
              <span className="section-title">Paciente</span>
              <strong>Localize o paciente no banco.</strong>
              <small>Busque por nome, CPF, RG, telefone ou email.</small>
            </div>
            <div className="operational-search-actions">
              <input
                className="search-input"
                placeholder="Digite ao menos 2 caracteres"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
              />
              <button
                className="ghost-button"
                disabled={
                  patientSearchStatus === 'loading' || !canSearchPatient
                }
                type="submit"
              >
                {patientSearchStatus === 'loading' ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  setPatientSearch('');
                  setPatientOptions([]);
                  setForm((current) => ({ ...current, patientId: '' }));
                }}
                type="button"
              >
                Limpar
              </button>
            </div>
          </form>

          {selectedPatient ? (
            <div className="helper-block">
              <span>Paciente selecionado</span>
              <strong>{selectedPatient.name}</strong>
              <small>
                {selectedPatient.cpf} - {selectedPatient.phone}
              </small>
            </div>
          ) : null}

          {patientOptions.length > 0 ? (
            <div className="selection-list">
              {patientOptions.map((patient) => (
                <button
                  className="selection-row"
                  key={patient.id}
                  onClick={() => selectPatient(patient)}
                  type="button"
                >
                  <strong>{patient.name}</strong>
                  <small>
                    {patient.cpf} - {patient.phone}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          <div className="field-grid two-columns">
            <label className="field">
              <span>Medico solicitante</span>
              <select
                value={form.requesterDoctorId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requesterDoctorId: event.target.value,
                  }))
                }
              >
                <option value="">Nao informado</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user.name} - CRM {doctor.crm}/{doctor.crmUf}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridade</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
              >
                <option value="Rotina">Rotina</option>
                <option value="Prioritario">Prioritario</option>
                <option value="Urgente">Urgente</option>
              </select>
            </label>
          </div>

          {selectedDoctor ? (
            <p className="empty-state compact">
              Solicitante: {selectedDoctor.user.name} - CRM {selectedDoctor.crm}
              /{selectedDoctor.crmUf}
            </p>
          ) : null}

          <form
            className="operational-search-card"
            onSubmit={searchProceduresForOrder}
          >
            <div>
              <span className="section-title">Procedimentos</span>
              <strong>Adicione exames ao pedido.</strong>
              <small>Pesquise por codigo, descricao, tabela ou grupo.</small>
            </div>
            <div className="operational-search-actions">
              <input
                className="search-input"
                placeholder="Ex: vitamina, hemograma, raio-x"
                value={procedureSearch}
                onChange={(event) => setProcedureSearch(event.target.value)}
              />
              <button
                className="ghost-button"
                disabled={
                  procedureSearchStatus === 'loading' || !canSearchProcedure
                }
                type="submit"
              >
                {procedureSearchStatus === 'loading' ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  setProcedureSearch('');
                  setProcedureOptions([]);
                }}
                type="button"
              >
                Limpar
              </button>
            </div>
          </form>

          {procedureOptions.length > 0 ? (
            <div className="selection-list">
              {procedureOptions.map((procedure) => (
                <button
                  className="selection-row"
                  disabled={!procedure.active}
                  key={procedure.id}
                  onClick={() => addProcedureToOrder(procedure)}
                  type="button"
                >
                  <strong>{procedure.description}</strong>
                  <small>
                    {procedure.code} - {procedureTypeLabel(procedure.type)}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          <div className="exam-item-list">
            <span className="section-title">Itens do pedido</span>
            {selectedItems.length === 0 ? (
              <DirectoryState
                code="02"
                title="Nenhum exame selecionado."
                description="Busque a tabela de procedimentos e adicione os itens que farão parte da solicitação."
              />
            ) : (
              selectedItems.map((item) => (
                <article className="exam-item-card" key={item.procedureId}>
                  <strong>
                    {item.procedure?.description || 'Procedimento selecionado'}
                  </strong>
                  <small>
                    {item.procedure
                      ? `${item.procedure.code} - ${procedureTypeLabel(
                          item.procedure.type,
                        )}`
                      : item.procedureId}
                  </small>
                  <div className="field-grid two-columns">
                    <label className="field">
                      <span>Quantidade</span>
                      <input
                        min={1}
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateOrderItem(item.procedureId, {
                            quantity: Number(event.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Observacao do item</span>
                      <input
                        value={item.notes}
                        onChange={(event) =>
                          updateOrderItem(item.procedureId, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="mini-button"
                    onClick={() => removeOrderItem(item.procedureId)}
                    type="button"
                  >
                    Remover item
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Indicação clínica</span>
              <textarea
                value={form.clinicalIndication}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clinicalIndication: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Observações gerais</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          {formError ? (
            <p className="empty-state compact">{formError}</p>
          ) : null}

          <button
            className="primary-button"
            disabled={isSavingOrder || !canSaveOrder}
            onClick={saveExamOrder}
            type="button"
          >
            {isSavingOrder
              ? 'Salvando...'
              : canSaveOrder
                ? 'Salvar pedido de exames'
                : 'Selecione paciente e exames'}
          </button>
        </div>
      </OperationalModal>
    </section>
  );
}

type EmergencyCarePageProps = {
  appointments: Appointment[];
  canManageCare: boolean;
  doctors: Doctor[];
  isSubmitting: boolean;
  nurses: Nurse[];
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  patients: Patient[];
  sessionToken: string;
  sectors: Sector[];
};

function EmergencyCarePage({
  appointments,
  canManageCare,
  doctors,
  isSubmitting,
  nurses,
  onSaveCareRecord,
  patients,
  sessionToken,
  sectors,
}: EmergencyCarePageProps) {
  const paSector = sectors.find((sector) => sector.code === 'PA') ?? null;
  const paDoctors = doctors.filter((doctor) =>
    professionalInSector(doctor, 'PA', paSector?.id),
  );
  const paNurses = nurses.filter((nurse) =>
    professionalInSector(nurse, 'PA', paSector?.id),
  );
  const paAppointments = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => isEmergencyAppointment(appointment, doctors))
        .sort(sortByAppointmentDate),
    [appointments, doctors],
  );
  const missingCount = paAppointments.filter(
    (appointment) => appointment.status === 'NAO_COMPARECEU',
  ).length;

  return (
    <>
      <section className="context-band care-context-band">
        <article className="context-card">
          <span>Setor PA</span>
          <strong>{paSector?.name ?? 'Pronto Atendimento'}</strong>
          <small>
            {paSector ? 'setor configurado' : 'rode o seed foundation'}
          </small>
        </article>
        <article className="context-card">
          <span>Equipe vinculada</span>
          <strong>{paDoctors.length + paNurses.length}</strong>
          <small>
            {paDoctors.length} med. / {paNurses.length} enf.
          </small>
        </article>
        <article className="context-card">
          <span>Ausencias PA</span>
          <strong>{missingCount}</strong>
          <small>controle da fila de urgencia</small>
        </article>
      </section>

        <CarePage
          appointments={paAppointments}
          canManageCare={canManageCare}
          emptyMessage="Nenhum atendimento de PA visivel. Crie uma entrada como URGENCIA ou vincule o medico ao setor PA."
          eyebrow="Consultorio PA"
          focusEyebrow="Paciente em atendimento PA"
          initiallyShowQueue
          isSubmitting={isSubmitting}
          modalVariant="consultorio"
          onSaveCareRecord={onSaveCareRecord}
        openAppointmentsInNewTab
        patients={patients}
        queueActionLabel="Abrir atendimento PA"
        sessionToken={sessionToken}
        statusEyebrow="Leitura PA"
        statusTitle="Conduta, chamada e desfecho"
        title="Consultorio do pronto atendimento"
      />
    </>
  );
}

type EmergencyOperationalMode =
  | 'reception'
  | 'nursing'
  | 'orders'
  | 'dispensation'
  | 'exams'
  | 'imaging';

type EmergencyOperationalPageProps = {
  appointments: Appointment[];
  doctors: Doctor[];
  isSubmitting: boolean;
  mode: EmergencyOperationalMode;
  nurses: Nurse[];
  onCreateEmergencyEntry: (payload: EmergencyEntryPayload) => Promise<void>;
  patients: Patient[];
  sectors: Sector[];
  sessionToken: string | null;
};

const emergencyOperationalCopy: Record<
  EmergencyOperationalMode,
  {
    actionLabel: string;
    eyebrow: string;
    highlight: string;
    steps: Array<{ detail: string; label: string }>;
    title: string;
    subtitle: string;
  }
> = {
  reception: {
    actionLabel: 'Abrir nova entrada PA',
    eyebrow: 'Recepcao PA',
    highlight: 'Entrada, identificacao e abertura do atendimento',
    subtitle:
      'Recepcao localiza o paciente, abre a passagem de urgencia e encaminha para triagem.',
    title: 'Porta de entrada do pronto atendimento',
    steps: [
      {
        label: 'Localizar paciente',
        detail: 'Buscar ou cadastrar paciente antes de criar a ficha PA.',
      },
      {
        label: 'Abrir atendimento',
        detail: 'Criar passagem como urgencia e registrar motivo inicial.',
      },
      {
        label: 'Encaminhar fila',
        detail: 'Enviar para triagem, consultorio PA ou exames conforme fluxo.',
      },
    ],
  },
  nursing: {
    actionLabel: 'Abrir fila do PA',
    eyebrow: 'Triagem PA',
    highlight: 'Sinais vitais, classificacao e evolucao inicial',
    subtitle:
      'Triagem recebe o paciente aberto pela recepcao, registra sinais, classifica prioridade e encaminha para o consultorio PA.',
    title: 'Triagem do pronto atendimento',
    steps: [
      {
        label: 'Chamar paciente',
        detail: 'Selecionar atendimento aberto pela recepcao.',
      },
      {
        label: 'Registrar sinais',
        detail: 'Pressao, temperatura, dor, queixa e classificacao inicial.',
      },
      {
        label: 'Evoluir conduta',
        detail: 'Manter historico assistencial ate alta ou transferencia.',
      },
    ],
  },
  orders: {
    actionLabel: 'Abrir pedidos de exames',
    eyebrow: 'Pedidos PA',
    highlight: 'Pedidos de exames e medicamentos vinculados ao PA',
    subtitle:
      'Medico do PA solicita exames, registra medicamentos e deixa a demanda pronta para execucao, dispensacao e cobranca.',
    title: 'Pedidos de exames e medicamentos',
    steps: [
      {
        label: 'Selecionar atendimento',
        detail: 'Abrir o paciente do consultorio PA antes de solicitar.',
      },
      {
        label: 'Solicitar exames',
        detail: 'Criar pedido de exames, imagem ou ambulatoriais.',
      },
      {
        label: 'Prescrever medicacao',
        detail: 'Medicamentos prescritos seguem para dispensacao medica.',
      },
    ],
  },
  dispensation: {
    actionLabel: 'Conferir prescricoes',
    eyebrow: 'Dispensacao PA',
    highlight: 'Medicacao vinculada ao atendimento medico do PA',
    subtitle:
      'Farmacia visualiza prescricoes do PA, controla status de separacao e prepara baixa no estoque.',
    title: 'Dispensacao medica do pronto atendimento',
    steps: [
      {
        label: 'Receber prescricao',
        detail: 'Medicamentos salvos pelo medico aparecem para conferencia.',
      },
      {
        label: 'Separar medicamento',
        detail: 'Registrar preparo, lote e profissional responsavel.',
      },
      {
        label: 'Dar baixa futura',
        detail: 'Vincular dispensacao ao estoque quando o modulo estiver ativo.',
      },
    ],
  },
  exams: {
    actionLabel: 'Abrir pedidos de exame',
    eyebrow: 'Exames PA',
    highlight: 'Pedidos, coleta, laudos e retorno para conduta',
    subtitle:
      'Exames ambulatoriais do PA ficam organizados por solicitacao, execucao, resultado e cobranca.',
    title: 'Exames ambulatoriais e laudos do PA',
    steps: [
      {
        label: 'Receber pedido',
        detail: 'Pedido medico entra pela tela de pedidos de exames.',
      },
      {
        label: 'Executar/coletar',
        detail: 'Registrar coleta, realizacao ou pendencia assistencial.',
      },
      {
        label: 'Liberar resultado',
        detail: 'Laudo retorna para conduta e segue para faturamento.',
      },
    ],
  },
  imaging: {
    actionLabel: 'Abrir laudos',
    eyebrow: 'Imagem PA',
    highlight: 'Exames de imagem solicitados pelo PA',
    subtitle:
      'Imagem PA acompanha solicitacao, realizacao, laudo e retorno do resultado para a conduta medica.',
    title: 'Exames de imagem do pronto atendimento',
    steps: [
      {
        label: 'Receber pedido',
        detail: 'Pedido de imagem nasce no consultorio PA ou nos pedidos.',
      },
      {
        label: 'Acompanhar realizacao',
        detail: 'Controlar pendencia, sala/equipamento e status do exame.',
      },
      {
        label: 'Liberar laudo',
        detail: 'Resultado volta ao atendimento e segue para faturamento.',
      },
    ],
  },
};

function EmergencyOperationalPage({
  appointments,
  doctors,
  isSubmitting,
  mode,
  nurses,
  onCreateEmergencyEntry,
  patients,
  sectors,
  sessionToken,
}: EmergencyOperationalPageProps) {
  const navigate = useNavigate();
  const copy = emergencyOperationalCopy[mode];
  const paSector = sectors.find((sector) => sector.code === 'PA') ?? null;
  const paDoctors = doctors.filter((doctor) =>
    professionalInSector(doctor, 'PA', paSector?.id),
  );
  const paNurses = nurses.filter((nurse) =>
    professionalInSector(nurse, 'PA', paSector?.id),
  );
  const paAppointments = [...appointments]
    .filter((appointment) => isEmergencyAppointment(appointment, doctors))
    .sort(sortByAppointmentDate);
  const waitingAppointments = paAppointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  );
  const prescribedAppointments = paAppointments.filter((appointment) =>
    appointment.prescription?.trim(),
  );
  const completedAppointments = paAppointments.filter(
    (appointment) => appointment.status === 'REALIZADA',
  );
  const missingAppointments = paAppointments.filter(
    (appointment) => appointment.status === 'NAO_COMPARECEU',
  );
  const [isEmergencyEntryOpen, setIsEmergencyEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<EmergencyEntryPayload>({
    agreement: '',
    classification: '',
    doctorId: '',
    initialProcedure: '',
    internalNotes: '',
    medicationMaterial: '',
    notes: '',
    paymentMethod: '',
    patientId: '',
    plan: '',
    requester: '',
    socialName: '',
    tax: '',
  });
  const [entryPatientSearch, setEntryPatientSearch] = useState('');
  const [entryPatientResults, setEntryPatientResults] = useState<Patient[]>(
    [],
  );
  const [entryPatientSearchStatus, setEntryPatientSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [entryPatientSearchError, setEntryPatientSearchError] = useState('');
  const [entryDoctorSearch, setEntryDoctorSearch] = useState('');
  const deferredEntryPatientSearch = useDeferredValue(
    entryPatientSearch.trim().toLowerCase(),
  );
  const deferredEntryDoctorSearch = useDeferredValue(
    entryDoctorSearch.trim().toLowerCase(),
  );
  const activePatients = patients.filter(isPatientActive);
  const visibleEntryPatients = useMemo(() => {
    const registry = new Map<string, Patient>();
    const hasSearch = deferredEntryPatientSearch.length >= 2;

    if (hasSearch) {
      activePatients
        .filter((patient) =>
          [patient.name, patient.cpf, patient.phone, patient.email]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(deferredEntryPatientSearch),
        )
        .forEach((patient) => registry.set(patient.id, patient));
      entryPatientResults
        .filter(isPatientActive)
        .forEach((patient) => registry.set(patient.id, patient));
    }

    const selectedPatient = patients.find(
      (patient) => patient.id === entryForm.patientId,
    );

    if (selectedPatient) {
      registry.set(selectedPatient.id, selectedPatient);
    }

    return Array.from(registry.values()).slice(0, 10);
  }, [
    activePatients,
    deferredEntryPatientSearch,
    entryForm.patientId,
    entryPatientResults,
    patients,
  ]);
  const visibleEntryDoctors = paDoctors.filter((doctor) => {
    if (doctor.id === entryForm.doctorId) {
      return true;
    }

    if (deferredEntryDoctorSearch.length < 2) {
      return false;
    }

    return [
      doctor.user.name,
      doctor.crm,
      doctor.crmUf,
      doctor.specialties.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(deferredEntryDoctorSearch);
  });
  const selectedEntryDoctor =
    doctors.find((doctor) => doctor.id === entryForm.doctorId) ?? null;
  const selectedEntryPatient =
    patients.find((patient) => patient.id === entryForm.patientId) ??
    entryPatientResults.find((patient) => patient.id === entryForm.patientId) ??
    null;
  const canCreateEmergencyEntry =
    Boolean(entryForm.patientId) && Boolean(entryForm.doctorId);
  const visibleAppointments =
    mode === 'dispensation'
      ? prescribedAppointments
      : mode === 'exams' || mode === 'orders' || mode === 'imaging'
        ? paAppointments.filter(
            (appointment) =>
              appointment.notes?.toLowerCase().includes('exame') ||
              appointment.diagnosis?.toLowerCase().includes('exame') ||
              appointment.type === 'URGENCIA',
          )
        : paAppointments;
  const primaryLink =
    mode === 'exams' || mode === 'orders'
      ? '/pa-pedidos'
      : mode === 'imaging'
        ? '/pa-imagem'
      : mode === 'dispensation'
        ? '/pa-dispensacao-medica'
        : '/pronto-atendimento';

  useEffect(() => {
    const searchTerm = entryPatientSearch.trim();

    if (searchTerm.length < 2 || !sessionToken) {
      setEntryPatientResults([]);
      setEntryPatientSearchStatus('idle');
      setEntryPatientSearchError('');
      return;
    }

    let isActive = true;
    setEntryPatientSearchStatus('loading');
    setEntryPatientSearchError('');

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiRequest<PaginatedResponse<Patient>>(
          `/patients?page=1&limit=10&q=${encodeURIComponent(searchTerm)}`,
          { token: sessionToken },
        );

        if (!isActive) {
          return;
        }

        setEntryPatientResults(response.data ?? []);
        setEntryPatientSearchStatus('ready');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setEntryPatientResults([]);
        setEntryPatientSearchStatus('error');
        setEntryPatientSearchError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel buscar pacientes.',
        );
      }
    }, 280);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [entryPatientSearch, sessionToken]);

  function selectEntryPatient(patient: Patient) {
    setEntryForm((current) => ({
      ...current,
      patientId: patient.id,
    }));
    setEntryPatientSearch(formatPatientSearchLabel(patient));
  }

  function openPatientRegistration() {
    setIsEmergencyEntryOpen(false);
    navigate('/pacientes', {
      state: { initialSearch: entryPatientSearch.trim() },
    });
  }

  async function submitEmergencyEntry(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canCreateEmergencyEntry) {
      return;
    }

    await onCreateEmergencyEntry(entryForm);
    setEntryForm({
      agreement: '',
      classification: '',
      doctorId: '',
      initialProcedure: '',
      internalNotes: '',
      medicationMaterial: '',
      notes: '',
      paymentMethod: '',
      patientId: '',
      plan: '',
      requester: '',
      socialName: '',
      tax: '',
    });
    setEntryDoctorSearch('');
    setEntryPatientSearch('');
    setIsEmergencyEntryOpen(false);
  }

  return (
    <>
      <section className="pa-workspace">
      <article className="panel pa-hero-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
            <small>{copy.subtitle}</small>
          </div>
          <span className="inline-badge">{copy.highlight}</span>
        </div>

        <div className="summary-strip pa-summary-strip">
          <article className="summary-card">
            <span>Fila PA</span>
            <strong>{paAppointments.length}</strong>
            <small>passagens abertas ou historicas</small>
          </article>
          <article className="summary-card">
            <span>Aguardando</span>
            <strong>{waitingAppointments.length}</strong>
            <small>para triagem ou atendimento</small>
          </article>
          <article className="summary-card">
            <span>Prescricoes</span>
            <strong>{prescribedAppointments.length}</strong>
            <small>pendentes de dispensacao</small>
          </article>
          <article className="summary-card">
            <span>Equipe PA</span>
            <strong>{paDoctors.length + paNurses.length}</strong>
            <small>
              {paDoctors.length} med. / {paNurses.length} enf.
            </small>
          </article>
        </div>
      </article>

      <section className="page-grid pa-flow-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Fluxo do setor</p>
              <h2>Como esta aba deve trabalhar</h2>
            </div>
          </div>

          <div className="pa-stage-grid">
            {copy.steps.map((step, index) => (
              <article className="pa-stage-card" key={step.label}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>

          <div className="pa-action-grid">
            {mode === 'reception' ? (
              <button
                className="primary-button"
                onClick={() => setIsEmergencyEntryOpen(true)}
                type="button"
              >
                {copy.actionLabel}
              </button>
            ) : (
              <NavLink className="primary-button" to={primaryLink}>
                {copy.actionLabel}
              </NavLink>
            )}
            <NavLink className="ghost-button" to="/pronto-atendimento">
              Ver fila medica PA
            </NavLink>
            <NavLink className="ghost-button" to="/pa-imagem">
              Laudos e resultados
            </NavLink>
          </div>
        </article>

        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Leitura operacional</p>
              <h2>Fila relacionada</h2>
              <small>
                Apenas uma visao do PA. A abertura completa continua em modal
                na fila medica.
              </small>
            </div>
            <span className="inline-badge">
              {visibleAppointments.length} registros
            </span>
          </div>

          <div className="list-shell pa-queue-preview">
            {visibleAppointments.length === 0 ? (
              <DirectoryState
                code="PA"
                title="Nenhum item para este setor."
                description="Quando houver entrada, prescricao ou pedido do PA, o setor passa a visualizar aqui."
              />
            ) : (
              visibleAppointments.slice(0, 8).map((appointment) => (
                <div className="list-row" key={appointment.id}>
                  <div>
                    <strong>{appointment.patient.name}</strong>
                    <span>
                      {formatDateTime(appointment.appointmentDate)} -{' '}
                      {appointment.doctor.user.name}
                    </span>
                  </div>
                  <div>
                    <span>{humanizeEnum(appointment.status)}</span>
                    <small>{humanizeEnum(appointment.type)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="page-grid pa-status-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Pendencias assistenciais</p>
              <h2>Controle rapido</h2>
            </div>
          </div>

          <div className="list-shell">
            <div className="list-row">
              <div>
                <strong>Triagem pendente</strong>
                <span>pacientes aguardando avaliacao inicial</span>
              </div>
              <div>
                <span>{waitingAppointments.length}</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>Medicacao para conferir</strong>
                <span>prescricoes vinculadas ao PA</span>
              </div>
              <div>
                <span>{prescribedAppointments.length}</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>Atendimentos encerrados</strong>
                <span>passagens finalizadas</span>
              </div>
              <div>
                <span>{completedAppointments.length}</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>Ausencias</strong>
                <span>pacientes que nao compareceram</span>
              </div>
              <div>
                <span>{missingAppointments.length}</span>
              </div>
            </div>
          </div>
        </article>

        <article className="panel pa-next-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Proximo encaixe tecnico</p>
              <h2>O que ainda vira banco</h2>
            </div>
          </div>

          <div className="pa-stage-grid compact">
            <article className="pa-stage-card">
              <span>EV</span>
              <strong>Evolucao assistencial</strong>
              <p>Modelar evolucoes por horario, usuario e atendimento.</p>
            </article>
            <article className="pa-stage-card">
              <span>RX</span>
              <strong>Pedidos e laudos</strong>
              <p>Vincular exames executados ao faturamento e ao prontuario.</p>
            </article>
            <article className="pa-stage-card">
              <span>MD</span>
              <strong>Dispensacao</strong>
              <p>Baixa real por lote quando estoque estiver parametrizado.</p>
            </article>
          </div>
        </article>
      </section>
      </section>

      <OperationalModal
        eyebrow="Recepcao PA"
        isOpen={mode === 'reception' && isEmergencyEntryOpen}
        onClose={() => setIsEmergencyEntryOpen(false)}
        size="expanded"
        title="Entrada imediata no pronto atendimento"
        toneLabel="Sem agendamento"
      >
        <form className="modal-form-panel" onSubmit={submitEmergencyEntry}>
          <div className="page-header">
            <div>
              <p className="eyebrow">Entrada PA</p>
              <h2>Abrir atendimento agora</h2>
              <small>
                Esta entrada nasce no P.A, vai para triagem e nao passa pela
                agenda eletiva.
              </small>
            </div>
            <span className="inline-badge">AGUARDANDO TRIAGEM</span>
          </div>

          <div className="pa-entry-layout">
            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Dados do atendimento</h3>
                <span className="inline-badge">Ficha PA</span>
              </div>

              <div className="field-grid two-columns">
                <label className="field">
                  <span>Empresa</span>
                  <input value="HOSPITAL REVITALITE" readOnly />
                </label>
                <label className="field">
                  <span>Data / hora</span>
                  <input value="Gerada automaticamente" readOnly />
                </label>
                <label className="field">
                  <span>Buscar paciente</span>
                  <input
                    onChange={(event) => {
                      const value = event.target.value;
                      setEntryPatientSearch(value);

                      if (entryForm.patientId) {
                        setEntryForm((current) => ({
                          ...current,
                          patientId: '',
                        }));
                      }
                    }}
                    placeholder="Nome, CPF, telefone ou email"
                    value={entryPatientSearch}
                  />
                </label>
                <div className="field">
                  <span>Paciente localizado</span>
                  <input
                    readOnly
                    value={
                      selectedEntryPatient
                        ? formatPatientSearchLabel(selectedEntryPatient)
                        : 'Selecione na busca inteligente'
                    }
                  />
                </div>
                <div className="smart-search-panel full-row">
                  {entryPatientSearch.trim().length < 2 ? (
                    <span className="smart-search-hint">
                      Digite pelo menos 2 caracteres para consultar o cadastro.
                    </span>
                  ) : (
                    <>
                      <div className="smart-search-status">
                        {entryPatientSearchStatus === 'loading'
                          ? 'Buscando no banco de dados...'
                          : entryPatientSearchStatus === 'error'
                            ? entryPatientSearchError
                            : `${visibleEntryPatients.length} paciente(s) encontrado(s)`}
                      </div>
                      {visibleEntryPatients.length > 0 ? (
                        <div className="smart-search-results">
                          {visibleEntryPatients.map((patient) => (
                            <button
                              className="smart-search-option"
                              key={patient.id}
                              onClick={() => selectEntryPatient(patient)}
                              type="button"
                            >
                              <strong>{patient.name}</strong>
                              <span>
                                {formatPatientBirthDate(patient.birthDate)} - CPF{' '}
                                {patient.cpf || 'sem CPF'}
                              </span>
                              <small>
                                {patient.phone || 'sem telefone'}
                                {patient.email ? ` - ${patient.email}` : ''}
                              </small>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <button
                        className="ghost-button smart-search-new"
                        onClick={openPatientRegistration}
                        type="button"
                      >
                        Cadastrar novo paciente
                      </button>
                    </>
                  )}
                </div>
                <label className="field">
                  <span>Convênio</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        agreement: event.target.value,
                      }))
                    }
                    placeholder="Particular, Unimed, SC Saude..."
                    value={entryForm.agreement}
                  />
                </label>
                <label className="field">
                  <span>Plano</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        plan: event.target.value,
                      }))
                    }
                    placeholder="Plano/categoria"
                    value={entryForm.plan}
                  />
                </label>
                <label className="field">
                  <span>Buscar médico PA</span>
                  <input
                    onChange={(event) =>
                      setEntryDoctorSearch(event.target.value)
                    }
                    placeholder="Nome, CRM ou especialidade"
                    value={entryDoctorSearch}
                  />
                </label>
                <label className="field">
                  <span>Profissional responsável</span>
                  <select
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        doctorId: event.target.value,
                      }))
                    }
                    value={entryForm.doctorId}
                  >
                    <option value="">Selecione o médico</option>
                    {visibleEntryDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.user.name} - CRM {doctor.crm}/{doctor.crmUf}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Especialidade</span>
                  <input
                    value={
                      selectedEntryDoctor?.specialties.join(', ') ||
                      'PRONTO ATENDIMENTO'
                    }
                    readOnly
                  />
                </label>
                <label className="field">
                  <span>Classificação recepção</span>
                  <select
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        classification: event.target.value,
                      }))
                    }
                    value={entryForm.classification}
                  >
                    <option value="">Selecione</option>
                    <option value="ROTINA_PA">Rotina PA</option>
                    <option value="PRIORIDADE_ADMINISTRATIVA">
                      Prioridade administrativa
                    </option>
                    <option value="ACIDENTE_TRAUMA">Acidente/trauma</option>
                    <option value="SINTOMA_RESPIRATORIO">
                      Sintoma respiratório
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Observações e controle</h3>
                <span className="inline-badge">Atendente logado</span>
              </div>

              <div className="field-grid two-columns">
                <label className="field">
                  <span>Obs. interna</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        internalNotes: event.target.value,
                      }))
                    }
                    placeholder="Observação interna da recepção"
                    value={entryForm.internalNotes}
                  />
                </label>
                <label className="field">
                  <span>Profissional requisitante</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        requester: event.target.value,
                      }))
                    }
                    placeholder="Quando houver"
                    value={entryForm.requester}
                  />
                </label>
                <label className="field">
                  <span>Razão social / responsável financeiro</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        socialName: event.target.value,
                      }))
                    }
                    placeholder="Particular ou empresa"
                    value={entryForm.socialName}
                  />
                </label>
                <label className="field">
                  <span>Senha painel</span>
                  <input value="Gerada após salvar" readOnly />
                </label>
                <label className="field full-row">
                  <span>Queixa inicial / observação da recepção</span>
                  <textarea
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Ex.: dor abdominal, febre, queda, falta de ar..."
                    value={entryForm.notes}
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="pa-entry-ledger">
            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Procedimentos</h3>
                <span className="inline-badge">0</span>
              </div>
              <div className="field-grid two-columns">
                <label className="field">
                  <span>Procedimento inicial</span>
                  <input
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        initialProcedure: event.target.value,
                      }))
                    }
                    placeholder="Consulta PA, taxa, procedimento..."
                    value={entryForm.initialProcedure}
                  />
                </label>
                <label className="field">
                  <span>Valor / tabela</span>
                  <input placeholder="Será calculado pelo faturamento" readOnly />
                </label>
              </div>
            </section>

            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Materiais e medicamentos</h3>
                <span className="inline-badge">0</span>
              </div>
              <input
                className="soft-input"
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    medicationMaterial: event.target.value,
                  }))
                }
                placeholder="Material/medicamento inicial, se houver"
                value={entryForm.medicationMaterial}
              />
            </section>

            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Taxas</h3>
                <span className="inline-badge">0</span>
              </div>
              <input
                className="soft-input"
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    tax: event.target.value,
                  }))
                }
                placeholder="Taxa de sala, taxa PA, observação financeira"
                value={entryForm.tax}
              />
            </section>

            <section className="pa-entry-section">
              <div className="section-title-row">
                <h3>Pagamentos</h3>
                <span className="inline-badge">Pendente</span>
              </div>
              <div className="field-grid two-columns">
                <label className="field">
                  <span>Forma pagamento</span>
                  <select
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value,
                      }))
                    }
                    value={entryForm.paymentMethod}
                  >
                    <option value="">Definir depois</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="CONVENIO">Convênio/faturamento</option>
                  </select>
                </label>
                <label className="field">
                  <span>Valor total</span>
                  <input value="Calculado após itens" readOnly />
                </label>
              </div>
            </section>
          </div>

          <div className="helper-block">
            <strong>Fluxo criado ao salvar</strong>
            <span>
              Atendimento de urgencia com entrada imediata, identificado como
              PA e encaminhado para a fila de triagem.
            </span>
          </div>

          <button
            className="primary-button"
            disabled={!canCreateEmergencyEntry || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Abrindo entrada...' : 'Abrir entrada PA agora'}
          </button>
        </form>
      </OperationalModal>
    </>
  );
}

type DoctorOfficePageProps = {
  appointments: Appointment[];
  canManageCare: boolean;
  doctors: Doctor[];
  isSubmitting: boolean;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  patients: Patient[];
  profile: UserProfile;
  sessionToken: string;
};

function DoctorOfficePage({
  appointments,
  canManageCare,
  doctors,
  isSubmitting,
  onSaveCareRecord,
  patients,
  profile,
  sessionToken,
}: DoctorOfficePageProps) {
  const currentDoctor =
    profile.role === 'MEDICO'
      ? (doctors.find((doctor) => doctor.userId === profile.id) ?? null)
      : null;
  const officeAppointments = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => !isEmergencyAppointment(appointment, doctors))
        .filter((appointment) =>
          currentDoctor ? appointment.doctor.id === currentDoctor.id : true,
        )
        .sort(sortByAppointmentDate),
    [appointments, currentDoctor, doctors],
  );
  const todayCount = officeAppointments.filter((appointment) =>
    isSameLocalDate(appointment.appointmentDate),
  ).length;

  return (
    <>
      <section className="context-band care-context-band">
        <article className="context-card">
          <span>Agenda</span>
          <strong>{currentDoctor ? 'Minha agenda' : 'Todos os medicos'}</strong>
          <small>{officeAppointments.length} consultas visiveis</small>
        </article>
        <article className="context-card">
          <span>Hoje</span>
          <strong>{todayCount}</strong>
          <small>consultas nesta data</small>
        </article>
        <article className="context-card">
          <span>Perfil</span>
          <strong>{profile.role}</strong>
          <small>{profile.name}</small>
        </article>
      </section>

      <CarePage
        appointments={officeAppointments}
        canManageCare={canManageCare}
        emptyMessage="Nenhuma consulta de consultorio encontrada para este filtro."
        eyebrow="Consultorio"
        focusEyebrow="Paciente em consulta"
        initiallyShowQueue
        isSubmitting={isSubmitting}
        modalVariant="consultorio"
        onSaveCareRecord={onSaveCareRecord}
        patients={patients}
        queueActionLabel="Abrir consultorio"
        sessionToken={sessionToken}
        statusEyebrow="Evolucao medica"
        statusTitle="Conduta, prescricao e fechamento"
        title="Fila medica do consultorio"
      />
    </>
  );
}

type PharmacyPageProps = {
  appointments: Appointment[];
  nurses: Nurse[];
  sectors: Sector[];
};

function PharmacyPage({ appointments, nurses, sectors }: PharmacyPageProps) {
  const pharmacySector =
    sectors.find((sector) => sector.code === 'FARM') ?? null;
  const stockSector = sectors.find((sector) => sector.code === 'EST') ?? null;
  const pharmacyTeam = nurses.filter((nurse) =>
    professionalInSector(nurse, 'FARM', pharmacySector?.id),
  );
  const prescriptions = [...appointments]
    .filter((appointment) => appointment.prescription?.trim())
    .sort(sortByAppointmentDate);

  return (
    <section className="pharmacy-workspace">
      <div className="overview-stat-strip pharmacy-stat-strip">
        <article className="overview-stat-card clinical">
          <span>Prescricoes</span>
          <strong>{prescriptions.length}</strong>
          <small>condutas registradas</small>
        </article>
        <article className="overview-stat-card assist">
          <span>Equipe farmacia</span>
          <strong>{pharmacyTeam.length}</strong>
          <small>profissionais vinculados</small>
        </article>
        <article className="overview-stat-card success">
          <span>Setor farmacia</span>
          <strong>{pharmacySector ? 'OK' : '--'}</strong>
          <small>base organizacional</small>
        </article>
        <article className="overview-stat-card mail">
          <span>Estoque</span>
          <strong>{stockSector ? 'OK' : '--'}</strong>
          <small>vinculo para baixa futura</small>
        </article>
      </div>

      <section className="page-grid pharmacy-grid">
        <article className="panel pharmacy-dispensation-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Farmacia</p>
              <h2>Dispensacao por prescricao</h2>
              <small>
                Medicamentos prescritos no atendimento aparecem aqui para
                conferencia, dispensacao e baixa futura no estoque.
              </small>
            </div>
            <span className="inline-badge">ligada ao atendimento</span>
          </div>

          <div className="list-shell">
            {prescriptions.length === 0 ? (
              <p className="empty-state">
                Nenhuma prescricao registrada ainda. Quando o atendimento salvar
                uma conduta, ela aparece aqui para dispensacao.
              </p>
            ) : (
              prescriptions.map((appointment) => (
                <div className="list-row" key={appointment.id}>
                  <div>
                    <strong>{appointment.patient.name}</strong>
                    <span>
                      {appointment.prescription} -{' '}
                      {formatDateTime(appointment.appointmentDate)}
                    </span>
                  </div>
                  <div>
                    <span>{humanizeEnum(appointment.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Estoque relacionado</p>
                <h2>Proximo encaixe tecnico</h2>
              </div>
            </div>

            <div className="list-shell action-list-shell">
              <NavLink className="list-row action-row-link" to="/medicamentos">
                <div>
                  <strong>Medicamentos</strong>
                  <span>cadastro, principio ativo, concentracao e unidade</span>
                </div>
                <div>
                  <span>modelo</span>
                </div>
              </NavLink>
              <NavLink className="list-row action-row-link" to="/estoque-lotes">
                <div>
                  <strong>Lotes e validade</strong>
                  <span>entrada de estoque e rastreio por lote</span>
                </div>
                <div>
                  <span>modelo</span>
                </div>
              </NavLink>
              <NavLink
                className="list-row action-row-link"
                to="/tabelas-medicamentos"
              >
                <div>
                  <strong>Tabelas de medicamentos</strong>
                  <span>valores negociados para farmacia e materiais</span>
                </div>
                <div>
                  <span>novo</span>
                </div>
              </NavLink>
              <div className="list-row muted-row">
                <div>
                  <strong>Baixa por dispensacao</strong>
                  <span>ligar prescricao ao consumo real do estoque</span>
                </div>
                <div>
                  <span>proximo</span>
                </div>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Equipe</p>
                <h2>Farmacia hospitalar</h2>
              </div>
            </div>
            <div className="list-shell">
              {pharmacyTeam.length === 0 ? (
                <p className="empty-state compact">
                  Nenhum profissional vinculado ao setor Farmacia ainda.
                </p>
              ) : (
                pharmacyTeam.map((nurse) => (
                  <div className="list-row" key={nurse.id}>
                    <div>
                      <strong>{nurse.user.name}</strong>
                      <span>
                        COREN {nurse.coren}/{nurse.corenUf}
                      </span>
                    </div>
                    <div>
                      <span>{nurse.shift || 'Plantao nao informado'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}

function sortByAppointmentDate(left: Appointment, right: Appointment) {
  return (
    new Date(left.appointmentDate).getTime() -
    new Date(right.appointmentDate).getTime()
  );
}

function professionalInSector(
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

function getAppointmentSector(appointment: Appointment, doctors: Doctor[]) {
  return (
    appointment.doctor.sector ??
    doctors.find((doctor) => doctor.id === appointment.doctor.id)?.sector ??
    null
  );
}

function isEmergencyAppointment(appointment: Appointment, doctors: Doctor[]) {
  return (
    appointment.type === 'URGENCIA' ||
    getAppointmentSector(appointment, doctors)?.code === 'PA'
  );
}

function isSameLocalDate(value: string) {
  const target = new Date(value);
  const today = new Date();

  return (
    target.getFullYear() === today.getFullYear() &&
    target.getMonth() === today.getMonth() &&
    target.getDate() === today.getDate()
  );
}

function paginateRecords<T>(records: T[], page: number, pageSize: number) {
  const start = (Math.max(page, 1) - 1) * pageSize;

  return records.slice(start, start + pageSize);
}

function auditActionLabel(action: AuditAction) {
  switch (action) {
    case 'CREATE':
      return 'Criacao';
    case 'UPDATE':
      return 'Alteracao';
    case 'DELETE':
      return 'Exclusao';
    default:
      return 'Leitura';
  }
}

function auditActorName(log: AuditLog) {
  return log.actor?.name ?? log.actor?.username ?? 'Usuario nao identificado';
}

function auditPurposeLabel(purpose?: string) {
  switch (purpose) {
    case 'assistencial':
      return 'Assistencial';
    case 'faturamento':
      return 'Faturamento';
    case 'administrativo':
      return 'Administrativo';
    default:
      return 'Operacional';
  }
}

function auditResourceLabel(resource: string) {
  const option = auditResourceOptions.find((item) => item.value === resource);

  return option?.label ?? humanizeEnum(resource.replaceAll('-', '_'));
}

function auditStatusLabel(statusCode?: number | null) {
  if (!statusCode) {
    return 'Sem retorno';
  }

  if (statusCode >= 500) {
    return 'Erro servidor';
  }

  if (statusCode >= 400) {
    return 'Bloqueado/erro';
  }

  return 'Concluido';
}

function isSensitiveAuditLog(log: AuditLog) {
  return (
    log.metadata?.lgpd?.sensitiveData === true ||
    ['patients', 'exam-orders', 'appointments', 'auth'].includes(log.resource)
  );
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '').replaceAll('"', '""');

  return `"${text}"`;
}

function matchUser(user: UserProfile, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    user.name,
    user.username,
    user.email,
    user.role,
    roleLabel(user.role),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function createPatientPayload(form: PatientFormState) {
  return {
    ...form,
    cpf: normalizeDigits(form.cpf),
    bloodType: form.bloodType || undefined,
    email: form.email || undefined,
    rg: form.rg || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    zipCode: form.zipCode || undefined,
    emergencyContact: form.emergencyContact || undefined,
    emergencyPhone: form.emergencyPhone || undefined,
    allergies: form.allergies || undefined,
    medicalHistory: form.medicalHistory || undefined,
    blockReason:
      form.status === 'BLOCKED' ? form.blockReason || undefined : undefined,
    documents: parseDocumentReferences(form.documents),
  };
}

function createPatientForm(patient: Patient): PatientFormState {
  return {
    name: patient.name,
    cpf: patient.cpf,
    rg: patient.rg ?? '',
    birthDate: formatDateInput(patient.birthDate),
    gender: patient.gender,
    bloodType: patient.bloodType ?? '',
    phone: patient.phone,
    email: patient.email ?? '',
    address: patient.address ?? '',
    city: patient.city ?? '',
    state: patient.state ?? '',
    zipCode: patient.zipCode ?? '',
    emergencyContact: patient.emergencyContact ?? '',
    emergencyPhone: patient.emergencyPhone ?? '',
    allergies: patient.allergies ?? '',
    medicalHistory: patient.medicalHistory ?? '',
    status: patient.status ?? 'ACTIVE',
    blockReason: patient.blockReason ?? '',
    documents: (patient.documents ?? []).join('\n'),
  };
}

function createProcedurePayload(form: ProcedureFormState) {
  return {
    code: normalizeProcedureCode(form.code),
    description: form.description.trim(),
    type: form.type,
    tableCode: form.tableCode.trim() || undefined,
    groupName: form.groupName.trim() || undefined,
    unit: form.unit.trim() || undefined,
    referencePriceCents: parseCurrencyToCents(form.referencePrice),
    requiresAuthorization: form.requiresAuthorization,
    requiresReport: form.requiresReport,
    billable: form.billable,
    active: form.active,
    notes: form.notes.trim() || undefined,
  };
}

function createExamOrderPayload(form: ExamOrderFormState) {
  return {
    patientId: form.patientId,
    requesterDoctorId: form.requesterDoctorId || undefined,
    priority: form.priority || undefined,
    clinicalIndication: form.clinicalIndication.trim() || undefined,
    notes: form.notes.trim() || undefined,
    items: form.items.map((item) => ({
      procedureId: item.procedureId,
      quantity: Math.max(1, item.quantity),
      notes: item.notes.trim() || undefined,
    })),
  };
}

function createPricingTablePayload(form: PricingTableFormState) {
  return {
    name: form.name.trim(),
    type: form.type,
    year: form.year ? Number(form.year) : undefined,
    code: form.code.trim() || undefined,
    description: form.description.trim() || undefined,
    active: form.active,
  };
}

function createProcedurePricePayload(form: ProcedurePriceFormState) {
  return {
    procedureId: form.procedureId,
    pricingTableId: form.pricingTableId,
    priceCents: parseCurrencyToCents(form.price) ?? 0,
    operationalCostCents: parseCurrencyToCents(form.operationalCost),
    billingUnit: form.billingUnit.trim() || undefined,
    effectiveFrom: form.effectiveFrom || undefined,
    effectiveTo: form.effectiveTo || undefined,
    active: form.active,
    notes: form.notes.trim() || undefined,
  };
}

function createProcedureForm(procedure: Procedure): ProcedureFormState {
  return {
    code: procedure.code,
    description: procedure.description,
    type: procedure.type,
    tableCode: procedure.tableCode ?? '',
    groupName: procedure.groupName ?? '',
    unit: procedure.unit ?? '',
    referencePrice: centsToCurrencyInput(procedure.referencePriceCents),
    requiresAuthorization: procedure.requiresAuthorization,
    requiresReport: procedure.requiresReport,
    billable: procedure.billable,
    active: procedure.active,
    notes: procedure.notes ?? '',
  };
}

function formatDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatPatientBirthDate(value?: string | null) {
  if (!value) {
    return 'data nao informada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'data nao informada';
  }

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatPatientSearchLabel(patient: Patient) {
  return `${patient.name} - ${patient.cpf || 'sem CPF'}`;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeProcedureCode(value: string) {
  return value.trim().toUpperCase();
}

function parseCurrencyToCents(value: string) {
  const cleanValue = value.trim().replace(/[^\d,.]/g, '');

  if (!cleanValue) {
    return undefined;
  }

  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue;
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue)
    ? Math.round(parsedValue * 100)
    : undefined;
}

function centsToCurrencyInput(value?: number | null) {
  if (typeof value !== 'number') {
    return '';
  }

  return (value / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyFromCents(value?: number | null) {
  if (typeof value !== 'number') {
    return 'Nao informado';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

function formatDecimalValue(value?: string | null) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 'Nao informado';
  }

  return parsedValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatFractionRange(summary: CbhpmPorteSummary) {
  if (!summary.fracaoMin && !summary.fracaoMax) {
    return 'nao informada';
  }

  if (summary.fracaoMin === summary.fracaoMax) {
    return formatDecimalValue(summary.fracaoMin);
  }

  return `${formatDecimalValue(summary.fracaoMin)} a ${formatDecimalValue(
    summary.fracaoMax,
  )}`;
}

function procedureTypeLabel(type: ProcedureType) {
  switch (type) {
    case 'LAB_EXAM':
      return 'Exame laboratorial';
    case 'IMAGE_EXAM':
      return 'Exame de imagem';
    case 'CONSULTATION':
      return 'Consulta';
    case 'SURGERY':
      return 'Cirurgia';
    case 'ROOM_FEE':
      return 'Taxa de sala';
    case 'PACKAGE':
      return 'Pacote';
    default:
      return 'Procedimento';
  }
}

function pricingTableTypeLabel(type: PricingTableType) {
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

function examOrderStatusLabel(status: ExamOrderStatus) {
  switch (status) {
    case 'AUTHORIZATION_PENDING':
      return 'Aguardando autorizacao';
    case 'AUTHORIZED':
      return 'Autorizado';
    case 'IN_PROGRESS':
      return 'Em execucao';
    case 'RESULT_READY':
      return 'Resultado pronto';
    case 'CANCELED':
      return 'Cancelado';
    default:
      return 'Solicitado';
  }
}

function summarizeExamOrderItems(order: ExamOrder) {
  const firstItem = order.items[0];

  if (!firstItem) {
    return 'Sem itens';
  }

  if (order.items.length === 1) {
    return firstItem.procedure.description;
  }

  return `${firstItem.procedure.description} +${order.items.length - 1}`;
}

function mergeProcedures(current: Procedure[], incoming: Procedure[]) {
  const registry = new Map(
    current.map((procedure) => [procedure.id, procedure]),
  );

  incoming.forEach((procedure) => registry.set(procedure.id, procedure));

  return Array.from(registry.values());
}

function mergePatients(current: Patient[], incoming: Patient[]) {
  const registry = new Map(current.map((patient) => [patient.id, patient]));

  incoming.forEach((patient) => registry.set(patient.id, patient));

  return Array.from(registry.values());
}

function mergePricingTables(tables: PricingTable[]) {
  const registry = new Map(tables.map((table) => [table.id, table]));

  return Array.from(registry.values());
}

function isPatientActive(patient: Patient) {
  return (patient.status ?? 'ACTIVE') === 'ACTIVE';
}

function parseDocumentReferences(value: string) {
  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default App;
