"use client";

import type { ReactNode } from "react";

type GameSearchModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function GameSearchModal({ open, title, onClose, children }: GameSearchModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="max-w-full text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
