import {
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
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import './App.css';
import { apiRequest } from './lib/api';
import type {
  Appointment,
  CommunicationDashboard,
  Doctor,
  Nurse,
  PaginatedResponse,
  Patient,
  PatientStatus,
  Role,
  Sector,
  UserProfile,
} from './lib/types';

type Session = {
  token: string;
  profile: UserProfile;
};

type DashboardCache = {
  communicationDashboard: CommunicationDashboard;
  users: UserProfile[];
  patients: Patient[];
  patientTotal: number;
  doctors: Doctor[];
  nurses: Nurse[];
  sectors: Sector[];
  appointments: Appointment[];
};

const emptyCommunicationDashboard: CommunicationDashboard = {
  updates: [],
  notices: [],
  commemorativeDates: [],
  emails: [],
};

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

type CareRecordPayload = {
  status?: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
};

type CareRecordFormState = {
  status: string;
  notes: string;
  diagnosis: string;
  prescription: string;
};

type EnvironmentId =
  | 'administrativo'
  | 'hospitalar'
  | 'pronto-atendimento'
  | 'consultorio'
  | 'farmacia'
  | 'faturamento';

type NavigationEnvironment = {
  id: EnvironmentId;
  label: string;
  hint: string;
  symbol: string;
  toneClass: string;
  modulePaths: string[];
  roadmap: string[];
};

type ModuleItem = {
  path: string;
  label: string;
  hint: string;
  roles?: Role[];
};

type AdministrativeModuleGroup = {
  hint: string;
  label: string;
  paths: string[];
};

const storageKey = 'hospital-system.session';
const dashboardCacheKey = 'hospital-system.dashboard';
const environmentStorageKey = 'hospital-system.environment';

const activeModules: ModuleItem[] = [
  { path: '/central', label: 'Principal', hint: 'Comunicacao interna' },
  {
    path: '/cadastros',
    label: 'Cadastros',
    hint: 'Base operacional',
    roles: ['ADMIN', 'ATENDENTE'],
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    hint: 'Acessos e permissoes',
    roles: ['ADMIN'],
  },
  {
    path: '/pacientes',
    label: 'Pacientes',
    hint: 'Cadastro e busca',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO', 'FATURAMENTO'],
  },
  {
    path: '/agendamento',
    label: 'Agendamento',
    hint: 'Agenda e triagem',
    roles: ['ATENDENTE', 'ENFERMEIRO'],
  },
  {
    path: '/atender',
    label: 'Atender',
    hint: 'Atendimento eletivo',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pedidos-exames',
    label: 'Pedidos Exames',
    hint: 'Solicitacoes ambulatoriais',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/laudos',
    label: 'Laudos',
    hint: 'Resultados e modelos',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/recibo-nfse',
    label: 'Rec./NFS-e',
    hint: 'Recibos e notas',
    roles: ['ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/autorizacao',
    label: 'Autorizacao',
    hint: 'Senhas e liberacoes',
    roles: ['ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/mapa-cirurgia',
    label: 'Mapa Cirurgia',
    hint: 'Salas e agenda cirurgica',
    roles: ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/leitos',
    label: 'Leitos',
    hint: 'Ocupacao e movimentacao',
    roles: ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pronto-atendimento',
    label: 'Pronto Atendimento',
    hint: 'Triagem e fila PA',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pa-recepcao',
    label: 'Recepcao PA',
    hint: 'Abrir pronto atendimento',
    roles: ['ATENDENTE', 'ENFERMEIRO'],
  },
  {
    path: '/pa-enfermagem',
    label: 'Enfermagem PA',
    hint: 'Triagem e sinais',
    roles: ['ENFERMEIRO', 'MEDICO', 'ATENDENTE'],
  },
  {
    path: '/pa-dispensacao-medica',
    label: 'Disp. Medica',
    hint: 'Medicacao no PA',
    roles: ['MEDICO', 'ENFERMEIRO', 'FARMACIA'],
  },
  {
    path: '/pa-imagem',
    label: 'Imagem PA',
    hint: 'Exames de imagem',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/pa-exames-ambulatoriais',
    label: 'Exames Amb.',
    hint: 'Coletas e ambulatorio',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/consultorio',
    label: 'Consultorio',
    hint: 'Atendimento medico',
    roles: ['MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/consultorio-virtual',
    label: 'Consultorio Virtual',
    hint: 'Atendimento digital',
    roles: ['MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/equipe',
    label: 'Equipe',
    hint: 'Medicos e suporte',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/farmacia',
    label: 'Farmacia',
    hint: 'Dispensacao',
    roles: ['FARMACIA', 'ESTOQUE', 'ENFERMEIRO'],
  },
  {
    path: '/estoque-produtos',
    label: 'Produtos',
    hint: 'Cadastro de itens',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/estoque-lotes',
    label: 'Lotes',
    hint: 'Lotes e validade',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/medicamentos',
    label: 'Medicamentos',
    hint: 'Base medicamentosa',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/faturamento',
    label: 'Faturamento',
    hint: 'Contas e notas',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/guias',
    label: 'Guias',
    hint: 'Controle de guias',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/contas',
    label: 'Contas',
    hint: 'Contas hospitalares',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/notas-fiscais',
    label: 'NF',
    hint: 'Notas fiscais',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/glosas',
    label: 'Glosas',
    hint: 'Recursos e perdas',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/importacao-xml',
    label: 'Importar XML',
    hint: 'Entrada de XML',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/movimentacao-guias',
    label: 'Mov. Guias',
    hint: 'Movimentacao de guias',
    roles: ['FATURAMENTO'],
  },
];

const administrativeModuleGroups: AdministrativeModuleGroup[] = [
  {
    label: 'Base administrativa',
    hint: 'Configuracao, usuarios e cadastros principais',
    paths: ['/central', '/cadastros', '/usuarios', '/equipe', '/pacientes'],
  },
  {
    label: 'Hospitalar',
    hint: 'Eletivos, agenda, exames, leitos e cirurgia',
    paths: [
      '/agendamento',
      '/atender',
      '/pedidos-exames',
      '/laudos',
      '/recibo-nfse',
      '/autorizacao',
      '/mapa-cirurgia',
      '/leitos',
    ],
  },
  {
    label: 'Pronto Atendimento',
    hint: 'Recepcao PA, triagem, exames e dispensacao',
    paths: [
      '/pa-recepcao',
      '/pronto-atendimento',
      '/pa-enfermagem',
      '/pa-dispensacao-medica',
      '/pa-imagem',
      '/pa-exames-ambulatoriais',
    ],
  },
  {
    label: 'Consultorio',
    hint: 'Consultorio local e virtual',
    paths: ['/consultorio', '/consultorio-virtual'],
  },
  {
    label: 'Farmacia e Estoque',
    hint: 'Dispensacao, produtos, lotes e medicamentos',
    paths: [
      '/farmacia',
      '/estoque-produtos',
      '/estoque-lotes',
      '/medicamentos',
    ],
  },
  {
    label: 'Faturamento',
    hint: 'Guias, contas, NF, glosas e XML',
    paths: [
      '/faturamento',
      '/guias',
      '/contas',
      '/notas-fiscais',
      '/glosas',
      '/importacao-xml',
      '/movimentacao-guias',
    ],
  },
];

const navigationEnvironments: NavigationEnvironment[] = [
  {
    id: 'administrativo',
    label: 'Administrativo',
    hint: 'Visao completa de todos os ambientes e cadastros',
    symbol: 'AD',
    toneClass: 'env-admin',
    modulePaths: activeModules.map((moduleItem) => moduleItem.path),
    roadmap: ['Tudo visivel', 'Configuracoes', 'Cadastros', 'Auditoria'],
  },
  {
    id: 'hospitalar',
    label: 'Hospitalar',
    hint: 'Fluxos eletivos, agenda e rotina hospitalar',
    symbol: 'HP',
    toneClass: 'env-hospital',
    modulePaths: [
      '/central',
      '/agendamento',
      '/atender',
      '/pedidos-exames',
      '/laudos',
      '/recibo-nfse',
      '/autorizacao',
      '/mapa-cirurgia',
      '/leitos',
      '/pacientes',
    ],
    roadmap: ['Eletivos', 'Leitos', 'Cirurgias', 'Autorizacoes'],
  },
  {
    id: 'pronto-atendimento',
    label: 'Pronto Atendimento',
    hint: 'Recepcao propria, enfermagem, exames e dispensacao PA',
    symbol: 'PA',
    toneClass: 'env-pa',
    modulePaths: [
      '/central',
      '/pa-recepcao',
      '/pronto-atendimento',
      '/pa-enfermagem',
      '/pa-dispensacao-medica',
      '/pa-imagem',
      '/pa-exames-ambulatoriais',
    ],
    roadmap: ['Recepcao PA', 'Triagem', 'Imagem', 'Dispensacao'],
  },
  {
    id: 'consultorio',
    label: 'Consultorio',
    hint: 'Consultorio virtual e areas medicas futuras',
    symbol: 'CO',
    toneClass: 'env-office',
    modulePaths: ['/central', '/consultorio', '/consultorio-virtual'],
    roadmap: ['Virtual', 'Evolucao', 'Prescricao', 'Pedidos'],
  },
  {
    id: 'farmacia',
    label: 'Farmacia / Estoque',
    hint: 'Dispensacao, produtos, lotes e medicamentos',
    symbol: 'FE',
    toneClass: 'env-pharmacy',
    modulePaths: [
      '/central',
      '/farmacia',
      '/estoque-produtos',
      '/estoque-lotes',
      '/medicamentos',
    ],
    roadmap: ['Dispensacao', 'Produtos', 'Lotes', 'Medicamentos'],
  },
  {
    id: 'faturamento',
    label: 'Faturamento',
    hint: 'Guias, contas, NF, glosas, XML e movimentacoes',
    symbol: 'FT',
    toneClass: 'env-billing',
    modulePaths: [
      '/central',
      '/faturamento',
      '/guias',
      '/contas',
      '/notas-fiscais',
      '/glosas',
      '/importacao-xml',
      '/movimentacao-guias',
    ],
    roadmap: ['Guias', 'Contas', 'Glosas', 'XML'],
  },
];

const genders = ['MASCULINO', 'FEMININO', 'OUTRO'] as const;
const bloodTypes = [
  '',
  'A_POSITIVO',
  'A_NEGATIVO',
  'B_POSITIVO',
  'B_NEGATIVO',
  'AB_POSITIVO',
  'AB_NEGATIVO',
  'O_POSITIVO',
  'O_NEGATIVO',
] as const;
const appointmentTypes = [
  'PRIMEIRA_CONSULTA',
  'RETORNO',
  'URGENCIA',
  'EXAME',
] as const;
const appointmentStatuses = [
  'AGENDADA',
  'CONFIRMADA',
  'REALIZADA',
  'CANCELADA',
  'NAO_COMPARECEU',
] as const;
const patientStatusOptions: Array<{
  value: PatientStatus;
  label: string;
  hint: string;
}> = [
  {
    value: 'ACTIVE',
    label: 'Ativo',
    hint: 'Liberado para agendamento e atendimento',
  },
  {
    value: 'BLOCKED',
    label: 'Bloqueado',
    hint: 'Mantem cadastro, mas impede novos agendamentos',
  },
  {
    value: 'INACTIVE',
    label: 'Inativo',
    hint: 'Paciente preservado apenas para historico',
  },
];
const roleOptions: Role[] = [
  'ADMIN',
  'ATENDENTE',
  'MEDICO',
  'ENFERMEIRO',
  'FARMACIA',
  'ESTOQUE',
  'FATURAMENTO',
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

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cachedDashboard] = useState<DashboardCache | null>(() =>
    readStoredValue<DashboardCache>(dashboardCacheKey),
  );
  const [restoredSessionToken] = useState<string | null>(
    () => readStoredValue<Session>(storageKey)?.token ?? null,
  );
  const [session, setSession] = useState<Session | null>(() =>
    readStoredValue<Session>(storageKey),
  );
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
  const [isBusy, setIsBusy] = useState(false);
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
  const [users, setUsers] = useState<UserProfile[]>(
    cachedDashboard?.users ?? [],
  );
  const [patients, setPatients] = useState<Patient[]>(
    cachedDashboard?.patients ?? [],
  );
  const [patientTotal, setPatientTotal] = useState(
    cachedDashboard?.patientTotal ?? 0,
  );
  const [doctors, setDoctors] = useState<Doctor[]>(
    cachedDashboard?.doctors ?? [],
  );
  const [nurses, setNurses] = useState<Nurse[]>(cachedDashboard?.nurses ?? []);
  const [sectors, setSectors] = useState<Sector[]>(
    cachedDashboard?.sectors ?? [],
  );
  const [appointments, setAppointments] = useState<Appointment[]>(
    cachedDashboard?.appointments ?? [],
  );
  const [communicationDashboard, setCommunicationDashboard] =
    useState<CommunicationDashboard>(
      cachedDashboard?.communicationDashboard ?? emptyCommunicationDashboard,
    );

  const loadDashboard = useCallback(
    async (token = session?.token) => {
      if (!token) {
        return;
      }

      setIsBusy(true);

      try {
        const profile = await apiRequest<UserProfile>('/auth/profile', {
          token,
        });

        const [
          userResponse,
          patientResponse,
          doctorResponse,
          nurseResponse,
          sectorResponse,
          appointmentResponse,
          communicationResponse,
        ] = await Promise.all([
          profile.role === 'ADMIN'
            ? apiRequest<PaginatedResponse<UserProfile>>(
                '/users?page=1&limit=100',
                { token },
              )
            : Promise.resolve({ data: [] }),
          apiRequest<PaginatedResponse<Patient>>('/patients?page=1&limit=50', {
            token,
          }),
          apiRequest<Doctor[]>('/doctors', { token }),
          apiRequest<Nurse[]>('/nurses', { token }),
          apiRequest<Sector[]>('/sectors', { token }),
          apiRequest<Appointment[]>('/appointments', { token }),
          apiRequest<CommunicationDashboard>('/communications/dashboard', {
            token,
          }),
        ]);

        const nextUsers = userResponse.data ?? [];
        const nextPatients = patientResponse.data ?? [];
        const nextPatientTotal =
          patientResponse.meta?.total ??
          patientResponse.total ??
          nextPatients.length;
        const nextSession = { token, profile };

        startTransition(() => {
          setSession(nextSession);
          setUsers(nextUsers);
          setPatients(nextPatients);
          setPatientTotal(nextPatientTotal);
          setDoctors(doctorResponse);
          setNurses(nurseResponse);
          setSectors(sectorResponse);
          setAppointments(appointmentResponse);
          setCommunicationDashboard(communicationResponse);
        });

        localStorage.setItem(storageKey, JSON.stringify(nextSession));
        localStorage.setItem(
          dashboardCacheKey,
          JSON.stringify({
            users: nextUsers,
            patients: nextPatients,
            patientTotal: nextPatientTotal,
            doctors: doctorResponse,
            nurses: nurseResponse,
            sectors: sectorResponse,
            appointments: appointmentResponse,
            communicationDashboard: communicationResponse,
          }),
        );

        setNotice({
          kind: 'success',
          text: 'Base sincronizada com a API.',
        });
      } catch (error) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(dashboardCacheKey);
        setSession(null);
        setNotice({
          kind: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar a API.',
        });
      } finally {
        setIsBusy(false);
      }
    },
    [session?.token],
  );

  useEffect(() => {
    if (!session?.token || !restoredSessionToken) {
      return;
    }

    if (session.token !== restoredSessionToken) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void loadDashboard(session.token);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [loadDashboard, restoredSessionToken, session?.token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const auth = await apiRequest<{ access_token: string }>('/auth/login', {
        body: loginForm,
      });

      await loadDashboard(auth.access_token);
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
      await loadDashboard(session.token);
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

  function handleLogout() {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(dashboardCacheKey);
    setSession(null);
    setUsers([]);
    setPatients([]);
    setDoctors([]);
    setNurses([]);
    setSectors([]);
    setAppointments([]);
    setCommunicationDashboard(emptyCommunicationDashboard);
    setPatientTotal(0);
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
      await loadDashboard(session.token);
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
      await loadDashboard(session.token);
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
      await loadDashboard(session.token);
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
      await loadDashboard(session.token);
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
      await loadDashboard(session.token);
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

      await loadDashboard(session.token);
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

  function openEmergencyScheduling() {
    setAppointmentForm((current) => ({
      ...current,
      status: 'AGENDADA',
      type: 'URGENCIA',
    }));
    setNotice({
      kind: 'info',
      text: 'Agendamento preparado para entrada de Pronto Atendimento.',
    });
    navigate('/agendamento');
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
  const environmentModules = accessibleModules.filter((moduleItem) =>
    activeEnvironment.modulePaths.includes(moduleItem.path),
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
      <LoginScreen
        handleLogin={handleLogin}
        isSubmitting={isSubmitting}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
      />
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
            isBusy={isBusy}
            loadDashboard={loadDashboard}
            notice={notice}
            onChangeEnvironment={changeEnvironment}
            onCloseEnvironmentPicker={() => setIsEnvironmentPickerOpen(false)}
            onOpenEnvironmentPicker={() => setIsEnvironmentPickerOpen(true)}
            session={session}
            transitionEnvironment={transitionEnvironment}
            upcomingModules={activeEnvironment.roadmap}
          />
        }
      >
        <Route index element={<Navigate replace to="/central" />} />
        <Route
          path="/central"
          element={
            <OverviewPage
              communicationDashboard={communicationDashboard}
              session={session}
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
              onOpenScheduling={openEmergencyScheduling}
              onSaveCareRecord={saveCareRecord}
              patients={patients}
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
            <ModulePlaceholderPage
              environment="Hospitalar"
              title="Pedidos de Exames"
              description="Solicitacoes de exames ambulatoriais e eletivos."
              steps={[
                'Criar pedido vinculado ao paciente',
                'Separar exames laboratoriais, imagem e procedimentos',
                'Acompanhar status ate laudo ou liberacao',
              ]}
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
            <ModulePlaceholderPage
              environment="Pronto Atendimento"
              title="Recepcao PA"
              description="Entrada exclusiva para abrir pronto atendimento."
              steps={[
                'Localizar ou cadastrar paciente',
                'Abrir ficha de pronto atendimento',
                'Enviar para enfermagem e fila de triagem',
              ]}
            />
          }
        />
        <Route
          path="/pa-enfermagem"
          element={
            <ModulePlaceholderPage
              environment="Pronto Atendimento"
              title="Enfermagem PA"
              description="Triagem, sinais vitais e classificacao inicial."
              steps={[
                'Chamar paciente da recepcao PA',
                'Registrar sinais vitais e queixa principal',
                'Classificar prioridade e encaminhar',
              ]}
            />
          }
        />
        <Route
          path="/pa-dispensacao-medica"
          element={
            <ModulePlaceholderPage
              environment="Pronto Atendimento"
              title="Dispensacao Medica"
              description="Medicacoes e dispensacoes vinculadas ao PA."
              steps={[
                'Receber prescricao do atendimento',
                'Registrar medicamento dispensado',
                'Baixar item do estoque ou farmacia',
              ]}
            />
          }
        />
        <Route
          path="/pa-imagem"
          element={
            <ModulePlaceholderPage
              environment="Pronto Atendimento"
              title="Exames de Imagem PA"
              description="Solicitacao e acompanhamento de imagem no PA."
              steps={[
                'Receber pedido do medico do PA',
                'Acompanhar realizacao do exame',
                'Retornar resultado ao atendimento',
              ]}
            />
          }
        />
        <Route
          path="/pa-exames-ambulatoriais"
          element={
            <ModulePlaceholderPage
              environment="Pronto Atendimento"
              title="Exames Ambulatoriais PA"
              description="Coletas e exames ambulatoriais ligados ao PA."
              steps={[
                'Receber pedido do PA',
                'Registrar coleta ou execucao',
                'Disponibilizar resultado para conduta',
              ]}
            />
          }
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
            />
          }
        />
        <Route
          path="/consultorio-virtual"
          element={
            <ModulePlaceholderPage
              environment="Consultorio"
              title="Consultorio Virtual"
              description="Atendimento digital a ser configurado com areas medicas proprias."
              steps={[
                'Definir especialidades e salas virtuais',
                'Relacionar agenda medica ao atendimento online',
                'Integrar evolucao, prescricao e pedidos',
              ]}
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
          path="/faturamento"
          element={
            <BillingPage
              appointments={appointments}
              patientTotal={patientTotal}
            />
          }
        />
        <Route
          path="/guias"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Guias"
              description="Controle de guias por convenio, paciente e atendimento."
              steps={[
                'Criar ou importar guia',
                'Relacionar procedimentos realizados',
                'Controlar status de envio e retorno',
              ]}
            />
          }
        />
        <Route
          path="/contas"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Contas"
              description="Contas hospitalares, fechamento e conferencia."
              steps={[
                'Agrupar itens por atendimento',
                'Conferir procedimentos e valores',
                'Fechar conta para guia ou nota',
              ]}
            />
          }
        />
        <Route
          path="/notas-fiscais"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Notas Fiscais"
              description="Notas fiscais e documentos fiscais relacionados."
              steps={[
                'Preparar nota por conta fechada',
                'Controlar emissao e cancelamento',
                'Relacionar nota a recibo e guia',
              ]}
            />
          }
        />
        <Route
          path="/glosas"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Glosas"
              description="Controle de glosas, recursos e perdas financeiras."
              steps={[
                'Registrar glosa por guia ou item',
                'Acompanhar recurso e retorno',
                'Mensurar perdas por convenio',
              ]}
            />
          }
        />
        <Route
          path="/importacao-xml"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Importacao XML"
              description="Entrada de XML para conferencia fiscal e operacional."
              steps={[
                'Importar XML recebido',
                'Validar itens e dados fiscais',
                'Relacionar XML a nota ou conta',
              ]}
            />
          }
        />
        <Route
          path="/movimentacao-guias"
          element={
            <ModulePlaceholderPage
              environment="Faturamento"
              title="Movimentacao de Guias"
              description="Movimentacao, envio, retorno e rastreio de guias."
              steps={[
                'Registrar movimentacao da guia',
                'Acompanhar envio, retorno e pendencias',
                'Conectar guia a conta, nota e glosa',
              ]}
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/central" />} />
      </Route>
    </Routes>
  );
}

type LoginScreenProps = {
  handleLogin: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  loginForm: {
    username: string;
    password: string;
  };
  setLoginForm: React.Dispatch<
    React.SetStateAction<{
      username: string;
      password: string;
    }>
  >;
};

function LoginScreen({
  handleLogin,
  isSubmitting,
  loginForm,
  setLoginForm,
}: LoginScreenProps) {
  return (
    <main className="login-app-shell">
      <section className="login-shell clinic-login-shell">
        <form className="auth-card clinic-login-card" onSubmit={handleLogin}>
          <div className="clinic-login-title">
            <div className="clinic-login-logo" aria-label="Hospital Revitalite">
              <span>R</span>
            </div>
            <h1>Sistema Revitalite</h1>
          </div>

          <label className="clinic-login-field">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M12 12.6a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
                <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
              </svg>
            </span>
            <span className="sr-only">Login</span>
            <input
              aria-label="Login"
              autoComplete="username"
              placeholder="Digite seu login"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  username: normalizeLogin(event.target.value),
                }))
              }
              required
            />
            <button
              aria-label="Limpar login"
              className="login-reset-button"
              type="button"
              onClick={() =>
                setLoginForm((current) => ({
                  ...current,
                  username: '',
                }))
              }
            >
              <svg viewBox="0 0 24 24" role="img">
                <path d="M20 12a8 8 0 1 1-2.35-5.65" />
                <path d="M20 4.8v5.1h-5.1" />
              </svg>
            </button>
          </label>

          <label className="clinic-password-block">
            <span className="clinic-password-label">Senha</span>
            <span className="clinic-password-input">
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M8.8 14.5a3.6 3.6 0 1 1 1.75-3.1H22l-2.1 2.1 1.3 1.3-1.7 1.7-1.3-1.3-1.6 1.6-1.3-1.3h-4.75a3.6 3.6 0 0 1-1.65 1Z" />
                  <path d="M5.6 11.4h.01" />
                </svg>
              </span>
              <span className="sr-only">Senha</span>
              <input
                aria-label="Senha"
                autoComplete="current-password"
                type="password"
                placeholder="Informe sua senha"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
            </span>
          </label>

          <button className="forgot-password-link" type="button">
            Esqueceu sua senha?
          </button>

          <div className="clinic-login-actions">
            <button
              className="clinic-secondary-button"
              type="button"
              onClick={() =>
                setLoginForm((current) => ({
                  ...current,
                  password: '',
                }))
              }
            >
              Voltar
            </button>
            <button
              className="primary-button clinic-access-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Acessar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

type UsersPageProps = {
  form: UserFormState;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  users: UserProfile[];
};

function UsersPage({
  form,
  isSubmitting,
  onSubmit,
  setForm,
  users,
}: UsersPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchUsers = search.trim().length >= 2;
  const filteredUsers = useMemo(
    () =>
      hasSearchedUsers
        ? users.filter((user) => matchUser(user, deferredSearch))
        : [],
    [deferredSearch, hasSearchedUsers, users],
  );
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;

  function searchUsers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchUsers) {
      setHasSearchedUsers(true);
    }
  }

  function clearUsersSearch() {
    setSearch('');
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

      <section className="page-grid module-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Usuarios</p>
              <h2>Buscar acessos</h2>
            </div>
            <span className="inline-badge">{users.length} no cadastro</span>
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
                description="Use a busca acima para localizar um login ou utilize o formulario ao lado para cadastrar um novo acesso."
              />
            ) : filteredUsers.length === 0 ? (
              <DirectoryState
                code="00"
                title="Nenhum usuario encontrado."
                description="Revise o termo pesquisado ou cadastre um novo usuario com login unico."
              />
            ) : (
              filteredUsers.map((user) => (
                <div className="table-row users-grid" key={user.id}>
                  <span>{user.name}</span>
                  <span>{user.username}</span>
                  <span>{user.email}</span>
                  <span>{roleLabel(user.role)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="page-header">
            <div>
              <p className="eyebrow">Cadastro administrativo</p>
              <h2>Novo usuario</h2>
            </div>
          </div>

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
      </section>
    </>
  );
}

type WorkspaceLayoutProps = {
  activeEnvironment: NavigationEnvironment;
  activeModules: ModuleItem[];
  environments: NavigationEnvironment[];
  handleLogout: () => void;
  isEnvironmentPickerOpen: boolean;
  isBusy: boolean;
  loadDashboard: () => Promise<void>;
  notice: Notice | null;
  onChangeEnvironment: (environmentId: EnvironmentId) => void;
  onCloseEnvironmentPicker: () => void;
  onOpenEnvironmentPicker: () => void;
  session: Session;
  transitionEnvironment: NavigationEnvironment | null;
  upcomingModules: string[];
};

function WorkspaceLayout({
  activeEnvironment,
  activeModules,
  environments,
  handleLogout,
  isEnvironmentPickerOpen,
  isBusy,
  loadDashboard,
  notice,
  onChangeEnvironment,
  onCloseEnvironmentPicker,
  onOpenEnvironmentPicker,
  session,
  transitionEnvironment,
  upcomingModules,
}: WorkspaceLayoutProps) {
  return (
    <main className="app-shell">
      <section className="workspace-shell">
        <header className="topbar">
          <div className="brand-cluster">
            <div className="brand-mark">HS</div>
            <div>
              <p className="eyebrow">Centro operacional</p>
              <h1>Hospital Revitalite</h1>
            </div>
          </div>

          <div className="topbar-meta">
            <div className="session-chip">
              <span className="session-name">{session.profile.name}</span>
              <span className="session-role">
                {session.profile.username} - {roleLabel(session.profile.role)}
              </span>
            </div>
            <button
              className={`environment-switch ${activeEnvironment.toneClass}`}
              onClick={onOpenEnvironmentPicker}
              type="button"
            >
              <span>Ambiente</span>
              <strong>{activeEnvironment.label}</strong>
            </button>
            <button
              className="ghost-button"
              onClick={() => void loadDashboard()}
              type="button"
            >
              {isBusy ? 'Sincronizando...' : 'Atualizar'}
            </button>
            <a
              className="ghost-button anchor-button"
              href="http://localhost:3000/api/docs"
              target="_blank"
              rel="noreferrer"
            >
              Swagger
            </a>
            <button
              className="ghost-button"
              onClick={handleLogout}
              type="button"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="module-bar">
          <div className={`environment-current ${activeEnvironment.toneClass}`}>
            <div>
              <span className="module-caption">Ambiente atual</span>
              <strong>{activeEnvironment.label}</strong>
              <small>{activeEnvironment.hint}</small>
            </div>
            <button
              className="ghost-button"
              onClick={onOpenEnvironmentPicker}
              type="button"
            >
              Alterar ambiente
            </button>
          </div>
        </section>

        {notice ? (
          <div className={`notice-banner notice-${notice.kind}`}>
            {notice.text}
          </div>
        ) : null}

        <section className="workspace-main-grid">
          <aside
            className={`environment-sidebar ${activeEnvironment.toneClass}`}
          >
            {activeEnvironment.id === 'administrativo' ? (
              <AdministrativeModuleGrid modules={activeModules} />
            ) : (
              <EnvironmentModuleNav modules={activeModules} />
            )}

            <div className="module-future">
              <span className="module-caption">Trilha</span>
              <div className="roadmap-inline">
                {upcomingModules.map((moduleName) => (
                  <span className="roadmap-chip compact" key={moduleName}>
                    {moduleName}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <section className="workspace-content">
            <Outlet />
          </section>
        </section>
      </section>

      {isEnvironmentPickerOpen ? (
        <EnvironmentPicker
          activeEnvironment={activeEnvironment}
          environments={environments}
          onClose={onCloseEnvironmentPicker}
          onSelect={onChangeEnvironment}
        />
      ) : null}

      <EnvironmentTransition environment={transitionEnvironment} />
    </main>
  );
}

type AdministrativeModuleGridProps = {
  modules: ModuleItem[];
};

type EnvironmentModuleNavProps = {
  modules: ModuleItem[];
};

function EnvironmentModuleNav({ modules }: EnvironmentModuleNavProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredModules = useMemo(
    () =>
      modules.filter((moduleItem) =>
        matchModuleSearch(
          [moduleItem.label, moduleItem.hint, moduleItem.path],
          deferredSearch,
        ),
      ),
    [deferredSearch, modules],
  );

  return (
    <div className="side-module-panel">
      <SidebarSearch
        count={filteredModules.length}
        onChange={setSearch}
        placeholder="Pesquisar modulo"
        value={search}
      />
      <nav className="side-module-nav" aria-label="Modulos do ambiente">
        {filteredModules.length === 0 ? (
          <p className="sidebar-empty">Nenhum modulo encontrado.</p>
        ) : (
          filteredModules.map((moduleItem) => (
            <NavLink
              key={moduleItem.path}
              className={({ isActive }) =>
                isActive ? 'side-module-link active' : 'side-module-link'
              }
              to={moduleItem.path}
            >
              <strong>{moduleItem.label}</strong>
              <span>{moduleItem.hint}</span>
            </NavLink>
          ))
        )}
      </nav>
    </div>
  );
}

function AdministrativeModuleGrid({ modules }: AdministrativeModuleGridProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const modulesByPath = new Map(
    modules.map((moduleItem) => [moduleItem.path, moduleItem]),
  );
  const filteredGroupCount = administrativeModuleGroups.reduce(
    (total, group) => {
      const groupModules = group.paths
        .map((path) => modulesByPath.get(path))
        .filter((moduleItem): moduleItem is ModuleItem => Boolean(moduleItem))
        .filter((moduleItem) =>
          matchModuleSearch(
            [group.label, group.hint, moduleItem.label, moduleItem.hint],
            deferredSearch,
          ),
        );

      return total + groupModules.length;
    },
    0,
  );

  return (
    <div className="side-module-panel">
      <SidebarSearch
        count={filteredGroupCount}
        onChange={setSearch}
        placeholder="Buscar em todos"
        value={search}
      />
      <section
        className="admin-module-grid"
        aria-label="Modulos administrativos"
      >
        {filteredGroupCount === 0 ? (
          <p className="sidebar-empty">Nenhum modulo encontrado.</p>
        ) : (
          administrativeModuleGroups.map((group) => {
            const groupModules = group.paths
              .map((path) => modulesByPath.get(path))
              .filter((moduleItem): moduleItem is ModuleItem =>
                Boolean(moduleItem),
              )
              .filter((moduleItem) =>
                matchModuleSearch(
                  [group.label, group.hint, moduleItem.label, moduleItem.hint],
                  deferredSearch,
                ),
              );

            if (groupModules.length === 0) {
              return null;
            }

            return (
              <article className="admin-module-group" key={group.label}>
                <div className="admin-module-group-header">
                  <strong>{group.label}</strong>
                  <span>{group.hint}</span>
                </div>

                <div className="admin-module-links">
                  {groupModules.map((moduleItem) => (
                    <NavLink
                      className={({ isActive }) =>
                        isActive
                          ? 'admin-module-link active'
                          : 'admin-module-link'
                      }
                      key={moduleItem.path}
                      to={moduleItem.path}
                    >
                      <strong>{moduleItem.label}</strong>
                      <span>{moduleItem.hint}</span>
                    </NavLink>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

type SidebarSearchProps = {
  count: number;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
  value: string;
};

function SidebarSearch({
  count,
  onChange,
  placeholder,
  value,
}: SidebarSearchProps) {
  return (
    <label className="sidebar-search">
      <span>Pesquisar</span>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>{count} atalhos</small>
    </label>
  );
}

type EnvironmentPickerProps = {
  activeEnvironment: NavigationEnvironment;
  environments: NavigationEnvironment[];
  onClose: () => void;
  onSelect: (environmentId: EnvironmentId) => void;
};

function EnvironmentPicker({
  activeEnvironment,
  environments,
  onClose,
  onSelect,
}: EnvironmentPickerProps) {
  return (
    <div className="environment-backdrop" role="presentation">
      <section
        aria-labelledby="environment-title"
        aria-modal="true"
        className="environment-modal"
        role="dialog"
      >
        <div className="environment-modal-header">
          <div>
            <p className="eyebrow">Alteracao de Ambiente</p>
            <h2 id="environment-title">Escolha onde quer trabalhar</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Cancelar
          </button>
        </div>

        <div className="environment-card-grid">
          {environments.map((environment) => (
            <button
              className={`environment-card ${environment.toneClass} ${
                activeEnvironment.id === environment.id ? 'is-active' : ''
              }`}
              key={environment.id}
              onClick={() => onSelect(environment.id)}
              type="button"
            >
              <span className="environment-symbol">{environment.symbol}</span>
              <strong>{environment.label}</strong>
              <small>{environment.hint}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type EnvironmentTransitionProps = {
  environment: NavigationEnvironment | null;
};

function EnvironmentTransition({ environment }: EnvironmentTransitionProps) {
  if (!environment) {
    return null;
  }

  return (
    <div className={`environment-transition ${environment.toneClass}`}>
      <span>Entrando em</span>
      <strong>{environment.label}</strong>
      <small>{environment.hint}</small>
      <div className="environment-transition-bar" />
    </div>
  );
}

type ModulePlaceholderPageProps = {
  description: string;
  environment: string;
  steps: string[];
  title: string;
};

function ModulePlaceholderPage({
  description,
  environment,
  steps,
  title,
}: ModulePlaceholderPageProps) {
  return (
    <section className="panel module-placeholder">
      <div className="page-header">
        <div>
          <p className="eyebrow">{environment}</p>
          <h2>{title}</h2>
        </div>
        <span className="inline-badge">Em configuracao</span>
      </div>

      <p>{description}</p>

      <div className="placeholder-flow">
        {steps.map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

type OverviewPageProps = {
  communicationDashboard: CommunicationDashboard;
  session: Session;
};

function OverviewPage({ communicationDashboard, session }: OverviewPageProps) {
  const today = new Date();
  const unreadCount = communicationDashboard.emails.filter(
    (email) => email.unread,
  ).length;

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Hoje</span>
          <strong>{formatWeekday(today)}</strong>
          <small>{formatDateFromDate(today)}</small>
        </article>
        <article className="summary-card">
          <span>Atualizacoes</span>
          <strong>{communicationDashboard.updates.length}</strong>
          <small>comunicados do sistema</small>
        </article>
        <article className="summary-card">
          <span>Avisos</span>
          <strong>{communicationDashboard.notices.length}</strong>
          <small>recados do hospital</small>
        </article>
        <article className="summary-card">
          <span>Emails</span>
          <strong>{unreadCount}</strong>
          <small>nao lidos</small>
        </article>
      </section>

      <section className="panel communication-hero">
        <div className="communication-hero-grid">
          <div>
            <p className="eyebrow">Aba principal</p>
            <h2>
              {greetingLabel(today)}, {firstName(session.profile.name)}
            </h2>
            <p>
              Este espaco e comum para todos os usuarios e concentra informacoes
              institucionais antes de acessar os modulos do setor.
            </p>
          </div>
          <div className="communication-date-card">
            <span>Data e hora</span>
            <strong>{formatDateFromDate(today)}</strong>
            <small>{formatTimeFromDate(today)}</small>
          </div>
          <div className="communication-date-card">
            <span>Seu perfil</span>
            <strong>{roleLabel(session.profile.role)}</strong>
            <small>{session.profile.username}</small>
          </div>
        </div>
      </section>

      <section className="page-grid communication-grid">
        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Atualizacoes</p>
                <h2>Linha do tempo do sistema</h2>
              </div>
            </div>

            <div className="communication-list">
              {communicationDashboard.updates.length === 0 ? (
                <p className="empty-state">
                  Ainda nao ha atualizacoes publicadas.
                </p>
              ) : (
                communicationDashboard.updates.map((update) => (
                  <div className="communication-item" key={update.id}>
                    <span>{update.tag || 'Atualizacao'}</span>
                    <strong>{update.title}</strong>
                    <p>{update.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Datas comemorativas</p>
                <h2>Calendario institucional</h2>
              </div>
            </div>

            <div className="holiday-grid">
              {communicationDashboard.commemorativeDates.length === 0 ? (
                <p className="empty-state">
                  Nenhuma data comemorativa cadastrada.
                </p>
              ) : (
                communicationDashboard.commemorativeDates.map((date) => (
                  <div className="holiday-card" key={date.id}>
                    <span>{date.dateLabel || 'Data'}</span>
                    <strong>{date.title}</strong>
                    <p>{date.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Avisos do hospital</p>
                <h2>Mural interno</h2>
              </div>
            </div>

            <div className="notice-list">
              {communicationDashboard.notices.length === 0 ? (
                <p className="empty-state">Nenhum aviso publicado.</p>
              ) : (
                communicationDashboard.notices.map((notice) => (
                  <div className="notice-card" key={notice.id}>
                    <strong>{notice.title}</strong>
                    <p>{notice.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Caixa interna</p>
                <h2>Emails internos</h2>
              </div>
            </div>

            <div className="inbox-list">
              {communicationDashboard.emails.length === 0 ? (
                <p className="empty-state">Caixa interna sem mensagens.</p>
              ) : (
                communicationDashboard.emails.map((email) => (
                  <div
                    className={`mail-row ${email.unread ? 'is-unread' : ''}`}
                    key={email.id}
                  >
                    <div>
                      <span>{email.from}</span>
                      <strong>{email.subject}</strong>
                      <p>{email.preview}</p>
                    </div>
                    <small>
                      {email.timeLabel ||
                        (email.sentAt ? formatTime(email.sentAt) : '--:--')}
                    </small>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
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
    status: 'Em breve',
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
    status: 'Proximo',
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
    status: 'Proximo',
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
    status: 'Em breve',
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

type RecordLineProps = {
  label: string;
  value?: string | null;
};

function RecordLine({ label, value }: RecordLineProps) {
  return (
    <div className="record-line">
      <span>{label}</span>
      <strong>{value || 'Nao informado'}</strong>
    </div>
  );
}

type OperationalSearchCardProps = {
  canSearch: boolean;
  description: string;
  error?: string;
  isLoading?: boolean;
  label?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  resultText?: string;
  title: string;
  value: string;
};

function OperationalSearchCard({
  canSearch,
  description,
  error,
  isLoading = false,
  label = 'Consulta parametrizada',
  onChange,
  onClear,
  onSearch,
  placeholder,
  resultText,
  title,
  value,
}: OperationalSearchCardProps) {
  return (
    <form className="operational-search-card" onSubmit={onSearch}>
      <div>
        <span className="section-title">{label}</span>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <div className="operational-search-actions">
        <input
          className="search-input"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="ghost-button"
          disabled={isLoading || !canSearch}
          type="submit"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
        <button
          className="ghost-button"
          disabled={isLoading || value.length === 0}
          onClick={onClear}
          type="button"
        >
          Limpar
        </button>
      </div>
      {resultText ? <small>{resultText}</small> : null}
      {error ? <small className="form-warning">{error}</small> : null}
    </form>
  );
}

type DirectoryStateProps = {
  code: string;
  description: string;
  title: string;
};

function DirectoryState({ code, description, title }: DirectoryStateProps) {
  return (
    <div className="directory-state">
      <span>{code}</span>
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
  );
}

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

function PatientsPage({
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
  const focusedPatient =
    patientResults.find((patient) => patient.id === selectedPatientId) ??
    previewPatient;
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

  async function searchPatients(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearchPatient) {
      setPatientSearchStatus('idle');
      setPatientSearchError('Digite ao menos 2 caracteres para pesquisar.');
      return;
    }

    setPatientSearchStatus('loading');
    setPatientSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '25',
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
      setSelectedPatientId(nextPatients[0]?.id ?? null);
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

  function openNewPatientEditor() {
    onResetPatient();
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
    setPatientSearchStatus('idle');
    setPatientSearchError('');
    setSelectedPatientId(null);
    closePatientEditor();
  }

  function openPatientForEdit(patient: Patient) {
    setIsEditorRequested(true);
    setActiveTab('identificacao');
    onEditPatient(patient);
  }

  return (
    <section className="page-grid patients-workspace">
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
          description="Pesquise por nome, CPF, RG, telefone, email ou cidade. A busca vai direto no banco e retorna ate 25 resultados por vez."
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
            <p className="empty-state">Buscando pacientes no banco...</p>
          ) : patientSearchStatus === 'error' ? (
            <p className="empty-state">
              {patientSearchError || 'Nao foi possivel buscar pacientes.'}
            </p>
          ) : patientResults.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhum paciente encontrado."
              description="Confira o termo pesquisado ou inicie um novo cadastro se for uma primeira passagem."
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
                    <em
                      className={`patient-status-pill ${patientStatusTone(
                        patient.status,
                      )}`}
                    >
                      {patientStatusLabel(patient.status)}
                    </em>
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

        {focusedPatient ? (
          <section className="patient-record-card">
            <div className="page-header">
              <div>
                <p className="eyebrow">Ficha completa</p>
                <h2>{focusedPatient.name}</h2>
              </div>
              <button
                className="ghost-button"
                onClick={() => openPatientForEdit(focusedPatient)}
                type="button"
              >
                Editar ficha
              </button>
            </div>

            <div className="record-grid">
              <RecordLine label="CPF" value={focusedPatient.cpf} />
              <RecordLine label="RG" value={focusedPatient.rg} />
              <RecordLine
                label="Nascimento"
                value={formatDate(focusedPatient.birthDate)}
              />
              <RecordLine
                label="Status"
                value={patientStatusLabel(focusedPatient.status)}
              />
              <RecordLine label="Telefone" value={focusedPatient.phone} />
              <RecordLine label="Email" value={focusedPatient.email} />
              <RecordLine label="Endereco" value={focusedPatient.address} />
              <RecordLine
                label="Cidade/UF"
                value={[focusedPatient.city, focusedPatient.state]
                  .filter(Boolean)
                  .join(' / ')}
              />
              <RecordLine
                label="Contato emergencia"
                value={focusedPatient.emergencyContact}
              />
              <RecordLine
                label="Telefone emergencia"
                value={focusedPatient.emergencyPhone}
              />
              <RecordLine label="Alergias" value={focusedPatient.allergies} />
              <RecordLine
                label="Historico"
                value={focusedPatient.medicalHistory}
              />
            </div>

            {focusedPatient.blockReason ? (
              <p className="empty-state compact">
                {focusedPatient.blockReason}
              </p>
            ) : null}

            <div className="document-list">
              <span className="section-title">Documentos anexados</span>
              {focusedPatient.documents &&
              focusedPatient.documents.length > 0 ? (
                focusedPatient.documents.map((document) => (
                  <small key={document}>{document}</small>
                ))
              ) : (
                <small>Nenhum documento registrado ainda.</small>
              )}
            </div>
          </section>
        ) : null}
      </article>

      {isEditorVisible ? (
        <form className="panel patient-editor" onSubmit={onSubmit}>
          <div className="page-header">
            <div>
              <p className="eyebrow">Cadastro assistido</p>
              <h2>{editingPatient ? 'Editar paciente' : 'Novo paciente'}</h2>
            </div>
            <span className="inline-badge">
              {editingPatient ? 'Ficha em edicao' : 'Cadastro em abas'}
            </span>
          </div>

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
      ) : (
        <aside className="panel patient-editor patient-editor-empty">
          <div className="page-header">
            <div>
              <p className="eyebrow">Cadastro assistido</p>
              <h2>Nenhuma ficha aberta</h2>
            </div>
            <span className="inline-badge">Fluxo protegido</span>
          </div>

          <DirectoryState
            code="02"
            title="Cadastre apenas quando houver uma nova passagem."
            description="Primeiro consulte a base para evitar duplicidade. Se nao encontrar o paciente, abra um cadastro limpo e preencha as abas por etapa."
          />

          <button
            className="primary-button"
            onClick={openNewPatientEditor}
            type="button"
          >
            Abrir novo cadastro
          </button>
        </aside>
      )}
    </section>
  );
}

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

function SchedulingPage({
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
    <section className="page-grid module-grid">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Agendamento</p>
            <h2>Buscar agenda</h2>
          </div>
          <span className="inline-badge">{appointments.length} registros</span>
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
                  <em
                    className={`status-dot ${statusTone(appointment.status)}`}
                  />
                  {appointment.status}
                </span>
                <span>{appointment.type}</span>
              </div>
            ))
          )}
        </div>
      </article>

      <form className="panel form-panel" onSubmit={onSubmit}>
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
            <strong>{selectedPatient?.name || 'Selecione em pacientes'}</strong>
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
    </section>
  );
}

type EmergencyCarePageProps = {
  appointments: Appointment[];
  canManageCare: boolean;
  doctors: Doctor[];
  isSubmitting: boolean;
  nurses: Nurse[];
  onOpenScheduling: () => void;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  patients: Patient[];
  sectors: Sector[];
};

function EmergencyCarePage({
  appointments,
  canManageCare,
  doctors,
  isSubmitting,
  nurses,
  onOpenScheduling,
  onSaveCareRecord,
  patients,
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
      <section className="context-band">
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
        <button
          className="primary-button"
          onClick={onOpenScheduling}
          type="button"
        >
          Nova entrada PA
        </button>
      </section>

      <CarePage
        appointments={paAppointments}
        canManageCare={canManageCare}
        emptyMessage="Nenhum atendimento de PA visivel. Crie uma entrada como URGENCIA ou vincule o medico ao setor PA."
        eyebrow="Pronto Atendimento"
        focusEyebrow="Triagem em foco"
        isSubmitting={isSubmitting}
        onSaveCareRecord={onSaveCareRecord}
        patients={patients}
        statusEyebrow="Leitura PA"
        statusTitle="Status, chamada e desfecho"
        title="Fila de urgencia e triagem"
      />
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
};

function DoctorOfficePage({
  appointments,
  canManageCare,
  doctors,
  isSubmitting,
  onSaveCareRecord,
  patients,
  profile,
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
      <section className="context-band">
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
        isSubmitting={isSubmitting}
        onSaveCareRecord={onSaveCareRecord}
        patients={patients}
        statusEyebrow="Evolucao medica"
        statusTitle="Conduta, prescricao e fechamento"
        title="Agenda medica e evolucao"
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
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Prescricoes</span>
          <strong>{prescriptions.length}</strong>
          <small>condutas registradas</small>
        </article>
        <article className="summary-card">
          <span>Equipe farmacia</span>
          <strong>{pharmacyTeam.length}</strong>
          <small>profissionais vinculados</small>
        </article>
        <article className="summary-card">
          <span>Setor farmacia</span>
          <strong>{pharmacySector ? 'OK' : '--'}</strong>
          <small>base organizacional</small>
        </article>
        <article className="summary-card">
          <span>Estoque</span>
          <strong>{stockSector ? 'OK' : '--'}</strong>
          <small>vinculo para baixa futura</small>
        </article>
      </section>

      <section className="page-grid module-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Farmacia</p>
              <h2>Dispensacao por prescricao</h2>
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

            <div className="list-shell">
              <div className="list-row">
                <div>
                  <strong>Medicamentos</strong>
                  <span>cadastro, principio ativo, concentracao e unidade</span>
                </div>
                <div>
                  <span>modelo</span>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Lotes e validade</strong>
                  <span>entrada de estoque e rastreio por lote</span>
                </div>
                <div>
                  <span>modelo</span>
                </div>
              </div>
              <div className="list-row">
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
    </>
  );
}

type BillingPageProps = {
  appointments: Appointment[];
  patientTotal: number;
};

function BillingPage({ appointments, patientTotal }: BillingPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedBilling, setHasSearchedBilling] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchBilling = search.trim().length >= 2;
  const billableSource = [...appointments]
    .filter((appointment) => appointment.status === 'REALIZADA')
    .sort(sortByAppointmentDate);
  const billableAppointments = hasSearchedBilling
    ? billableSource.filter((appointment) =>
        matchAppointment(appointment, deferredSearch),
      )
    : [];
  const openAccounts = appointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const cancelledOrMissing = appointments.filter((appointment) =>
    ['CANCELADA', 'NAO_COMPARECEU'].includes(appointment.status),
  ).length;

  function searchBilling(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchBilling) {
      setHasSearchedBilling(true);
    }
  }

  function clearBillingSearch() {
    setSearch('');
    setHasSearchedBilling(false);
  }

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Faturaveis</span>
          <strong>{billableSource.length}</strong>
          <small>atendimentos realizados</small>
        </article>
        <article className="summary-card">
          <span>Contas abertas</span>
          <strong>{openAccounts}</strong>
          <small>aguardando fechamento</small>
        </article>
        <article className="summary-card">
          <span>Excecoes</span>
          <strong>{cancelledOrMissing}</strong>
          <small>cancelados ou ausentes</small>
        </article>
        <article className="summary-card">
          <span>Base pacientes</span>
          <strong>{patientTotal}</strong>
          <small>origem dos cadastros</small>
        </article>
      </section>

      <section className="page-grid module-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Faturamento</p>
              <h2>Buscar contas para cobranca</h2>
            </div>
            <span className="inline-badge">recibos e notas fiscais</span>
          </div>

          <OperationalSearchCard
            canSearch={canSearchBilling}
            description="Busque por paciente, medico, tipo ou status antes de abrir contas faturaveis."
            onChange={setSearch}
            onClear={clearBillingSearch}
            onSearch={searchBilling}
            placeholder="Buscar paciente, medico, tipo ou status"
            resultText={
              hasSearchedBilling
                ? `${billableAppointments.length} contas encontradas`
                : undefined
            }
            title="Localize a conta antes de emitir documentos."
            value={search}
          />

          <div className="table-shell">
            <div className="table-head appointments-grid">
              <span>Paciente</span>
              <span>Medico</span>
              <span>Atendimento</span>
              <span>Status</span>
              <span>Tipo</span>
            </div>

            {!hasSearchedBilling ? (
              <DirectoryState
                code="01"
                title="Nenhuma conta carregada automaticamente."
                description="Use a busca para localizar o atendimento realizado antes de iniciar conferencia, recibo ou nota."
              />
            ) : billableAppointments.length === 0 ? (
              <p className="empty-state">
                Nenhuma conta faturavel ainda. Quando a consulta for marcada
                como realizada, ela entra nesta lista.
              </p>
            ) : (
              billableAppointments.map((appointment) => (
                <div
                  className="table-row appointments-grid"
                  key={appointment.id}
                >
                  <span>{appointment.patient.name}</span>
                  <span>{appointment.doctor.user.name}</span>
                  <span>{formatDateTime(appointment.appointmentDate)}</span>
                  <span>{humanizeEnum(appointment.status)}</span>
                  <span>{humanizeEnum(appointment.type)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Trilha fiscal</p>
              <h2>Fluxo operacional</h2>
            </div>
          </div>

          <div className="list-shell">
            <div className="list-row">
              <div>
                <strong>1. Conta do atendimento</strong>
                <span>capturar paciente, profissional, tipo e conduta</span>
              </div>
              <div>
                <span>base pronta</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>2. Tabela e procedimento</strong>
                <span>vincular valores, convenio ou particular</span>
              </div>
              <div>
                <span>proximo</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>3. Recibo ou NF</strong>
                <span>emitir documento fiscal e controlar pagamento</span>
              </div>
              <div>
                <span>proximo</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>4. Relatorio financeiro</strong>
                <span>fechamento por periodo, setor e profissional</span>
              </div>
              <div>
                <span>proximo</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

type CarePageProps = {
  appointments: Appointment[];
  canManageCare: boolean;
  emptyMessage?: string;
  eyebrow?: string;
  focusEyebrow?: string;
  isSubmitting: boolean;
  onSaveCareRecord: (
    appointmentId: string,
    payload: CareRecordPayload,
  ) => Promise<void>;
  patients: Patient[];
  statusEyebrow?: string;
  statusTitle?: string;
  title?: string;
};

function CarePage({
  appointments,
  canManageCare,
  emptyMessage = 'Nenhum atendimento visivel na fila.',
  eyebrow = 'Atendimento',
  focusEyebrow = 'Paciente em foco',
  isSubmitting,
  onSaveCareRecord,
  patients,
  statusEyebrow = 'Leitura operacional',
  statusTitle = 'Status e proxima acao',
  title = 'Fila operacional',
}: CarePageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedQueue, setHasSearchedQueue] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    null | string
  >(null);
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
  const activeAppointment =
    filteredQueue.find(
      (appointment) => appointment.id === selectedAppointmentId,
    ) ??
    filteredQueue[0] ??
    null;
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

      <section className="page-grid care-layout">
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
            description="Pesquise por paciente, medico, status ou tipo para abrir apenas a fila relacionada ao atendimento desejado."
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
                  onClick={() => setSelectedAppointmentId(appointment.id)}
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
                      {activeAppointment.doctor.user.name} • CRM{' '}
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

type TeamPageProps = {
  doctors: Doctor[];
  nurses: Nurse[];
  sectors: Sector[];
  form: DoctorFormState;
  nurseForm: NurseFormState;
  sectorForm: SectorFormState;
  isSubmitting: boolean;
  onNurseSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSectorSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onPrepareDoctor: (doctorId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<DoctorFormState>>;
  setNurseForm: React.Dispatch<React.SetStateAction<NurseFormState>>;
  setSectorForm: React.Dispatch<React.SetStateAction<SectorFormState>>;
};

function TeamPage({
  doctors,
  nurses,
  sectors,
  form,
  nurseForm,
  sectorForm,
  isSubmitting,
  onNurseSubmit,
  onSectorSubmit,
  onPrepareDoctor,
  onSubmit,
  setForm,
  setNurseForm,
  setSectorForm,
}: TeamPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedTeam, setHasSearchedTeam] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchTeam = search.trim().length >= 2;
  const filteredDoctors = useMemo(
    () =>
      hasSearchedTeam
        ? doctors.filter((doctor) => matchDoctor(doctor, deferredSearch))
        : [],
    [deferredSearch, doctors, hasSearchedTeam],
  );
  const filteredNurses = useMemo(
    () =>
      hasSearchedTeam
        ? nurses.filter((nurse) => matchNurse(nurse, deferredSearch))
        : [],
    [deferredSearch, hasSearchedTeam, nurses],
  );
  const filteredSectors = useMemo(
    () =>
      hasSearchedTeam
        ? sectors.filter((sector) => matchSector(sector, deferredSearch))
        : [],
    [deferredSearch, hasSearchedTeam, sectors],
  );
  const activeSectors = sectors.filter((sector) => sector.active).length;

  function searchTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchTeam) {
      setHasSearchedTeam(true);
    }
  }

  function clearTeamSearch() {
    setSearch('');
    setHasSearchedTeam(false);
  }

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Medicos</span>
          <strong>{doctors.length}</strong>
          <small>cadastros assistenciais</small>
        </article>
        <article className="summary-card">
          <span>Enfermagem</span>
          <strong>{nurses.length}</strong>
          <small>apoio operacional</small>
        </article>
        <article className="summary-card">
          <span>Setores</span>
          <strong>{sectors.length}</strong>
          <small>estrutura organizacional</small>
        </article>
        <article className="summary-card">
          <span>Setores ativos</span>
          <strong>{activeSectors}</strong>
          <small>alocacao corrente</small>
        </article>
      </section>

      <section className="page-grid team-layout">
        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Equipe assistencial</p>
                <h2>Busca e preparacao de agenda</h2>
              </div>
              <span className="inline-badge">{doctors.length} medicos</span>
            </div>

            <OperationalSearchCard
              canSearch={canSearchTeam}
              description="Pesquise por profissional, conselho, email, especialidade ou setor antes de abrir os resultados da equipe."
              onChange={setSearch}
              onClear={clearTeamSearch}
              onSearch={searchTeam}
              placeholder="Buscar por nome, conselho, email, especialidade ou setor"
              resultText={
                hasSearchedTeam
                  ? `${filteredDoctors.length} medicos, ${filteredNurses.length} enfermagem, ${filteredSectors.length} setores`
                  : undefined
              }
              title="Localize profissional ou setor pelo contexto."
              value={search}
            />

            <div className="table-shell">
              <div className="table-head doctors-grid">
                <span>Profissional</span>
                <span>Registro</span>
                <span>Setor</span>
                <span>Acao</span>
              </div>

              {!hasSearchedTeam ? (
                <DirectoryState
                  code="01"
                  title="Nenhum medico carregado automaticamente."
                  description="Use a busca acima para localizar profissional, conselho ou setor."
                />
              ) : filteredDoctors.length === 0 ? (
                <p className="empty-state">
                  Nenhum medico encontrado com esse filtro.
                </p>
              ) : (
                filteredDoctors.map((doctor) => (
                  <div className="table-row doctors-grid" key={doctor.id}>
                    <span>
                      {doctor.user.name}
                      <small>
                        {doctor.specialties.length > 0
                          ? doctor.specialties.join(', ')
                          : 'Sem especialidade'}
                      </small>
                    </span>
                    <span>
                      {doctor.crm}/{doctor.crmUf}
                    </span>
                    <span>{doctor.sector?.name ?? 'Sem setor'}</span>
                    <button
                      className="mini-button"
                      onClick={() => onPrepareDoctor(doctor.id)}
                      type="button"
                    >
                      Usar na agenda
                    </button>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Enfermagem</p>
                <h2>Setores e plantoes</h2>
              </div>
              <span className="inline-badge">
                {hasSearchedTeam ? filteredNurses.length : nurses.length} ativos
              </span>
            </div>

            <div className="table-shell">
              <div className="table-head nurses-grid">
                <span>Profissional</span>
                <span>COREN</span>
                <span>Setor</span>
                <span>Plantao</span>
              </div>

              {!hasSearchedTeam ? (
                <DirectoryState
                  code="02"
                  title="Nenhum enfermeiro carregado automaticamente."
                  description="A busca da equipe tambem filtra enfermagem por nome, COREN, email, setor e plantao."
                />
              ) : filteredNurses.length === 0 ? (
                <p className="empty-state">
                  Nenhum enfermeiro encontrado com esse filtro.
                </p>
              ) : (
                filteredNurses.map((nurse) => (
                  <div className="table-row nurses-grid" key={nurse.id}>
                    <span>
                      {nurse.user.name}
                      <small>{nurse.user.email}</small>
                    </span>
                    <span>
                      {nurse.coren}/{nurse.corenUf}
                    </span>
                    <span>{nurse.sector?.name ?? 'Sem setor'}</span>
                    <span>{nurse.shift || 'Nao informado'}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Setores</p>
                <h2>Mapa de alocacao</h2>
              </div>
              <span className="inline-badge">
                {hasSearchedTeam ? filteredSectors.length : sectors.length}{' '}
                visiveis
              </span>
            </div>

            <div className="list-shell">
              {!hasSearchedTeam ? (
                <DirectoryState
                  code="03"
                  title="Nenhum setor carregado automaticamente."
                  description="Pesquise para abrir somente os setores relacionados ao termo informado."
                />
              ) : filteredSectors.length === 0 ? (
                <p className="empty-state">Nenhum setor cadastrado ainda.</p>
              ) : (
                filteredSectors.map((sector) => (
                  <div className="list-row" key={sector.id}>
                    <div>
                      <strong>
                        {sector.name} ({sector.code})
                      </strong>
                      <span>
                        {sector.description || 'Sem descricao operacional'}
                      </span>
                    </div>
                    <div className="team-meta">
                      <span>{sector.doctors?.length ?? 0} med.</span>
                      <span>{sector.nurses?.length ?? 0} enf.</span>
                      <span>{sector.active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <div className="stack-column">
          <form className="panel form-panel" onSubmit={onSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Cadastro profissional</p>
                <h2>Novo medico</h2>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Usuario e acesso</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>Nome</span>
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
                  <span>Login</span>
                  <input
                    autoComplete="off"
                    placeholder="ex: medico.carlos"
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
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Registro e setor</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>CRM</span>
                  <input
                    value={form.crm}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        crm: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>UF do CRM</span>
                  <input
                    maxLength={2}
                    value={form.crmUf}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        crmUf: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Setor</span>
                  <select
                    value={form.sectorId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sectorId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
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
                  />
                </label>
                <label className="field full-row">
                  <span>Especialidades</span>
                  <input
                    placeholder="Cardiologia, Clinico Geral"
                    value={form.specialties}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        specialties: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field full-row">
                  <span>Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Endereco e documentos</p>
              <div className="field-grid two-columns">
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
                  <span>UF</span>
                  <input
                    maxLength={2}
                    value={form.state}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        state: event.target.value.toUpperCase(),
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
                <label className="field full-row">
                  <span>Documentos anexos</span>
                  <textarea
                    placeholder="Uma referencia por linha: CRM.pdf, contrato.pdf"
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

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar medico'}
            </button>
          </form>

          <form className="panel form-panel" onSubmit={onNurseSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Cadastro profissional</p>
                <h2>Novo enfermeiro</h2>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Usuario e acesso</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>Nome</span>
                  <input
                    value={nurseForm.name}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={nurseForm.email}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Login</span>
                  <input
                    autoComplete="off"
                    placeholder="ex: enfermagem.pa"
                    value={nurseForm.username}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        username: normalizeLogin(event.target.value),
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
                    value={nurseForm.password}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Registro e setor</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>COREN</span>
                  <input
                    value={nurseForm.coren}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        coren: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>UF do COREN</span>
                  <input
                    maxLength={2}
                    value={nurseForm.corenUf}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        corenUf: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Setor</span>
                  <select
                    value={nurseForm.sectorId}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        sectorId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Plantao</span>
                  <input
                    placeholder="Diurno, Noturno..."
                    value={nurseForm.shift}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        shift: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input
                    value={nurseForm.phone}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Endereco e documentos</p>
              <div className="field-grid two-columns">
                <label className="field full-row">
                  <span>Endereco</span>
                  <input
                    value={nurseForm.address}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input
                    value={nurseForm.city}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>UF</span>
                  <input
                    maxLength={2}
                    value={nurseForm.state}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        state: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>CEP</span>
                  <input
                    value={nurseForm.zipCode}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        zipCode: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Documentos anexos</span>
                  <textarea
                    placeholder="Uma referencia por linha: COREN.pdf, contrato.pdf"
                    value={nurseForm.documents}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        documents: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar enfermeiro'}
            </button>
          </form>

          <form className="panel form-panel" onSubmit={onSectorSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Estrutura</p>
                <h2>Novo setor</h2>
              </div>
            </div>

            <div className="field-grid two-columns">
              <label className="field">
                <span>Nome do setor</span>
                <input
                  value={sectorForm.name}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Codigo</span>
                <input
                  value={sectorForm.code}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </label>
              <label className="field full-row">
                <span>Descricao</span>
                <textarea
                  value={sectorForm.description}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={sectorForm.active ? 'ATIVO' : 'INATIVO'}
                  onChange={(event) =>
                    setSectorForm((current) => ({
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

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar setor'}
            </button>
          </form>
        </div>
      </section>
    </>
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

function normalizeLogin(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '.');
}

function roleLabel(role: Role) {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'MEDICO':
      return 'Medico';
    case 'ENFERMEIRO':
      return 'Enfermagem';
    case 'FARMACIA':
      return 'Farmacia';
    case 'ESTOQUE':
      return 'Estoque';
    case 'FATURAMENTO':
      return 'Faturamento';
    default:
      return 'Atendente';
  }
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

function matchPatientRecord(patient: Patient, query: string) {
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

function matchDoctor(doctor: Doctor, query: string) {
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

function matchNurse(nurse: Nurse, query: string) {
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

function matchSector(sector: Sector, query: string) {
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

function matchAppointment(appointment: Appointment, query: string) {
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

function formatDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isPatientActive(patient: Patient) {
  return (patient.status ?? 'ACTIVE') === 'ACTIVE';
}

function patientStatusLabel(status?: PatientStatus) {
  switch (status ?? 'ACTIVE') {
    case 'BLOCKED':
      return 'Bloqueado';
    case 'INACTIVE':
      return 'Inativo';
    default:
      return 'Ativo';
  }
}

function patientStatusTone(status?: PatientStatus) {
  switch (status ?? 'ACTIVE') {
    case 'BLOCKED':
      return 'status-blocked';
    case 'INACTIVE':
      return 'status-inactive';
    default:
      return 'status-active';
  }
}

function matchModuleSearch(values: Array<string | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values.filter(Boolean).join(' ').toLowerCase().includes(query);
}

function isEnvironmentId(value: string | null): value is EnvironmentId {
  return navigationEnvironments.some((environment) => environment.id === value);
}

function getNavigationEnvironment(environmentId: EnvironmentId) {
  return (
    navigationEnvironments.find(
      (environment) => environment.id === environmentId,
    ) ?? navigationEnvironments[0]!
  );
}

function readStoredValue<T>(key: string) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function parseDocumentReferences(value: string) {
  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createCareRecordForm(appointment: Appointment): CareRecordFormState {
  return {
    status: appointment.status,
    notes: appointment.notes ?? '',
    diagnosis: appointment.diagnosis ?? '',
    prescription: appointment.prescription ?? '',
  };
}

function normalizeCareRecord(form: CareRecordFormState): CareRecordPayload {
  return {
    status: form.status,
    notes: form.notes.trim() || undefined,
    diagnosis: form.diagnosis.trim() || undefined,
    prescription: form.prescription.trim() || undefined,
  };
}

function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'usuario';
}

function greetingLabel(value: Date) {
  const hour = value.getHours();

  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(value)
    .replace('.', '');
}

function formatDateFromDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatTimeFromDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(value));
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

function calculateAge(value: string) {
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

function careStatusSummary(status: string) {
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

function statusTone(status: string) {
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

export default App;
