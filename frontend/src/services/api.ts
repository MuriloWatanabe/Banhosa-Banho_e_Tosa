import { cookies } from 'next/headers';
import {
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
  AppointmentUpdateInput,
  DashboardData,
  Pet,
  PetCreateInput,
  Professional,
  ProfessionalCreateInput,
  Tutor,
  TutorCreateInput,
} from '@/types';

// Este módulo roda exclusivamente no servidor (chamado por Server
// Components e Server Actions), então pode ler o cookie httpOnly com o
// JWT diretamente via next/headers, sem expor o token ao navegador.

const API_URL = process.env.API_URL ?? 'http://localhost:8000';
const API_PREFIX = '/api/v1';
export const AUTH_COOKIE_NAME = 'banhosa_token';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch {
    // corpo vazio ou não-JSON — mantém a mensagem padrão
  }
  return fallback;
}

async function authHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, `Erro ${response.status} ao comunicar com a API.`);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// --- Autenticação -----------------------------------------------------------
// Não passa por apiFetch pois ainda não existe token nesse momento.

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}${API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, 'Usuário ou senha incorretos.');
    throw new ApiError(response.status, message);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// --- Leituras -----------------------------------------------------------------

export async function getDashboardData(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard');
}

export async function getTutors(): Promise<Tutor[]> {
  return apiFetch<Tutor[]>('/tutores');
}

export async function getPets(): Promise<Pet[]> {
  return apiFetch<Pet[]>('/pets');
}

export async function getProfessionals(): Promise<Professional[]> {
  return apiFetch<Professional[]>('/profissionais');
}

export async function getAppointments(): Promise<Appointment[]> {
  return apiFetch<Appointment[]>('/agendamentos');
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  // A API não expõe GET /agendamentos/{id}; buscamos na listagem.
  const appointments = await getAppointments();
  return appointments.find((item) => item.id === id);
}

// --- Criação --------------------------------------------------------------

export async function createTutor(input: TutorCreateInput): Promise<Tutor> {
  return apiFetch<Tutor>('/tutores', { method: 'POST', body: JSON.stringify(input) });
}

export async function createPet(input: PetCreateInput): Promise<Pet> {
  return apiFetch<Pet>('/pets', { method: 'POST', body: JSON.stringify(input) });
}

export async function createProfessional(input: ProfessionalCreateInput): Promise<Professional> {
  return apiFetch<Professional>('/profissionais', { method: 'POST', body: JSON.stringify(input) });
}

export async function createAppointment(input: AppointmentCreateInput): Promise<Appointment> {
  // A duração (RN-01) e a disponibilidade (RN-02) são sempre calculadas e
  // validadas no backend — o frontend só envia a intenção do agendamento.
  return apiFetch<Appointment>('/agendamentos', { method: 'POST', body: JSON.stringify(input) });
}

// --- Edição ------------------------------------------------------------------

export async function updateAppointment(id: string, input: AppointmentUpdateInput): Promise<Appointment> {
  // Remarcação passa pelas mesmas validações da criação no backend (RN-01, RN-02).
  return apiFetch<Appointment>(`/agendamentos/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function changeAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  // As transições permitidas são decididas pelo backend.
  return apiFetch<Appointment>(`/agendamentos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// --- Remoção ----------------------------------------------------------------

export async function deleteTutor(id: string): Promise<{ id: string }> {
  await apiFetch<void>(`/tutores/${id}`, { method: 'DELETE' });
  return { id };
}

export async function deletePet(id: string): Promise<{ id: string }> {
  await apiFetch<void>(`/pets/${id}`, { method: 'DELETE' });
  return { id };
}

export async function deleteProfessional(id: string): Promise<{ id: string }> {
  await apiFetch<void>(`/profissionais/${id}`, { method: 'DELETE' });
  return { id };
}

export async function deleteAppointment(id: string): Promise<{ id: string }> {
  await apiFetch<void>(`/agendamentos/${id}`, { method: 'DELETE' });
  return { id };
}
