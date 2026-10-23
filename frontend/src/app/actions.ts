'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  AUTH_COOKIE_NAME,
  changeAppointmentStatus,
  createAppointment,
  createPet,
  createProfessional,
  createTutor,
  deleteAppointment,
  deletePet,
  deleteProfessional,
  deleteTutor,
  login,
  updateAppointment,
} from '@/services/api';
import {
  AppointmentCreateInput,
  AppointmentStatus,
  AppointmentUpdateInput,
  PetCreateInput,
  ProfessionalCreateInput,
  TutorCreateInput,
} from '@/types';

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// --- Autenticação -----------------------------------------------------------

export async function loginAction(username: string, password: string): Promise<{ error?: string }> {
  try {
    const token = await login(username, password);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8h — mesmo tempo de expiração configurado no backend
    });
    return {};
  } catch (error) {
    return { error: toErrorMessage(error, 'Usuário ou senha incorretos.') };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

// --- Criação ------------------------------------------------------------------

export async function createTutorAction(
  input: TutorCreateInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createTutor>>>> {
  try {
    const tutor = await createTutor(input);
    revalidatePath('/tutores');
    revalidatePath('/dashboard');
    return { data: tutor };
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível cadastrar o tutor.') };
  }
}

export async function createPetAction(
  input: PetCreateInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createPet>>>> {
  try {
    const pet = await createPet(input);
    revalidatePath('/pets');
    revalidatePath('/tutores');
    revalidatePath('/dashboard');
    return { data: pet };
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível cadastrar o pet.') };
  }
}

export async function createProfessionalAction(
  input: ProfessionalCreateInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createProfessional>>>> {
  try {
    const professional = await createProfessional(input);
    revalidatePath('/profissionais');
    revalidatePath('/dashboard');
    return { data: professional };
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível cadastrar o profissional.') };
  }
}

export async function createAppointmentAction(
  input: AppointmentCreateInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createAppointment>>>> {
  try {
    const appointment = await createAppointment(input);
    revalidatePath('/agendamentos');
    revalidatePath('/dashboard');
    return { data: appointment };
  } catch (error) {
    // RN-01/RN-02 e demais validações de negócio chegam aqui como erro
    // (ex.: 409 de conflito de horário, 422 de horário fora do expediente).
    return { error: toErrorMessage(error, 'Não foi possível criar o agendamento.') };
  }
}

// --- Edição -------------------------------------------------------------------

export async function updateAppointmentAction(
  id: string,
  input: AppointmentUpdateInput,
): Promise<ActionResult<Awaited<ReturnType<typeof updateAppointment>>>> {
  try {
    const appointment = await updateAppointment(id, input);
    revalidatePath('/agendamentos');
    revalidatePath('/dashboard');
    return { data: appointment };
  } catch (error) {
    // Mesmos erros de negócio da criação (409 conflito, 422 fora do expediente)
    // e também o 422 de agendamento em status final (não editável).
    return { error: toErrorMessage(error, 'Não foi possível salvar o agendamento.') };
  }
}

export async function changeAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
): Promise<ActionResult<Awaited<ReturnType<typeof changeAppointmentStatus>>>> {
  try {
    const appointment = await changeAppointmentStatus(id, status);
    revalidatePath('/agendamentos');
    revalidatePath('/dashboard');
    return { data: appointment };
  } catch (error) {
    // Transições inválidas (ex.: reabrir um agendamento Concluído) chegam aqui como 422.
    return { error: toErrorMessage(error, 'Não foi possível alterar o status do agendamento.') };
  }
}

// --- Remoção -------------------------------------------------------------------

export async function deleteTutorAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteTutor(id);
    revalidatePath('/tutores');
    revalidatePath('/dashboard');
    return {};
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível excluir o tutor.') };
  }
}

export async function deletePetAction(id: string): Promise<{ error?: string }> {
  try {
    await deletePet(id);
    revalidatePath('/pets');
    revalidatePath('/tutores');
    revalidatePath('/dashboard');
    return {};
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível excluir o pet.') };
  }
}

export async function deleteProfessionalAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteProfessional(id);
    revalidatePath('/profissionais');
    revalidatePath('/dashboard');
    return {};
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível excluir o profissional.') };
  }
}

export async function deleteAppointmentAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteAppointment(id);
    revalidatePath('/agendamentos');
    revalidatePath('/dashboard');
    return {};
  } catch (error) {
    return { error: toErrorMessage(error, 'Não foi possível excluir o agendamento.') };
  }
}
