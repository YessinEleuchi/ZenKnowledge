"use client";

import { useId, useRef, useState } from "react";
import { FileText, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatutVersion } from "@/types/enums";

import type { DocumentsLibraryProps } from "../document.types";

const STATUSES: Record<
  StatutVersion,
  { label: string; className: string }
> = {
  [StatutVersion.EN_ATTENTE]: {
    label: "En attente",
    className: "bg-[#F0F1EF] text-[#59675E]",
  },
  [StatutVersion.EN_TRAITEMENT]: {
    label: "En traitement",
    className: "bg-[#EDF3FA] text-[#365F87]",
  },
  [StatutVersion.A_VALIDER]: {
    label: "À valider",
    className: "bg-[#FAF2DF] text-[#806122]",
  },
  [StatutVersion.PUBLIEE]: {
    label: "Publiée",
    className: "bg-[#EAF2E8] text-[#365C3D]",
  },
  [StatutVersion.ARCHIVEE]: {
    label: "Archivée",
    className: "bg-[#F0F1EF] text-[#65716A]",
  },
  [StatutVersion.ECHEC]: {
    label: "Échec",
    className: "bg-[#FFF0ED] text-[#963F32]",
  },
};

const STATUS_VALUES = Object.values(StatutVersion);

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function DocumentsLibrary({
  documents,
  uploadForm,
}: DocumentsLibraryProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatutVersion | "">("");

  const id = useId();
  const uploadButtonRef = useRef<HTMLButtonElement>(null);

  const normalizedQuery = normalize(query);

  const filteredDocuments = documents.filter((document) => {
    const matchesQuery = normalize(
      `${document.titre} ${document.service}`,
    ).includes(normalizedQuery);

    const matchesStatus = status === "" || document.statut === status;

    return matchesQuery && matchesStatus;
  });

  const hasFilters = query.trim() !== "" || status !== "";

  function handleStatusChange(value: string) {
    if (value === "") {
      setStatus("");
      return;
    }

    const selectedStatus = STATUS_VALUES.find(
      (statut) => statut === value,
    );

    if (selectedStatus !== undefined) {
      setStatus(selectedStatus);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
  }

  function closeUpload() {
    setUploadOpen(false);
    uploadButtonRef.current?.focus();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#65716A]">
            Bibliothèque
          </p>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#202923]">
              Documents
            </h1>

            <span className="rounded-md border border-[#DDE3DC] px-2 py-0.5 text-xs font-medium tabular-nums text-[#526A5E]">
              {documents.length}
            </span>
          </div>
        </div>

        <Button
          ref={uploadButtonRef}
          type="button"
          onClick={() => setUploadOpen((open) => !open)}
          aria-expanded={uploadOpen}
          aria-controls={`${id}-upload`}
          className="h-11 w-full rounded-lg bg-[#285448] px-4
            text-white shadow-none hover:bg-[#1E4238]
            focus-visible:ring-[#285448]/25 sm:w-auto"
        >
          {uploadOpen ? (
            <X aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}

          {uploadOpen ? "Fermer le formulaire" : "Ajouter un PDF"}
        </Button>
      </header>

      {/* Le formulaire reste monté pour conserver une saisie en cours. */}
      <section
        id={`${id}-upload`}
        hidden={!uploadOpen}
        aria-labelledby={`${id}-upload-title`}
        className="rounded-xl border border-[#DDE3DC] bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E8ECE6] px-5 py-3">
          <h2
            id={`${id}-upload-title`}
            className="text-sm font-semibold text-[#243E35]"
          >
            Ajouter un document
          </h2>

          <button
            type="button"
            onClick={closeUpload}
            aria-label="Fermer le formulaire d’ajout"
            className="flex size-10 items-center justify-center rounded-lg
              text-[#65716A] hover:bg-[#F0F3EF]
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#285448]"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5">{uploadForm}</div>
      </section>

      <section
        aria-label="Bibliothèque de documents"
        className="min-w-0 overflow-hidden rounded-xl border border-[#DDE3DC] bg-white"
      >
        <div className="flex flex-col gap-3 border-b border-[#DDE3DC] p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <label htmlFor={`${id}-search`} className="sr-only">
              Rechercher par titre ou service
            </label>

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#65716A]"
            />

            <Input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par titre ou service…"
              className="h-11 rounded-lg border-[#DDE3DC] bg-[#FAFBF9]
                pl-9 text-base shadow-none focus-visible:border-[#285448]
                focus-visible:ring-[#285448]/15 md:text-sm"
            />
          </div>

          <div>
            <label htmlFor={`${id}-status`} className="sr-only">
              Filtrer par statut
            </label>

            <select
              id={`${id}-status`}
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#DDE3DC]
                bg-white px-3 text-sm text-[#526A5E]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[#285448] sm:w-44"
            >
              <option value="">Tous les statuts</option>

              {STATUS_VALUES.map((statut) => (
                <option key={statut} value={statut}>
                  {STATUSES[statut].label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-md px-2 text-sm text-[#526A5E]
                underline-offset-4 hover:underline
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[#285448]"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-[#DDE3DC] bg-[#F7F8F5]">
              {documents.length === 0 ? (
                <FileText
                  aria-hidden="true"
                  className="size-5 text-[#526A5E]"
                />
              ) : (
                <Search
                  aria-hidden="true"
                  className="size-5 text-[#526A5E]"
                />
              )}
            </div>

            <h2 className="text-sm font-semibold text-[#243E35]">
              {documents.length === 0
                ? "Votre bibliothèque est prête"
                : "Aucun document trouvé"}
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#65716A]">
              {documents.length === 0
                ? "Ajoutez un premier PDF pour démarrer."
                : "Essayez un autre titre, un service ou un statut différent."}
            </p>

            <button
              type="button"
              onClick={() => {
                if (documents.length === 0) {
                  setUploadOpen(true);
                  uploadButtonRef.current?.focus();
                } else {
                  clearFilters();
                }
              }}
              className="mt-4 min-h-11 rounded-lg px-4 text-sm
                font-medium text-[#285448] hover:bg-[#EDF1EB]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[#285448]"
            >
              {documents.length === 0
                ? "Ajouter un PDF"
                : "Effacer les filtres"}
            </button>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Liste des documents"
            tabIndex={0}
            className="overflow-x-auto focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-inset
              focus-visible:ring-[#285448]"
          >
            <table className="w-full min-w-[850px] text-left text-sm">
              <caption className="sr-only">
                Documents, périmètre, accès après publication,
                statut de la dernière version et date de révision
              </caption>

              <thead className="border-b border-[#E8ECE6] bg-[#F7F8F5] text-xs text-[#65716A]">
                <tr>
                  {[
                    "Document",
                    "Périmètre",
                    "Accès après publication",
                    "Statut",
                    "Révision prévue",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-5 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8ECE6]">
                {filteredDocuments.map((document) => {
                  const statusInfo = document.statut
                    ? STATUSES[document.statut]
                    : undefined;

                  return (
                    <tr
                      key={document.id}
                      className="transition-colors hover:bg-[#FAFBF9]"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-normal"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#E8ECE6] bg-[#F7F8F5]">
                            <FileText
                              aria-hidden="true"
                              className="size-4 text-[#526A5E]"
                              strokeWidth={1.7}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-sm break-words font-medium text-[#243E35]">
                              {document.titre}
                            </p>

                            <p className="mt-1 text-xs text-[#65716A]">
                              {document.version !== null
                                ? `Version ${document.version}`
                                : "Aucune version"}
                            </p>
                          </div>
                        </div>
                      </th>

                      <td className="px-5 py-4 text-[#526A5E]">
                        {document.service}
                      </td>

                      <td className="px-5 py-4 text-xs leading-5 text-[#526A5E]">
                        {document.collaboratorsAllowed
                          ? "Gestionnaire et collaborateurs"
                          : "Gestionnaire"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                            statusInfo?.className ??
                            "bg-[#F0F1EF] text-[#65716A]"
                          }`}
                        >
                          {statusInfo?.label ?? "Sans version"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-[#526A5E]">
                        {dateFormatter.format(new Date(document.revision))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          role="status"
          aria-atomic="true"
          className="border-t border-[#E8ECE6] px-5 py-3 text-xs text-[#65716A]"
        >
          {filteredDocuments.length} document
          {filteredDocuments.length > 1 ? "s" : ""}
          {hasFilters ? ` sur ${documents.length}` : ""}
        </div>
      </section>
    </div>
  );
}