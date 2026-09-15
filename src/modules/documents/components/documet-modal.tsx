"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { X } from "lucide-react";

type DocumentModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
};

export function DocumentModal({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
}: DocumentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog?.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;

      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
      className={`fixed inset-0 m-auto max-h-[90dvh]
        w-[calc(100%_-_2rem)] overflow-auto rounded-2xl
        border border-[#DDE3DC] bg-white p-0 text-[#243E35]
        shadow-2xl backdrop:bg-[#10251E]/50
        ${wide ? "max-w-6xl" : "max-w-2xl"}`}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#E8ECE6] bg-white px-5 py-3">
        <h2
          id={titleId}
          className="min-w-0 break-words text-base font-semibold"
        >
          {title}
        </h2>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fermer la fenêtre"
          className="flex size-11 shrink-0 items-center justify-center
            rounded-lg text-[#65716A] hover:bg-[#F0F3EF]
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#285448]
            disabled:cursor-wait disabled:opacity-40"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      {children}
    </dialog>
  );
}