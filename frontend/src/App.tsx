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
import { API_URL, apiRequest } from './lib/api';
import type {
  Appointment,
  Doctor,
  PaginatedResponse,
  Patient,
  Role,
  UserProfile,
} from './lib/types';

type Session = {
  token: string;
  profile: UserProfile;
};

type DashboardCache = {
  patients: Patient[];
  patientTotal: number;
  doctors: Doctor[];
  appointments: Appointment[];
};

type Notice = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

type PatientFormState = {
  name: string;
  cpf: string;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  bloodType: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  allergies: string;
  medicalHistory: string;
};

type DoctorFormState = {
  name: string;
  email: string;
  password: string;
  crm: string;
  crmUf: string;
  specialties: string;
  phone: string;
  bio: string;
};

type AppointmentFormState = {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  type: string;
  status: string;
  notes: string;
};

type ModuleItem = {
  path: string;
  label: string;
  hint: string;
};

const storageKey = 'hospital-system.session';
const dashboardCacheKey = 'hospital-system.dashboard';

const activeModules: ModuleItem[] = [
  { path: '/central', label: 'Central', hint: 'Resumo geral' },
  { path: '/pacientes', label: 'Pacientes', hint: 'Cadastro e busca' },
  { path: '/agendamento', label: 'Agendamento', hint: 'Agenda e triagem' },
  { path: '/atendimento', label: 'Atendimento', hint: 'Fila operacional' },
  { path: '/equipe', label: 'Equipe', hint: 'Medicos e suporte' },
];

