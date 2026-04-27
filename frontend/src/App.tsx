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

type ModuleItem = {
  path: string;
  label: string;
  hint: string;
  roles?: Role[];
};

const storageKey = 'hospital-system.session';
const dashboardCacheKey = 'hospital-system.dashboard';

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
    path: '/pronto-atendimento',
    label: 'Pronto Atendimento',
    hint: 'Triagem e fila PA',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/consultorio',
    label: 'Consultorio',
    hint: 'Atendimento medico',
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
    path: '/faturamento',
    label: 'Faturamento',
    hint: 'Contas e notas',
    roles: ['FATURAMENTO'],
  },
];

const upcomingModules = [
  'Exames',
  'Procedimentos',
  'Tabelas',
  'Estoque',
  'Relatorios',
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
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [nurseForm, setNurseForm] = useState(initialNurseForm);
  const [sectorForm, setSectorForm] = useState(initialSectorForm);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
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
  const [sectors, setSectors] = useState<Sector[]>(cachedDashboard?.sectors ?? []);
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
      navigate(
        location.pathname === '/' ? '/central' : location.pathname,
        { replace: true },
      );
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

  async function createPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<Patient>('/patients', {
        token: session.token,
        body: {
          ...patientForm,
          bloodType: patientForm.bloodType || undefined,
          email: patientForm.email || undefined,
          rg: patientForm.rg || undefined,
          address: patientForm.address || undefined,
          city: patientForm.city || undefined,
          state: patientForm.state || undefined,
          zipCode: patientForm.zipCode || undefined,
          emergencyContact: patientForm.emergencyContact || undefined,
          emergencyPhone: patientForm.emergencyPhone || undefined,
          allergies: patientForm.allergies || undefined,
          medicalHistory: patientForm.medicalHistory || undefined,
        },
      });

      setPatientForm(initialPatientForm);
      await loadDashboard(session.token);
      setNotice({
        kind: 'success',
        text: 'Paciente cadastrado com sucesso.',
      });
      navigate('/pacientes');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel cadastrar o paciente.',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const canCreateAppointment = patients.length > 0 && doctors.length > 0;
  const canManageCare = Boolean(
    session &&
      ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'].includes(
        session.profile.role,
      ),
  );
  const visibleModules = session
    ? activeModules.filter(
        (moduleItem) =>
          session.profile.role === 'ADMIN' ||
          !moduleItem.roles || moduleItem.roles.includes(session.profile.role),
      )
    : activeModules;

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
            activeModules={visibleModules}
            handleLogout={handleLogout}
            isBusy={isBusy}
            loadDashboard={loadDashboard}
            notice={notice}
            session={session}
            upcomingModules={upcomingModules}
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
              form={patientForm}
              isSubmitting={isSubmitting}
              onPreparePatient={preparePatientForScheduling}
              onSubmit={createPatient}
              patients={patients}
              patientTotal={patientTotal}
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
          path="/faturamento"
          element={
            <BillingPage appointments={appointments} patientTotal={patientTotal} />
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
            <span>Acesso seguro</span>
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
            <button className="primary-button clinic-access-button" type="submit" disabled={isSubmitting}>
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
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredUsers = useMemo(
    () => users.filter((user) => matchUser(user, deferredSearch)),
    [deferredSearch, users],
  );
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;

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
              <h2>Acessos cadastrados</h2>
            </div>
            <div className="toolbar-inline">
              <input
                className="search-input"
                placeholder="Buscar por nome, login, email ou cargo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="inline-badge">{filteredUsers.length} visiveis</span>
            </div>
          </div>

          <div className="table-shell">
            <div className="table-head users-grid">
              <span>Nome</span>
              <span>Login</span>
              <span>Email</span>
              <span>Cargo</span>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="empty-state">Nenhum usuario encontrado.</p>
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

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Salvando...' : 'Cadastrar usuario'}
          </button>
        </form>
      </section>
    </>
  );
}

type WorkspaceLayoutProps = {
  activeModules: ModuleItem[];
  handleLogout: () => void;
  isBusy: boolean;
  loadDashboard: () => Promise<void>;
  notice: Notice | null;
  session: Session;
  upcomingModules: string[];
};

