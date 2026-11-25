'use client';

import Tooltip from './Tooltip';
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  tone = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-amber-600 hover:bg-amber-700';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="vnc-slide-up w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Tooltip label={cancelText} align="left">
            <button type="button" onClick={onCancel} disabled={busy} className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              {cancelText}
            </button>
          </Tooltip>
          <Tooltip label={busy ? 'Acción en proceso' : confirmText} align="right">
            <button type="button" onClick={onConfirm} disabled={busy} className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${confirmClass}`}>
              {busy ? 'Procesando...' : confirmText}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