const upcomingModules = [
  'Exames',
  'Procedimentos',
  'Tabelas',
  'Cadastros',
  'Estoque',
  'Faturamento',
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

const initialPatientForm: PatientFormState = {
  name: '',
  cpf: '',
  birthDate: '',
  gender: 'MASCULINO',
  bloodType: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  allergies: '',
  medicalHistory: '',
};

const initialDoctorForm: DoctorFormState = {
  name: '',
  email: '',
  password: '',
  crm: '',
  crmUf: 'SP',
  specialties: '',
  phone: '',
  bio: '',
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
  const [notice, setNotice] = useState<Notice | null>({
    kind: 'info',
    text: 'Login de seed pronto: admin@hospital.local / Admin123!',
  });
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: 'admin@hospital.local',
    password: 'Admin123!',
  });
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [patients, setPatients] = useState<Patient[]>(
    cachedDashboard?.patients ?? [],
  );
  const [patientTotal, setPatientTotal] = useState(
    cachedDashboard?.patientTotal ?? 0,
  );
  const [doctors, setDoctors] = useState<Doctor[]>(
    cachedDashboard?.doctors ?? [],
  );
  const [appointments, setAppointments] = useState<Appointment[]>(
    cachedDashboard?.appointments ?? [],
  );

  const loadDashboard = useCallback(
    async (token = session?.token) => {
      if (!token) {
        return;
      }

      setIsBusy(true);

      try {
        const [profile, patientResponse, doctorResponse, appointmentResponse] =
          await Promise.all([
            apiRequest<UserProfile>('/auth/profile', { token }),
            apiRequest<PaginatedResponse<Patient>>(
              '/patients?page=1&limit=50',
              {
                token,
              },
            ),
            apiRequest<Doctor[]>('/doctors', { token }),
            apiRequest<Appointment[]>('/appointments', { token }),
          ]);

        const nextPatients = patientResponse.data ?? [];
        const nextPatientTotal =
          patientResponse.meta?.total ??
          patientResponse.total ??
          nextPatients.length;
        const nextSession = { token, profile };

        startTransition(() => {
          setSession(nextSession);
          setPatients(nextPatients);
          setPatientTotal(nextPatientTotal);
          setDoctors(doctorResponse);
          setAppointments(appointmentResponse);
        });

        localStorage.setItem(storageKey, JSON.stringify(nextSession));
        localStorage.setItem(
          dashboardCacheKey,
          JSON.stringify({
            patients: nextPatients,
            patientTotal: nextPatientTotal,
            doctors: doctorResponse,
            appointments: appointmentResponse,
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
  }, [loadDashboard, restoredSessionToken, session]);

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

  function handleLogout() {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(dashboardCacheKey);
    setSession(null);
    setPatients([]);
    setDoctors([]);
    setAppointments([]);
    setPatientTotal(0);
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
          city: patientForm.city || undefined,
          state: patientForm.state || undefined,
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
          specialties: doctorForm.specialties
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          phone: doctorForm.phone || undefined,
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

  function openPatientModule() {
    navigate('/pacientes');
  }

  function openTeamModule() {
    navigate('/equipe');
  }

  function openSchedulingModule() {
    navigate('/agendamento');
  }

  const canCreateAppointment = patients.length > 0 && doctors.length > 0;

  if (!session) {
    return (
      <LoginScreen
        appointments={appointments}
        doctors={doctors}
        handleLogin={handleLogin}
        isSubmitting={isSubmitting}
        loginForm={loginForm}
        patientTotal={patientTotal}
        setLoginForm={setLoginForm}
      />
    );
  }

  return (
    <Routes>
      <Route
        element={
          <WorkspaceLayout
            activeModules={activeModules}
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
              appointments={appointments}
              canCreateAppointment={canCreateAppointment}
              doctors={doctors}
              openPatientModule={openPatientModule}
              openSchedulingModule={openSchedulingModule}
              openTeamModule={openTeamModule}
              patientTotal={patientTotal}
              patients={patients}
              upcomingModules={upcomingModules}
            />
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
          path="/atendimento"
          element={<CarePage appointments={appointments} patients={patients} />}
        />
        <Route
          path="/equipe"
          element={
            <TeamPage
              doctors={doctors}
              form={doctorForm}
              isSubmitting={isSubmitting}
              onPrepareDoctor={prepareDoctorForScheduling}
              onSubmit={createDoctor}
              setForm={setDoctorForm}
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/central" />} />
      </Route>
    </Routes>
  );
}

type LoginScreenProps = {
  appointments: Appointment[];
  doctors: Doctor[];
  handleLogin: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  loginForm: {
    email: string;
    password: string;
  };
  patientTotal: number;
  setLoginForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      password: string;
    }>
  >;
};

function LoginScreen({
  appointments,
  doctors,
  handleLogin,
  isSubmitting,
  loginForm,
  patientTotal,
  setLoginForm,
}: LoginScreenProps) {
  return (
    <main className="app-shell">
      <section className="login-shell">
        <section className="login-banner">
          <div className="banner-copy">
            <p className="eyebrow">Hospital System</p>
            <h1>Navegacao por modulos, mais direta e mais operacional.</h1>
            <p className="banner-lead">
              Agora o frontend ja nasce no formato de paginas inteiras por
              modulo, com fluxo claro para Pacientes, Agendamento e
              Atendimento.
            </p>
          </div>

          <div className="banner-metrics">
            <article className="banner-tile">
              <span>Pacientes</span>
              <strong>{patientTotal}</strong>
              <small>base carregada</small>
            </article>
            <article className="banner-tile">
              <span>Medicos</span>
              <strong>{doctors.length}</strong>
              <small>cadastro ativo</small>
            </article>
            <article className="banner-tile">
              <span>Consultas</span>
              <strong>{appointments.length}</strong>
              <small>agenda registrada</small>
            </article>
          </div>

          <div className="roadmap-strip">
            {upcomingModules.map((moduleName) => (
              <span className="roadmap-chip" key={moduleName}>
                {moduleName}
              </span>
            ))}
          </div>
        </section>

        <form className="auth-card" onSubmit={handleLogin}>
          <div className="card-topline">
            <div>
              <p className="eyebrow">Acesso local</p>
              <h2>Entrar no painel</h2>
            </div>
            <span className="inline-badge">API {API_URL}</span>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Acessar sistema'}
          </button>

          <div className="helper-block">
            <strong>Seed pronta</strong>
            <span>admin@hospital.local</span>
            <span>Admin123!</span>
          </div>
        </form>
      </section>
    </main>
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
              <h1>Hospital Control</h1>
            </div>
          </div>

          <div className="topbar-meta">
            <div className="session-chip">
              <span className="session-name">{session.profile.name}</span>
              <span className="session-role">{session.profile.role}</span>
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
  appointments: Appointment[];
  canCreateAppointment: boolean;
  doctors: Doctor[];
  openPatientModule: () => void;
  openSchedulingModule: () => void;
  openTeamModule: () => void;
  patientTotal: number;
  patients: Patient[];
  upcomingModules: string[];
};

function OverviewPage({
  appointments,
  canCreateAppointment,
  doctors,
  openPatientModule,
  openSchedulingModule,
  openTeamModule,
  patientTotal,
  patients,
  upcomingModules,
}: OverviewPageProps) {
  const nextAppointments = [...appointments]
    .sort(
      (left, right) =>
        new Date(left.appointmentDate).getTime() -
        new Date(right.appointmentDate).getTime(),
    )
    .slice(0, 6);
  const recentPatients = patients.slice(0, 5);

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Pacientes</span>
          <strong>{patientTotal}</strong>
          <small>base operacional</small>
        </article>
        <article className="summary-card">
          <span>Medicos</span>
          <strong>{doctors.length}</strong>
          <small>cadastro ativo</small>
        </article>
        <article className="summary-card">
          <span>Consultas</span>
          <strong>{appointments.length}</strong>
          <small>agenda registrada</small>
        </article>
        <article className="summary-card">
          <span>Modulos</span>
          <strong>{activeModules.length + upcomingModules.length}</strong>
          <small>mapa planejado</small>
        </article>
      </section>

      <section className="page-grid overview-grid">
        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Ponto de controle</p>
                <h2>Central operacional</h2>
              </div>
            </div>

            <div className="overview-pulse">
              <div className="pulse-card">
                <span>Agenda pronta</span>
                <strong>{canCreateAppointment ? 'SIM' : 'PENDENTE'}</strong>
                <small>precisa de medico e paciente</small>
              </div>
              <div className="pulse-card">
                <span>Proximas consultas</span>
                <strong>{nextAppointments.length}</strong>
                <small>sequencia da agenda</small>
              </div>
              <div className="pulse-card">
                <span>Pacientes recentes</span>
                <strong>{recentPatients.length}</strong>
                <small>cadastros mais novos</small>
              </div>
            </div>

            <div className="quick-actions">
              <button className="ghost-button" onClick={openPatientModule} type="button">
                Abrir pacientes
              </button>
              <button className="ghost-button" onClick={openSchedulingModule} type="button">
                Abrir agendamento
              </button>
              <button className="ghost-button" onClick={openTeamModule} type="button">
                Abrir equipe
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Agenda</p>
                <h2>Consultas em evidencia</h2>
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

              {nextAppointments.length === 0 ? (
                <p className="empty-state">Nenhuma consulta registrada ainda.</p>
              ) : (
                nextAppointments.map((appointment) => (
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
        </div>

        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Pacientes</p>
                <h2>Ultimos cadastrados</h2>
              </div>
            </div>

            <div className="list-shell">
              {recentPatients.length === 0 ? (
                <p className="empty-state">Ainda nao ha pacientes cadastrados.</p>
              ) : (
                recentPatients.map((patient) => (
                  <div className="list-row" key={patient.id}>
                    <div>
                      <strong>{patient.name}</strong>
                      <span>{patient.cpf}</span>
                    </div>
                    <div>
                      <span>{patient.phone}</span>
                      <span>{patient.city || 'Cidade nao informada'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Proximos modulos</p>
                <h2>Trilha de execucao</h2>
              </div>
            </div>

            <div className="module-stack">
              {upcomingModules.map((moduleName, index) => (
                <div className="module-line" key={moduleName}>
                  <span className="module-order">{index + 1}</span>
                  <div>
                    <strong>{moduleName}</strong>
                    <small>entra depois da base operacional atual</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
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
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchPatient(patient, deferredSearch)),
    [deferredSearch, patients],
  );

  return (
    <section className="page-grid module-grid">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Busca e selecao</h2>
          </div>
          <div className="toolbar-inline">
            <input
              className="search-input"
              placeholder="Buscar por nome, CPF, telefone ou cidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="inline-badge">
              {filteredPatients.length} de {patientTotal}
            </span>
          </div>
        </div>

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
                <span>{patient.name}</span>
                <span>{patient.cpf}</span>
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

      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h2>Novo paciente</h2>
          </div>
        </div>

        <div className="section-block">
          <p className="section-title">Identificacao</p>
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
          </div>
        </div>

        <div className="section-block">
          <p className="section-title">Contato e clinico</p>
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

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Salvando...' : 'Cadastrar paciente'}
        </button>
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

type CarePageProps = {
  appointments: Appointment[];
  patients: Patient[];
};

function CarePage({ appointments, patients }: CarePageProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredQueue = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (!matchAppointment(appointment, deferredSearch)) {
          return false;
        }

        return ['AGENDADA', 'CONFIRMADA', 'REALIZADA'].includes(
          appointment.status,
        );
      }),
    [appointments, deferredSearch],
  );
  const todayAppointments = appointments.filter((appointment) =>
    isToday(appointment.appointmentDate),
  );
  const waitingCount = todayAppointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const completedToday = todayAppointments.filter(
    (appointment) => appointment.status === 'REALIZADA',
  ).length;
  const missingToday = todayAppointments.filter(
    (appointment) => appointment.status === 'NAO_COMPARECEU',
  ).length;

  return (
    <>
      <section className="summary-strip care-strip">
        <article className="summary-card">
          <span>Fila de hoje</span>
          <strong>{todayAppointments.length}</strong>
          <small>consultas do dia</small>
        </article>
        <article className="summary-card">
          <span>Aguardando</span>
          <strong>{waitingCount}</strong>
          <small>recepcao e chamada</small>
        </article>
        <article className="summary-card">
          <span>Realizadas</span>
          <strong>{completedToday}</strong>
          <small>fechadas hoje</small>
        </article>
        <article className="summary-card">
          <span>Base total</span>
          <strong>{patients.length}</strong>
          <small>pacientes cadastrados</small>
        </article>
      </section>

      <section className="page-grid overview-grid">
        <article className="panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Atendimento</p>
              <h2>Fila operacional</h2>
            </div>
            <div className="toolbar-inline">
              <input
                className="search-input"
                placeholder="Buscar por paciente, medico, status ou tipo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="inline-badge">{filteredQueue.length} na fila</span>
            </div>
          </div>

          <div className="table-shell">
            <div className="table-head care-grid">
              <span>Paciente</span>
              <span>Medico</span>
              <span>Horario</span>
              <span>Status</span>
            </div>

            {filteredQueue.length === 0 ? (
              <p className="empty-state">Nenhum atendimento visivel na fila.</p>
            ) : (
              filteredQueue.map((appointment) => (
                <div className="table-row care-grid" key={appointment.id}>
                  <span>{appointment.patient.name}</span>
                  <span>{appointment.doctor.user.name}</span>
                  <span>{formatDateTime(appointment.appointmentDate)}</span>
                  <span>
                    <em className={`status-dot ${statusTone(appointment.status)}`} />
                    {appointment.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Base inicial</p>
                <h2>Primeira versao de atendimento</h2>
              </div>
            </div>

            <ol className="action-list">
              <li>Recepcao e fila a partir da agenda.</li>
              <li>Visualizacao rapida do paciente e do profissional.</li>
              <li>Separacao entre aguardando, realizado e ausente.</li>
              <li>Proxima etapa: ficha clinica e evolucao.</li>
            </ol>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Alertas do dia</p>
                <h2>Leitura de status</h2>
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
                  <strong>Realizadas hoje</strong>
                  <span>consulta fechada</span>
                </div>
                <div>
                  <span>{completedToday}</span>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <strong>Ausencias</strong>
                  <span>nao compareceu</span>
                </div>
                <div>
                  <span>{missingToday}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

type TeamPageProps = {
  doctors: Doctor[];
  form: DoctorFormState;
  isSubmitting: boolean;
  onPrepareDoctor: (doctorId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<DoctorFormState>>;
};

function TeamPage({
  doctors,
  form,
  isSubmitting,
  onPrepareDoctor,
  onSubmit,
  setForm,
}: TeamPageProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredDoctors = useMemo(
    () => doctors.filter((doctor) => matchDoctor(doctor, deferredSearch)),
    [deferredSearch, doctors],
  );

  return (
    <section className="page-grid module-grid">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Equipe medica</p>
            <h2>Busca e preparacao de agenda</h2>
          </div>
          <div className="toolbar-inline">
            <input
              className="search-input"
              placeholder="Buscar por nome, CRM, email ou especialidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="inline-badge">{filteredDoctors.length} ativos</span>
          </div>
        </div>

        <div className="table-shell">
          <div className="table-head doctors-grid">
            <span>Profissional</span>
            <span>CRM</span>
            <span>Especialidades</span>
            <span>Acao</span>
          </div>

          {filteredDoctors.length === 0 ? (
            <p className="empty-state">Nenhum medico encontrado com esse filtro.</p>
          ) : (
            filteredDoctors.map((doctor) => (
              <div className="table-row doctors-grid" key={doctor.id}>
                <span>{doctor.user.name}</span>
                <span>
                  {doctor.crm}/{doctor.crmUf}
                </span>
                <span>{doctor.specialties.join(', ')}</span>
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

      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Cadastro</p>
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
              <span>Senha inicial</span>
              <input
                type="password"
                minLength={6}
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
          <p className="section-title">Registro profissional</p>
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

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Salvando...' : 'Cadastrar medico'}
        </button>
      </form>
    </section>
  );
}

function matchPatient(patient: Patient, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    patient.name,
    patient.cpf,
    patient.phone,
    patient.city,
    patient.state,
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
    doctor.user.email,
    doctor.crm,
    doctor.crmUf,
    doctor.phone,
    doctor.specialties.join(' '),
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
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

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default App;
