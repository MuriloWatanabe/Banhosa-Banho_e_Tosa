'use client';

import { Pet, Professional } from '@/types';
import { AgendamentoForm } from '../AgendamentoForm';

type Props = { pets: Pet[]; professionals: Professional[] };

export function NovoAgendamentoForm({ pets, professionals }: Props) {
  return <AgendamentoForm pets={pets} professionals={professionals} />;
}