function WorkspaceLayout({
  activeModules,
  handleLogout,
  isBusy,
  loadDashboard,
  notice,
  session,
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
            <button className="ghost-button" onClick={handleLogout} type="button">
              Sair
            </button>
          </div>
        </header>

        <section className="module-bar">
          <nav className="module-tabs">
            {activeModules.map((moduleItem) => (
              <NavLink
                key={moduleItem.path}
                className={({ isActive }) =>
                  isActive ? 'module-tab active' : 'module-tab'
                }
                to={moduleItem.path}
              >
                <strong>{moduleItem.label}</strong>
                <span>{moduleItem.hint}</span>
              </NavLink>
            ))}
          </nav>

          <div className="module-future">
            <span className="module-caption">Proxima trilha</span>
            <div className="roadmap-inline">
              {upcomingModules.map((moduleName) => (
                <span className="roadmap-chip compact" key={moduleName}>
                  {moduleName}
                </span>
              ))}
            </div>
          </div>
        </section>

        {notice ? (
          <div className={`notice-banner notice-${notice.kind}`}>{notice.text}</div>
        ) : null}

        <Outlet />
      </section>
    </main>
  );
}

type OverviewPageProps = {
  communicationDashboard: CommunicationDashboard;
  session: Session;
};

function OverviewPage({
  communicationDashboard,
  session,
}: OverviewPageProps) {
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
            <h2>{greetingLabel(today)}, {firstName(session.profile.name)}</h2>
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
                      {email.timeLabel || (email.sentAt ? formatTime(email.sentAt) : '--:--')}
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
            Atalhos para a base administrativa e operacional. A ideia e manter
            a logica do sistema atual, mas com menos campos na mesma tela e mais
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

type PatientsPageProps = {
  form: PatientFormState;
  isSubmitting: boolean;
  onPreparePatient: (patientId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  patients: Patient[];
  patientTotal: number;
  setForm: React.Dispatch<React.SetStateAction<PatientFormState>>;
};

function PatientsPage({
  form,
  isSubmitting,
  onPreparePatient,
  onSubmit,
  patients,
  patientTotal,
  setForm,
}: PatientsPageProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    'identificacao' | 'contato' | 'saude' | 'status'
  >('identificacao');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchPatient(patient, deferredSearch)),
    [deferredSearch, patients],
  );
  const previewPatient = filteredPatients[0] ?? patients[0] ?? null;
  const canSavePatient = [form.name, form.cpf, form.birthDate, form.phone].every(
    (value) => value.trim().length > 0,
  );
  const tabs = [
    { id: 'identificacao', label: 'Identificacao', hint: 'Dados gerais' },
    { id: 'contato', label: 'Contato', hint: 'Endereco e emergencia' },
    { id: 'saude', label: 'Saude', hint: 'Alergias e historico' },
    { id: 'status', label: 'Status', hint: 'Fluxo do prontuario' },
  ] as const;

  return (
    <section className="page-grid patients-workspace">
      <article className="panel patient-directory">
        <div className="page-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Busca rapida</h2>
          </div>
          <div className="toolbar-inline">
            <input
              className="search-input"
              placeholder="Buscar por nome, CPF, RG, telefone ou cidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="inline-badge">
              {filteredPatients.length} de {patientTotal}
            </span>
          </div>
        </div>

        {previewPatient ? (
          <aside className="patient-preview-card">
            <div>
              <span className="section-title">Paciente em foco</span>
              <strong>{previewPatient.name}</strong>
              <small>
                {previewPatient.cpf} - {formatDate(previewPatient.birthDate)}
              </small>
            </div>
            <div className="patient-preview-meta">
              <span>{previewPatient.phone}</span>
              <span>{previewPatient.city || 'Cidade nao informada'}</span>
              <span>{previewPatient.bloodType || 'Tipo sanguineo pendente'}</span>
            </div>
          </aside>
        ) : null}

        <div className="table-shell">
          <div className="table-head patients-grid">
            <span>Paciente</span>
            <span>CPF</span>
            <span>Cidade</span>
            <span>Telefone</span>
            <span>Acao</span>
          </div>

          {filteredPatients.length === 0 ? (
            <p className="empty-state">Nenhum paciente encontrado com esse filtro.</p>
          ) : (
            filteredPatients.map((patient) => (
              <div className="table-row patients-grid" key={patient.id}>
                <span>
                  {patient.name}
                  <small>{patient.email || 'Sem email cadastrado'}</small>
                </span>
                <span>
                  {patient.cpf}
                  <small>{patient.rg ? `RG ${patient.rg}` : 'RG pendente'}</small>
                </span>
                <span>{patient.city || 'Nao informada'}</span>
                <span>{patient.phone}</span>
                <button
                  className="mini-button"
                  onClick={() => onPreparePatient(patient.id)}
                  type="button"
                >
                  Agendar
                </button>
              </div>
            ))
          )}
        </div>
      </article>

      <form className="panel patient-editor" onSubmit={onSubmit}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Cadastro assistido</p>
            <h2>Novo paciente</h2>
          </div>
          <span className="inline-badge">Cadastro em abas</span>
        </div>

        <div className="patient-tabs" role="tablist" aria-label="Cadastro do paciente">
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
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>CPF</span>
                <input
                  value={form.cpf}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cpf: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>RG</span>
                <input
                  value={form.rg}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rg: event.target.value }))
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
                      gender: event.target.value as PatientFormState['gender'],
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
                    setForm((current) => ({ ...current, phone: event.target.value }))
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
                    setForm((current) => ({ ...current, email: event.target.value }))
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
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Estado</span>
                <input
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, state: event.target.value }))
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
                <strong>Registre apenas sinais importantes para triagem.</strong>
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
            <div className="status-checklist">
              <article>
                <span>Prontuario</span>
                <strong>Gerado automaticamente</strong>
                <small>O codigo definitivo entra quando integrarmos prontuario.</small>
              </article>
              <article>
                <span>Situacao</span>
                <strong>Ativo no cadastro</strong>
                <small>Paciente ja fica disponivel para agendamento.</small>
              </article>
              <article>
                <span>Origem</span>
                <strong>Cadastro local</strong>
                <small>Depois podemos incluir importacao de legado.</small>
              </article>
            </div>
          </div>
        ) : null}

        <div className="patient-editor-actions">
          <button
            className="ghost-button"
            onClick={() => setForm(initialPatientForm)}
            type="button"
          >
            Limpar
          </button>
          <button
            className="primary-button"
            disabled={isSubmitting || !canSavePatient}
            type="submit"
          >
            {isSubmitting
              ? 'Salvando...'
              : canSavePatient
                ? 'Salvar paciente'
                : 'Preencha identificacao'}
          </button>
        </div>
      </form>
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
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        matchAppointment(appointment, deferredSearch),
      ),
    [appointments, deferredSearch],
  );
  const selectedPatient =
    patients.find((patient) => patient.id === appointmentForm.patientId) ?? null;
  const selectedDoctor =
    doctors.find((doctor) => doctor.id === appointmentForm.doctorId) ?? null;

  return (
    <section className="page-grid module-grid">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Agendamento</p>
            <h2>Agenda atual</h2>
          </div>
          <div className="toolbar-inline">
            <input
              className="search-input"
              placeholder="Buscar por paciente, medico, status ou tipo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="inline-badge">{filteredAppointments.length} itens</span>
          </div>
        </div>

        <div className="table-shell">
          <div className="table-head appointments-grid">
            <span>Paciente</span>
            <span>Medico</span>
            <span>Horario</span>
            <span>Status</span>
            <span>Tipo</span>
          </div>

          {filteredAppointments.length === 0 ? (
            <p className="empty-state">Nenhuma consulta encontrada com esse filtro.</p>
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
            <strong>{selectedDoctor?.user.name || 'Selecione em equipe'}</strong>
          </div>
        </div>

        <div className="field-grid two-columns">
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
              <option value="">Selecione</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
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
              <option value="">Selecione</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name}
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
            Cadastre ao menos um paciente e um medico antes de seguir.
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
          <small>{paSector ? 'setor configurado' : 'rode o seed foundation'}</small>
        </article>
        <article className="context-card">
          <span>Equipe vinculada</span>
          <strong>{paDoctors.length + paNurses.length}</strong>
          <small>{paDoctors.length} med. / {paNurses.length} enf.</small>
        </article>
        <article className="context-card">
          <span>Ausencias PA</span>
          <strong>{missingCount}</strong>
          <small>controle da fila de urgencia</small>
        </article>
        <button className="primary-button" onClick={onOpenScheduling} type="button">
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
      ? doctors.find((doctor) => doctor.userId === profile.id) ?? null
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
  const pharmacySector = sectors.find((sector) => sector.code === 'FARM') ?? null;
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
  const billableAppointments = [...appointments]
    .filter((appointment) => appointment.status === 'REALIZADA')
    .sort(sortByAppointmentDate);
  const openAccounts = appointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const cancelledOrMissing = appointments.filter((appointment) =>
    ['CANCELADA', 'NAO_COMPARECEU'].includes(appointment.status),
  ).length;

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Faturaveis</span>
          <strong>{billableAppointments.length}</strong>
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
              <h2>Contas prontas para cobranca</h2>
            </div>
            <span className="inline-badge">recibos e notas fiscais</span>
          </div>

          <div className="table-shell">
            <div className="table-head appointments-grid">
              <span>Paciente</span>
              <span>Medico</span>
              <span>Atendimento</span>
              <span>Status</span>
              <span>Tipo</span>
            </div>

            {billableAppointments.length === 0 ? (
              <p className="empty-state">
                Nenhuma conta faturavel ainda. Quando a consulta for marcada
                como realizada, ela entra nesta lista.
              </p>
            ) : (
              billableAppointments.map((appointment) => (
                <div className="table-row appointments-grid" key={appointment.id}>
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
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    null | string
  >(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredQueue = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => appointment.status !== 'CANCELADA')
        .filter((appointment) => matchAppointment(appointment, deferredSearch))
        .sort(
          (left, right) =>
            new Date(left.appointmentDate).getTime() -
            new Date(right.appointmentDate).getTime(),
        ),
    [appointments, deferredSearch],
  );
  const activeAppointment =
    filteredQueue.find((appointment) => appointment.id === selectedAppointmentId) ??
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
            <div className="toolbar-inline">
              <input
                className="search-input"
                placeholder="Buscar por paciente, medico, status ou tipo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="inline-badge">
                {filteredQueue.length} em acompanhamento
              </span>
            </div>
          </div>

          <div className="queue-shell">
            {filteredQueue.length === 0 ? (
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
                    <strong>{formatTime(activeAppointment.appointmentDate)}</strong>
                    <small>{formatDate(activeAppointment.appointmentDate)}</small>
                  </article>
                  <article className="context-card">
                    <span>Idade</span>
                    <strong>
                      {calculateAge(activeAppointment.patient.birthDate)} anos
                    </strong>
                    <small>{formatDate(activeAppointment.patient.birthDate)}</small>
                  </article>
                </div>

                <div className="field-grid two-columns">
                  <div className="helper-block">
                    <span>CPF</span>
                    <strong>{activeAppointment.patient.cpf}</strong>
                  </div>
                  <div className="helper-block">
                    <span>Contato</span>
                    <strong>{activeAppointment.patient.phone || 'Nao informado'}</strong>
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
                      {activeAppointment.patient.allergies || 'Nenhuma alergia informada'}
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
                      {activeAppointment.doctor.crm}/{activeAppointment.doctor.crmUf}
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
                Escolha um atendimento da fila para abrir o contexto do paciente.
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
        <span className="inline-badge">{humanizeEnum(activeAppointment.type)}</span>
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
          <button className="primary-button" disabled={isSubmitting} type="submit">
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
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredDoctors = useMemo(
    () => doctors.filter((doctor) => matchDoctor(doctor, deferredSearch)),
    [deferredSearch, doctors],
  );
  const filteredNurses = useMemo(
    () => nurses.filter((nurse) => matchNurse(nurse, deferredSearch)),
    [deferredSearch, nurses],
  );
  const filteredSectors = useMemo(
    () => sectors.filter((sector) => matchSector(sector, deferredSearch)),
    [deferredSearch, sectors],
  );
  const activeSectors = sectors.filter((sector) => sector.active).length;

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
              <div className="toolbar-inline">
                <input
                  className="search-input"
                  placeholder="Buscar por nome, conselho, email, especialidade ou setor"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <span className="inline-badge">
                  {filteredDoctors.length} medicos
                </span>
              </div>
            </div>

            <div className="table-shell">
              <div className="table-head doctors-grid">
                <span>Profissional</span>
                <span>Registro</span>
                <span>Setor</span>
                <span>Acao</span>
              </div>

              {filteredDoctors.length === 0 ? (
                <p className="empty-state">Nenhum medico encontrado com esse filtro.</p>
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
              <span className="inline-badge">{filteredNurses.length} ativos</span>
            </div>

            <div className="table-shell">
              <div className="table-head nurses-grid">
                <span>Profissional</span>
                <span>COREN</span>
                <span>Setor</span>
                <span>Plantao</span>
              </div>

              {filteredNurses.length === 0 ? (
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
              <span className="inline-badge">{filteredSectors.length} visiveis</span>
            </div>

            <div className="list-shell">
              {filteredSectors.length === 0 ? (
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
                      setForm((current) => ({ ...current, name: event.target.value }))
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
                      setForm((current) => ({ ...current, email: event.target.value }))
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
                      setForm((current) => ({ ...current, crm: event.target.value }))
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
                      setForm((current) => ({ ...current, phone: event.target.value }))
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
                      setForm((current) => ({ ...current, bio: event.target.value }))
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
                      setForm((current) => ({ ...current, city: event.target.value }))
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

            <button className="primary-button" disabled={isSubmitting} type="submit">
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

            <button className="primary-button" disabled={isSubmitting} type="submit">
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

            <button className="primary-button" disabled={isSubmitting} type="submit">
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

function matchPatient(patient: Patient, query: string) {
  if (!query) {
    return true;
  }

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
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
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

function createCareRecordForm(
  appointment: Appointment,
): CareRecordFormState {
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
