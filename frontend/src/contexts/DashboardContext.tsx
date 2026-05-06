import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiRequest } from '../lib/api';
import type {
  Appointment,
  AuditSummary,
  CommunicationDashboard,
  Doctor,
  Nurse,
  PaginatedResponse,
  Patient,
  Sector,
  UserProfile,
} from '../lib/types';
import { useAuth } from './AuthContext';

type DashboardCache = {
  auditSummary: AuditSummary;
  appointments: Appointment[];
  communicationDashboard: CommunicationDashboard;
  doctors: Doctor[];
  nurses: Nurse[];
  patients: Patient[];
  patientTotal: number;
  sectors: Sector[];
  users: UserProfile[];
};

type DashboardContextValue = DashboardCache & {
  isDashboardBusy: boolean;
  loadDashboard: (token: string) => Promise<void>;
  resetDashboard: () => void;
};

export const emptyCommunicationDashboard: CommunicationDashboard = {
  commemorativeDates: [],
  emails: [],
  notices: [],
  updates: [],
};

export const emptyAuditSummary: AuditSummary = {
  last24h: 0,
  patientAccesses: 0,
  retentionPolicy: 'Auditoria operacional em preparacao.',
  total: 0,
  writeOperations: 0,
};

const dashboardCacheKey = 'hospital-system.dashboard';

const emptyDashboard: DashboardCache = {
  appointments: [],
  auditSummary: emptyAuditSummary,
  communicationDashboard: emptyCommunicationDashboard,
  doctors: [],
  nurses: [],
  patients: [],
  patientTotal: 0,
  sectors: [],
  users: [],
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { clearSession, setSession } = useAuth();
  const [cachedDashboard] = useState<DashboardCache | null>(() =>
    readStoredValue<DashboardCache>(dashboardCacheKey),
  );
  const [users, setUsers] = useState<UserProfile[]>(
    cachedDashboard?.users ?? emptyDashboard.users,
  );
  const [patients, setPatients] = useState<Patient[]>(
    cachedDashboard?.patients ?? emptyDashboard.patients,
  );
  const [patientTotal, setPatientTotal] = useState(
    cachedDashboard?.patientTotal ?? emptyDashboard.patientTotal,
  );
  const [doctors, setDoctors] = useState<Doctor[]>(
    cachedDashboard?.doctors ?? emptyDashboard.doctors,
  );
  const [nurses, setNurses] = useState<Nurse[]>(
    cachedDashboard?.nurses ?? emptyDashboard.nurses,
  );
  const [sectors, setSectors] = useState<Sector[]>(
    cachedDashboard?.sectors ?? emptyDashboard.sectors,
  );
  const [appointments, setAppointments] = useState<Appointment[]>(
    cachedDashboard?.appointments ?? emptyDashboard.appointments,
  );
  const [communicationDashboard, setCommunicationDashboard] =
    useState<CommunicationDashboard>(
      cachedDashboard?.communicationDashboard ??
        emptyDashboard.communicationDashboard,
    );
  const [auditSummary, setAuditSummary] = useState<AuditSummary>(
    cachedDashboard?.auditSummary ?? emptyDashboard.auditSummary,
  );
  const [isDashboardBusy, setIsDashboardBusy] = useState(false);

  const resetDashboard = useCallback(() => {
    localStorage.removeItem(dashboardCacheKey);
    setUsers(emptyDashboard.users);
    setPatients(emptyDashboard.patients);
    setPatientTotal(emptyDashboard.patientTotal);
    setDoctors(emptyDashboard.doctors);
    setNurses(emptyDashboard.nurses);
    setSectors(emptyDashboard.sectors);
    setAppointments(emptyDashboard.appointments);
    setCommunicationDashboard(emptyDashboard.communicationDashboard);
    setAuditSummary(emptyDashboard.auditSummary);
  }, []);

  const loadDashboard = useCallback(
    async (token: string) => {
      setIsDashboardBusy(true);

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
          auditSummaryResponse,
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
          apiRequest<PaginatedResponse<Appointment>>(
            '/appointments?page=1&limit=50',
            { token },
          ),
          apiRequest<CommunicationDashboard>('/communications/dashboard', {
            token,
          }),
          profile.role === 'ADMIN'
            ? apiRequest<AuditSummary>('/audit/summary', { token })
            : Promise.resolve(emptyAuditSummary),
        ]);

        const nextUsers = userResponse.data ?? [];
        const nextPatients = patientResponse.data ?? [];
        const nextPatientTotal =
          patientResponse.meta?.total ??
          patientResponse.total ??
          nextPatients.length;
        const nextDashboard = {
          appointments: appointmentResponse.data ?? [],
          auditSummary: auditSummaryResponse,
          communicationDashboard: communicationResponse,
          doctors: doctorResponse,
          nurses: nurseResponse,
          patients: nextPatients,
          patientTotal: nextPatientTotal,
          sectors: sectorResponse,
          users: nextUsers,
        };

        startTransition(() => {
          setSession({ token, profile });
          setUsers(nextDashboard.users);
          setPatients(nextDashboard.patients);
          setPatientTotal(nextDashboard.patientTotal);
          setDoctors(nextDashboard.doctors);
          setNurses(nextDashboard.nurses);
          setSectors(nextDashboard.sectors);
          setAppointments(nextDashboard.appointments);
          setCommunicationDashboard(nextDashboard.communicationDashboard);
          setAuditSummary(nextDashboard.auditSummary);
        });

        localStorage.setItem(dashboardCacheKey, JSON.stringify(nextDashboard));
      } catch (error) {
        clearSession();
        resetDashboard();
        throw error;
      } finally {
        setIsDashboardBusy(false);
      }
    },
    [clearSession, resetDashboard, setSession],
  );

  const value = useMemo(
    () => ({
      appointments,
      auditSummary,
      communicationDashboard,
      doctors,
      isDashboardBusy,
      loadDashboard,
      nurses,
      patients,
      patientTotal,
      resetDashboard,
      sectors,
      users,
    }),
    [
      appointments,
      auditSummary,
      communicationDashboard,
      doctors,
      isDashboardBusy,
      loadDashboard,
      nurses,
      patients,
      patientTotal,
      resetDashboard,
      sectors,
      users,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      'useDashboard deve ser usado dentro de DashboardProvider.',
    );
  }

  return context;
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
