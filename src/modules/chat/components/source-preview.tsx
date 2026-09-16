"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { ChatCitation } from "../chat.types";

export function SourcePreview({
  citation,
  inline = false,
}: {
  citation: ChatCitation;
  inline?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  const sourceUrl =
  `/api/documents/${citation.documentId}` +
  `/versions/${citation.versionId}/preview`;

  const pdfUrl =
    sourceUrl +
    (citation.pageDebut !== null
      ? `#page=${citation.pageDebut}`
      : "");

  useEffect(() => {
    if (!open) return;

    const element = dialog.current;
    element?.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
  type="button"
  onClick={() => setOpen(true)}
  aria-label={`Consulter la source ${citation.numero} : ${citation.titre}`}
  aria-haspopup="dialog"
  className={
    inline
      ? "mx-1 inline-flex rounded-md bg-[#EAF2E8] px-1.5 py-0.5 text-xs font-semibold text-[#173E36] align-baseline hover:bg-[#DCE8D7] focus-visible:outline-2 focus-visible:outline-[#173E36]"
      : "mt-3 rounded-lg border border-[#CBD7C6] bg-white px-3 py-2 text-xs font-semibold text-[#173E36] transition hover:bg-[#EAF2E8] focus-visible:outline-2 focus-visible:outline-[#173E36]"
  }
>
  {inline ? `[${citation.numero}]` : "Consulter le passage"}
</button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto h-[90dvh] max-h-[90dvh] w-[95vw] max-w-6xl overflow-hidden rounded-2xl border border-[#DDE3DC] bg-white p-0 text-[#202923] shadow-2xl backdrop:bg-black/50"
      >
        {open && (
          <div className="flex h-full flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-[#DDE3DC] px-5 py-4">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="break-words text-lg font-semibold"
                >
                  {citation.titre}
                </h2>

                <p className="mt-1 text-sm text-[#65716A]">
                  Version {citation.numeroVersion}
                  {" · "}
                  {citation.reperePassage}
                  {citation.pageDebut !== null &&
                    ` · Page ${citation.pageDebut}`}
                </p>
              </div>

              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg border border-[#DDE3DC] px-3 py-2 text-sm hover:bg-[#F0F5EF] focus-visible:outline-2 focus-visible:outline-[#173E36]"
              >
                Fermer
              </button>
            </header>

            <div className="max-h-[25dvh] shrink-0 overflow-y-auto border-b border-[#DDE3DC] bg-[#F8FAF7] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#65716A]">
                Extrait utilisé dans la réponse
              </p>

              <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[#B8CBAF] pl-3 text-sm leading-6">
                {citation.extrait}
              </blockquote>
            </div>

            <div className="min-h-0 flex-1 bg-[#E8ECE6]">
              <iframe
                title={`Aperçu de ${citation.titre}, version ${citation.numeroVersion}`}
                src={pdfUrl}
                className="h-full w-full border-0"
              />
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DDE3DC] px-5 py-3 text-xs text-[#65716A]">
              <p>
                {citation.pageDebut === null
                  ? "Page non identifiée : recherchez l’extrait dans le PDF."
                  : "Le lecteur tente d’ouvrir la page citée."}
              </p>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#173E36] underline underline-offset-4"
              >
                Ouvrir dans un nouvel onglet
              </a>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}