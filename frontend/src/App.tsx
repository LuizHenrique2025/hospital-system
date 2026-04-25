import { startTransition, useCallback, useState } from 'react';
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

type Notice = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

type View = 'overview' | 'patients' | 'doctors' | 'appointments';

const storageKey = 'hospital-system.session';
const dashboardCacheKey = 'hospital-system.dashboard';

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

const initialPatientForm = {
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

const initialDoctorForm = {
  name: '',
  email: '',
  password: '',
  crm: '',
  crmUf: 'SP',
  specialties: '',
  phone: '',
  bio: '',
};

const initialAppointmentForm = {
  patientId: '',
  doctorId: '',
  appointmentDate: '',
  type: 'PRIMEIRA_CONSULTA',
  status: 'AGENDADA',
  notes: '',
};

function App() {
  const cachedDashboard = readStoredValue<{
    patients: Patient[];
    patientTotal: number;
    doctors: Doctor[];
    appointments: Appointment[];
  }>(dashboardCacheKey);
  const [session, setSession] = useState<Session | null>(() => {
    return readStoredValue<Session>(storageKey);
  });
  const [view, setView] = useState<View>('overview');
  const [notice, setNotice] = useState<Notice | null>({
    kind: 'info',
    text: 'Use o seed gerado: admin@hospital.local / Admin123!',
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

  const loadDashboard = useCallback(async (token = session?.token) => {
    if (!token) {
      return;
    }

    setIsBusy(true);

    try {
      const [profile, patientResponse, doctorResponse, appointmentResponse] =
        await Promise.all([
          apiRequest<UserProfile>('/auth/profile', { token }),
          apiRequest<PaginatedResponse<Patient>>('/patients?page=1&limit=50', {
            token,
          }),
          apiRequest<Doctor[]>('/doctors', { token }),
          apiRequest<Appointment[]>('/appointments', { token }),
        ]);

      const nextSession = { token, profile };

      const nextPatients = patientResponse.data ?? [];
      const nextPatientTotal =
        patientResponse.meta?.total ??
        patientResponse.total ??
        nextPatients.length;

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
        text: 'Painel atualizado com sucesso.',
      });
    } catch (error) {
      localStorage.removeItem(storageKey);
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
  }, [session?.token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const auth = await apiRequest<{ access_token: string }>('/auth/login', {
        body: loginForm,
      });
      await loadDashboard(auth.access_token);
      setView('overview');
      setNotice({
        kind: 'success',
        text: 'Sessao iniciada com sucesso.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel entrar na plataforma.',
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
    setNotice({
      kind: 'info',
      text: 'Sessao encerrada. Entre novamente quando quiser.',
    });
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
      setNotice({
        kind: 'success',
        text: 'Paciente cadastrado com sucesso.',
      });
      await loadDashboard(session.token);
      setView('patients');
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
      setNotice({
        kind: 'success',
        text: 'Medico cadastrado e vinculado ao usuario com sucesso.',
      });
      await loadDashboard(session.token);
      setView('doctors');
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
      setNotice({
        kind: 'success',
        text: 'Consulta agendada com sucesso.',
      });
      await loadDashboard(session.token);
      setView('appointments');
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel agendar a consulta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canCreateAppointment = patients.length > 0 && doctors.length > 0;

  return (
    <main className="app-frame">
      {!session ? (
        <section className="login-layout">
          <div className="login-copy">
            <p className="eyebrow">Hospital System</p>
            <h1>Painel simples para operar a API hospitalar.</h1>
            <p className="lead">
              Esta interface liga direto no backend NestJS e ajuda a validar o
              fluxo principal sem depender do Swagger o tempo todo.
            </p>
            <div className="hero-cards">
              <article className="hero-card">
                <strong>1. Conectar</strong>
                <span>Login por JWT usando a API real.</span>
              </article>
              <article className="hero-card">
                <strong>2. Cadastrar</strong>
                <span>Pacientes e medicos em poucos passos.</span>
              </article>
              <article className="hero-card">
                <strong>3. Visualizar</strong>
                <span>Consultas, totais e ritmo operacional.</span>
              </article>
            </div>
          </div>

          <form className="panel login-panel" onSubmit={handleLogin}>
            <div className="panel-heading">
              <div>
                <p className="kicker">Acesso local</p>
                <h2>Entrar no sistema</h2>
              </div>
              <span className="status-pill">API em {API_URL}</span>
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
              {isSubmitting ? 'Entrando...' : 'Entrar com ADMIN'}
            </button>

            <div className="helper-box">
              <strong>Credencial criada agora</strong>
              <span>`admin@hospital.local`</span>
              <span>`Admin123!`</span>
            </div>
          </form>
        </section>
      ) : (
        <section className="workspace-layout">
          <aside className="sidebar">
            <div className="brand-block">
              <p className="eyebrow">Ambiente local</p>
              <h2>Hospital Control</h2>
              <p>
                Visualizacao enxuta para cadastros, consulta do acervo e
                validacao da API em tempo real.
              </p>
            </div>

            <div className="profile-card">
              <span className="avatar">
                {session.profile.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{session.profile.name}</strong>
                <span>{session.profile.role}</span>
              </div>
            </div>

            <nav className="nav-list">
              {[
                ['overview', 'Visao geral'],
                ['patients', 'Pacientes'],
                ['doctors', 'Medicos'],
                ['appointments', 'Consultas'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={view === key ? 'nav-button active' : 'nav-button'}
                  onClick={() => setView(key as View)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="sidebar-actions">
              <button
                className="ghost-button"
                onClick={() => void loadDashboard()}
                type="button"
              >
                {isBusy ? 'Atualizando...' : 'Atualizar dados'}
              </button>
              <button className="ghost-button" onClick={handleLogout} type="button">
                Sair
              </button>
            </div>
          </aside>

          <div className="workspace">
            <header className="hero-panel">
              <div>
                <p className="kicker">Operacao assistida</p>
                <h1>Base pronta para navegar, cadastrar e validar fluxos.</h1>
              </div>
              <div className="hero-meta">
                <span>{patientTotal} pacientes</span>
                <span>{doctors.length} medicos</span>
                <span>{appointments.length} consultas</span>
              </div>
            </header>

            {notice ? (
              <div className={`notice notice-${notice.kind}`}>{notice.text}</div>
            ) : null}

            {view === 'overview' ? (
              <>
                <section className="card-grid">
                  <article className="metric-card">
                    <span>Pacientes ativos</span>
                    <strong>{patientTotal}</strong>
                    <p>Cadastro clinico, busca e consulta por CPF.</p>
                  </article>
                  <article className="metric-card">
                    <span>Medicos disponiveis</span>
                    <strong>{doctors.length}</strong>
                    <p>Perfis profissionais com CRM e especialidades.</p>
                  </article>
                  <article className="metric-card">
                    <span>Consultas registradas</span>
                    <strong>{appointments.length}</strong>
                    <p>Agendamentos vinculados a paciente e medico.</p>
                  </article>
                </section>

                <section className="grid-two">
                  <article className="panel">
                    <div className="panel-heading">
                      <div>
                        <p className="kicker">Proximos passos</p>
                        <h2>Ordem mais util agora</h2>
                      </div>
                    </div>
                    <ol className="step-list">
                      <li>Cadastrar ao menos um medico.</li>
                      <li>Cadastrar pacientes reais ou de teste.</li>
                      <li>Agendar consultas e acompanhar o retorno da API.</li>
                    </ol>
                  </article>

                  <article className="panel">
                    <div className="panel-heading">
                      <div>
                        <p className="kicker">Rotas de apoio</p>
                        <h2>Acesso rapido</h2>
                      </div>
                    </div>
                    <div className="quick-links">
                      <a href="http://localhost:3000/api/docs" target="_blank">
                        Abrir Swagger
                      </a>
                      <a href="http://localhost:3000/api/auth/profile" target="_blank">
                        Testar profile
                      </a>
                    </div>
                  </article>
                </section>
              </>
            ) : null}

            {view === 'patients' ? (
              <section className="grid-two">
                <form className="panel" onSubmit={createPatient}>
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Cadastro</p>
                      <h2>Novo paciente</h2>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Nome</span>
                      <input
                        value={patientForm.name}
                        onChange={(event) =>
                          setPatientForm((current) => ({
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
                        value={patientForm.cpf}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            cpf: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Data de nascimento</span>
                      <input
                        type="date"
                        value={patientForm.birthDate}
                        onChange={(event) =>
                          setPatientForm((current) => ({
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
                        value={patientForm.gender}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            gender: event.target.value,
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
                        value={patientForm.phone}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Tipo sanguineo</span>
                      <select
                        value={patientForm.bloodType}
                        onChange={(event) =>
                          setPatientForm((current) => ({
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
                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={patientForm.email}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Cidade</span>
                      <input
                        value={patientForm.city}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Estado</span>
                      <input
                        value={patientForm.state}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field field-full">
                      <span>Alergias</span>
                      <textarea
                        value={patientForm.allergies}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            allergies: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field field-full">
                      <span>Historico medico</span>
                      <textarea
                        value={patientForm.medicalHistory}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            medicalHistory: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Cadastrar paciente'}
                  </button>
                </form>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Base clinica</p>
                      <h2>Pacientes registrados</h2>
                    </div>
                    <span className="status-pill">{patientTotal} total</span>
                  </div>
                  <div className="list-stack">
                    {patients.length === 0 ? (
                      <p className="empty-state">
                        Nenhum paciente cadastrado ainda.
                      </p>
                    ) : (
                      patients.map((patient) => (
                        <article className="list-card" key={patient.id}>
                          <div>
                            <strong>{patient.name}</strong>
                            <span>
                              {patient.gender} - CPF {patient.cpf}
                            </span>
                          </div>
                          <div>
                            <span>{patient.phone}</span>
                            <span>{patient.city || 'Cidade nao informada'}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </article>
              </section>
            ) : null}

            {view === 'doctors' ? (
              <section className="grid-two">
                <form className="panel" onSubmit={createDoctor}>
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Equipe</p>
                      <h2>Novo medico</h2>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Nome do usuario</span>
                      <input
                        value={doctorForm.name}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
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
                        value={doctorForm.email}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
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
                        type="password"
                        value={doctorForm.password}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        minLength={6}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>CRM</span>
                      <input
                        value={doctorForm.crm}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
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
                        value={doctorForm.crmUf}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
                            ...current,
                            crmUf: event.target.value.toUpperCase(),
                          }))
                        }
                        maxLength={2}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Telefone</span>
                      <input
                        value={doctorForm.phone}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field field-full">
                      <span>Especialidades</span>
                      <input
                        value={doctorForm.specialties}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
                            ...current,
                            specialties: event.target.value,
                          }))
                        }
                        placeholder="Cardiologia, Clinico Geral"
                        required
                      />
                    </label>
                    <label className="field field-full">
                      <span>Bio</span>
                      <textarea
                        value={doctorForm.bio}
                        onChange={(event) =>
                          setDoctorForm((current) => ({
                            ...current,
                            bio: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Cadastrar medico'}
                  </button>
                </form>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Corpo clinico</p>
                      <h2>Medicos cadastrados</h2>
                    </div>
                    <span className="status-pill">{doctors.length} total</span>
                  </div>
                  <div className="list-stack">
                    {doctors.length === 0 ? (
                      <p className="empty-state">
                        Cadastre o primeiro medico para liberar o agendamento.
                      </p>
                    ) : (
                      doctors.map((doctor) => (
                        <article className="list-card" key={doctor.id}>
                          <div>
                            <strong>{doctor.user.name}</strong>
                            <span>
                              CRM {doctor.crm}/{doctor.crmUf}
                            </span>
                          </div>
                          <div className="tag-row">
                            {doctor.specialties.map((specialty) => (
                              <span className="tag" key={specialty}>
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </article>
              </section>
            ) : null}

            {view === 'appointments' ? (
              <section className="grid-two">
                <form className="panel" onSubmit={createAppointment}>
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Agenda</p>
                      <h2>Nova consulta</h2>
                    </div>
                  </div>

                  <div className="form-grid">
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
                    <label className="field field-full">
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
                    type="submit"
                    disabled={isSubmitting || !canCreateAppointment}
                  >
                    {isSubmitting ? 'Agendando...' : 'Agendar consulta'}
                  </button>

                  {!canCreateAppointment ? (
                    <p className="empty-state compact">
                      Cadastre ao menos um paciente e um medico antes de
                      agendar.
                    </p>
                  ) : null}
                </form>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="kicker">Linha do tempo</p>
                      <h2>Consultas registradas</h2>
                    </div>
                    <span className="status-pill">{appointments.length} total</span>
                  </div>
                  <div className="list-stack">
                    {appointments.length === 0 ? (
                      <p className="empty-state">
                        Nenhuma consulta encontrada ainda.
                      </p>
                    ) : (
                      appointments.map((appointment) => (
                        <article className="list-card" key={appointment.id}>
                          <div>
                            <strong>{appointment.patient.name}</strong>
                            <span>{appointment.doctor.user.name}</span>
                          </div>
                          <div>
                            <span>
                              {formatDateTime(appointment.appointmentDate)}
                            </span>
                            <span>
                              {appointment.type} - {appointment.status}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        </section>
      )}
    </main>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default App;
