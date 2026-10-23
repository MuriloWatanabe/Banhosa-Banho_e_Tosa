import { notFound } from 'next/navigation';
import { getAppointment } from '@/services/api';
import { AlterarStatusForm } from './AlterarStatusForm';

type Props = { params: Promise<{ id: string }> };

export default async function AlterarStatusPage({ params }: Props) {
  const { id } = await params;
  const appointment = await getAppointment(id);
  if (!appointment) notFound();
  return <AlterarStatusForm appointment={appointment} />;
}
