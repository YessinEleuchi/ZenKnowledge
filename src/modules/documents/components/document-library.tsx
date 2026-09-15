"use client";

import { useCallback, useId, useState } from "react";

import {
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { StatutVersion } from "@/types/enums";

import { DocumentModal } from "./documet-modal";
import { DocumentEditorModal } from "./document-editor-modal";

import type {
  DocumentItem,
  DocumentsLibraryProps,
} from "../document.types";

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

const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-lg px-3 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[#285448]";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; document: DocumentItem }
  | null;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function fileUrl(
  documentId: string,
  versionId: string,
  download = false,
) {
  const base =
    `/api/documents/${encodeURIComponent(documentId)}` +
    `/versions/${encodeURIComponent(versionId)}/file`;

  return download ? `${base}?download=1` : base;
}

function StatusBadge({
  statut,
}: {
  statut: StatutVersion | null;
}) {
  const info = statut ? STATUSES[statut] : null;

  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-1
        text-xs font-medium ${
          info?.className ?? "bg-[#F0F1EF] text-[#65716A]"
        }`}
    >
      {info?.label ?? "Sans version"}
    </span>
  );
}

function DocumentPreview({
  document,
}: {
  document: DocumentItem;
}) {
  const selectId = useId();

  const [selectedId, setSelectedId] = useState(
    document.versions[0]?.id ?? "",
  );

  const selected =
    document.versions.find((version) => version.id === selectedId) ??
    document.versions[0];

  if (!selected) {
    return (
      <p className="p-5 text-sm text-[#65716A]">
        Ce document ne possède pas de fichier.
      </p>
    );
  }

  const url = fileUrl(document.id, selected.id);

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-xs text-[#65716A]"
          >
            Version à consulter
          </label>

          <select
            id={selectId}
            value={selected.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="min-h-11 max-w-full rounded-lg border
              border-[#DDE3DC] bg-white px-3 text-sm
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#285448]"
          >
            {document.versions.map((version) => (
              <option key={version.id} value={version.id}>
                V{version.numero} — {STATUSES[version.statut].label}
                {" — "}
                {dateFormatter.format(new Date(version.creeLe))}
              </option>
            ))}
          </select>
        </div>

        <a
          href={fileUrl(document.id, selected.id, true)}
          className={`${actionClass} bg-[#E5ECE3] text-[#285448]
            hover:bg-[#DCE7DA]`}
        >
          <Download aria-hidden="true" className="size-4" />
          Télécharger V{selected.numero}
        </a>
      </div>

      <object
        key={selected.id}
        data={url}
        type="application/pdf"
        aria-label={`${document.titre}, version ${selected.numero}`}
        className="block h-[60dvh] w-full rounded-lg border
          border-[#DDE3DC] bg-[#F7F8F5]"
      >
        <div className="p-6 text-sm">
          <p>L’aperçu PDF n’est pas disponible dans ce navigateur.</p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[#285448] underline"
          >
            Ouvrir le PDF dans un nouvel onglet
          </a>
        </div>
      </object>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#65716A]">
        <span className="break-all">{selected.nomFichier}</span>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#285448] underline underline-offset-4"
        >
          Ouvrir dans un nouvel onglet
        </a>
      </div>
    </div>
  );
}

export function DocumentsLibrary({
  documents,
  services,
}: DocumentsLibraryProps) {
  const id = useId();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatutVersion | "">("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);

  const closeEditor = useCallback(() => {
    setEditor(null);
  }, []);

  const handleSaved = useCallback((message: string) => {
    setEditor(null);
    setNotice(message);
  }, []);

  const previewDocument = documents.find(
    (document) => document.id === previewId,
  );

  const normalizedQuery = normalize(query);

  const filteredDocuments = documents.filter((document) => {
    const matchesQuery = normalize(
      `${document.titre} ${document.service}`,
    ).includes(normalizedQuery);

    const matchesStatus =
      status === "" || document.statut === status;

    return matchesQuery && matchesStatus;
  });

  const hasFilters = query.trim() !== "" || status !== "";

  function openCreate() {
    setNotice("");
    setEditor({ mode: "create" });
  }

  function openEdit(document: DocumentItem) {
    setNotice("");
    setEditor({ mode: "edit", document });
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
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

            <span className="rounded-md border border-[#DDE3DC] px-2 py-0.5 text-xs tabular-nums text-[#526A5E]">
              {documents.length}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={openCreate}
          className={`${actionClass} w-full bg-[#285448]
            text-white hover:bg-[#1E4238] sm:w-auto`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter un PDF
        </button>
      </header>

      <div role="status" aria-live="polite">
        {notice && (
          <p className="rounded-lg border border-[#DDE3DC] bg-[#EAF2E8] px-4 py-3 text-sm text-[#365C3D]">
            {notice}
          </p>
        )}
      </div>

      <section aria-label="Recherche et filtres">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor={`${id}-search`} className="sr-only">
              Rechercher un document
            </label>

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#65716A]"
            />

            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par titre ou service…"
              className="h-11 w-full rounded-lg border border-[#DDE3DC]
                bg-white pl-10 pr-3 text-sm
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[#285448]/30"
            />
          </div>

          <label htmlFor={`${id}-status`} className="sr-only">
            Filtrer par statut
          </label>

          <select
            id={`${id}-status`}
            value={status}
            onChange={(event) => {
              const value = event.target.value;

              setStatus(
                STATUS_VALUES.find((item) => item === value) ?? "",
              );
            }}
            className="h-11 rounded-lg border border-[#DDE3DC]
              bg-white px-3 text-sm text-[#526A5E]
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#285448] sm:w-48"
          >
            <option value="">Tous les statuts</option>

            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {STATUSES[value].label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={`${actionClass} text-[#526A5E]
                hover:bg-[#E5ECE3]`}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      {filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-[#DDE3DC] bg-white px-6 py-14 text-center">
          <FileText
            aria-hidden="true"
            className="mx-auto mb-4 size-8 text-[#526A5E]"
          />

          <h2 className="font-medium text-[#243E35]">
            {documents.length === 0
              ? "Ajoutez votre premier document"
              : "Aucun document trouvé"}
          </h2>

          <button
            type="button"
            onClick={
              documents.length === 0 ? openCreate : clearFilters
            }
            className={`${actionClass} mt-3 text-[#285448]
              hover:bg-[#EDF1EB]`}
          >
            {documents.length === 0
              ? "Ajouter un PDF"
              : "Effacer les filtres"}
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((document) => {
            const latest = document.versions[0];

            return (
              <li key={document.id} className="min-w-0">
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#DDE3DC] bg-white transition-shadow hover:shadow-sm">
                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-[#EDF1EB]">
                        <FileText
                          aria-hidden="true"
                          className="size-5 text-[#285448]"
                          strokeWidth={1.7}
                        />
                      </div>

                      <StatusBadge statut={document.statut} />
                    </div>

                    <h2 className="break-words font-semibold leading-6 text-[#243E35]">
                      {document.titre}
                    </h2>

                    <p className="mt-1 text-xs text-[#65716A]">
                      {latest
                        ? `Version ${latest.numero} · PDF`
                        : "Aucune version"}
                    </p>

                    <dl className="mt-5 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-[#65716A]">
                          Périmètre
                        </dt>

                        <dd className="mt-0.5 text-[#526A5E]">
                          {document.service}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#65716A]">
                          Accès après publication
                        </dt>

                        <dd className="mt-0.5 text-[#526A5E]">
                          {document.collaboratorsAllowed
                            ? "Gestionnaire et collaborateurs"
                            : "Gestionnaire"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#65716A]">
                          Révision prévue
                        </dt>

                        <dd className="mt-0.5 tabular-nums text-[#526A5E]">
                          {dateFormatter.format(
                            new Date(document.revision),
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 border-t border-[#E8ECE6] bg-[#FAFBF9] p-3">
                    <button
                      type="button"
                      disabled={!latest}
                      aria-haspopup="dialog"
                      aria-label={`Aperçu de ${document.titre}`}
                      onClick={() => setPreviewId(document.id)}
                      className={`${actionClass} bg-[#E5ECE3]
                        text-[#285448] hover:bg-[#DCE7DA]
                        disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <Eye aria-hidden="true" className="size-4" />
                      Aperçu
                    </button>

                    {latest && (
                      <a
                        href={fileUrl(document.id, latest.id, true)}
                        aria-label={`Télécharger ${document.titre}`}
                        title="Télécharger le PDF"
                        className={`${actionClass} text-[#526A5E]
                          hover:bg-[#EDF1EB]`}
                      >
                        <Download
                          aria-hidden="true"
                          className="size-4"
                        />
                        <span className="sr-only">Télécharger</span>
                      </a>
                    )}

                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Modifier ${document.titre}`}
                      onClick={() => openEdit(document)}
                      className={`${actionClass} ml-auto
                        text-[#526A5E] hover:bg-[#EDF1EB]`}
                    >
                      <Pencil
                        aria-hidden="true"
                        className="size-4"
                      />
                      Modifier
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p role="status" className="text-xs text-[#65716A]">
        {filteredDocuments.length} document
        {filteredDocuments.length > 1 ? "s" : ""}
        {hasFilters ? ` sur ${documents.length}` : ""}
      </p>

      {previewDocument && (
        <DocumentModal
          title={previewDocument.titre}
          onClose={() => setPreviewId(null)}
          wide
        >
          <DocumentPreview
            key={previewDocument.id}
            document={previewDocument}
          />
        </DocumentModal>
      )}

      {editor && (
        <DocumentEditorModal
          key={
            editor.mode === "create"
              ? "create"
              : editor.document.id
          }
          services={services}
          document={
            editor.mode === "edit"
              ? editor.document
              : undefined
          }
          onClose={closeEditor}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}