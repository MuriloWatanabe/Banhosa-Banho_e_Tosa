export type PetSize = 'Pequeno' | 'Médio' | 'Grande' | 'Gigante';
export const APPOINTMENT_STATUSES = ['Pendente', 'Confirmado', 'Concluído', 'Cancelado'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Tutor {
  id: string;
  name: string;
  phone: string;
  email: string;
  petsCount: number;
}

export interface Pet {
  id: string;
  name: string;
  species: 'Cão' | 'Gato';
  breed: string;
  size: PetSize;
  tutorName: string;
}

export interface Professional {
  id: string;
  name: string;
  role: 'Tosador' | 'Veterinário';
  specialty: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  petId: string;
  professionalId: string;
  petName: string;
  tutorName: string;
  service: string;
  size: PetSize;
  professionalName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

// --- Payloads de criação (enviados à API) --------------------------------
// Diferem dos tipos acima porque a API espera IDs reais como referência
// (tutor_id, pet_id, profissional_id), não os nomes "achatados" usados
// apenas para exibição nas telas.

export interface TutorCreateInput {
  name: string;
  phone: string;
  email: string;
}

export interface PetCreateInput {
  name: string;
  species: 'Cão' | 'Gato';
  breed: string;
  size: PetSize;
  tutor_id: string;
}

export interface ProfessionalCreateInput {
  name: string;
  role: 'Tosador' | 'Veterinário';
  specialty: string;
  active: boolean;
}

export interface AppointmentCreateInput {
  pet_id: string;
  profissional_id: string;
  service: string;
  date: string;
  start_time: string;
  status?: AppointmentStatus;
}

// Remarcação (PUT /agendamentos/{id}). O status não vai aqui: ele só muda
// pelo endpoint dedicado (PATCH /agendamentos/{id}/status).
export type AppointmentUpdateInput = Omit<AppointmentCreateInput, 'status'>;

export interface DashboardData {
  totals: {
    appointmentsToday: number;
    activeClients: number;
    pets: number;
    professionals: number;
  };
  appointments: Appointment[];
}
