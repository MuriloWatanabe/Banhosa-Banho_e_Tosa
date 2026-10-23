'use client';

import { useTransition } from 'react';
import { Icon } from './Icon';

type Props = {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  confirmMessage?: string;
};

export function DeleteButton({ action, label, confirmMessage }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const message =
      confirmMessage ?? `Tem certeza que deseja excluir ${label}? Essa ação não pode ser desfeita.`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      className="icon-button icon-button-danger"
      onClick={handleClick}
      disabled={isPending}
      title={`Excluir ${label}`}
      aria-label={`Excluir ${label}`}
    >
      <Icon name="trash" />
    </button>
  );
}
