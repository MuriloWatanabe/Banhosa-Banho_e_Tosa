import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Banhosa | Banho e Tosa',
  description: 'Sistema de gestão de agendamentos para pet shop.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
