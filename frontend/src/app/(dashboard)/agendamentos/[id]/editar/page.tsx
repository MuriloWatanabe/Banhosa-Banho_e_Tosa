import { notFound } from 'next/navigation';
import { getAppointment, getPets, getProfessionals } from '@/services/api';
import { AgendamentoForm } from '../../AgendamentoForm';

type Props = { params: Promise<{ id: string }> };

export default async function EditarAgendamentoPage({ params }: Props) {
  const { id } = await params;
  const [appointment, pets, professionals] = await Promise.all([getAppointment(id), getPets(), getProfessionals()]);
  if (!appointment) notFound();
  return <AgendamentoForm pets={pets} professionals={professionals} appointment={appointment} />;
}
