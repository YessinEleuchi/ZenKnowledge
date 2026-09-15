"use client";

import {
  useActionState,
  useEffect,
  useId,
  useState,
} from "react";

import { Download, Eye, FileText } from "lucide-react";

import {
  createDocument,
  updateDocument,
} from "../server/document.actions";

import {
  initialState,
  type DocumentItem,
  type ServiceOption,
} from "../document.types";

type DocumentFormProps = {
  services: ServiceOption[];
  document?: DocumentItem;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onPendingChange: (pending: boolean) => void;
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-[#DDE3DC] " +
  "bg-white px-3 py-2 text-sm text-[#243E35] " +
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[#285448]/30";

const linkClass =
  "inline-flex min-h-10 items-center justify-center gap-2 " +
  "rounded-lg px-3 text-xs font-medium text-[#285448] " +
  "hover:bg-[#E5ECE3] focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[#285448]";

export function DocumentForm({
  services,
  document,
  onCancel,
  onSuccess,
  onPendingChange,
}: DocumentFormProps) {
  const id = useId();
  const editing = Boolean(document);
  const currentVersion = document?.versions[0];

  const currentPdfUrl =
    document && currentVersion
      ? `/api/documents/${encodeURIComponent(document.id)}` +
        `/versions/${encodeURIComponent(currentVersion.id)}/file`
      : null;

  const [titre, setTitre] = useState(document?.titre ?? "");
  const [serviceId, setServiceId] = useState(
    document?.serviceId ?? "",
  );
  const [revision, setRevision] = useState(
    document?.revision.slice(0, 10) ?? "",
  );
  const [collaborators, setCollaborators] = useState(
    document?.collaboratorsAllowed ?? false,
  );

  const [clientError, setClientError] = useState("");
  const [selectedFilename, setSelectedFilename] = useState("");

  const [state, formAction, pending] = useActionState(
    editing ? updateDocument : createDocument,
    initialState,
  );

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (state.success) {
      onSuccess(state.message);
    }
  }, [state.success, state.message, onSuccess]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        setClientError("");

        const data = new FormData(event.currentTarget);
        const file = data.get("fichier");

        if (
          file instanceof File &&
          file.size > 3 * 1024 * 1024
        ) {
          event.preventDefault();
          setClientError("Le PDF ne doit pas dépasser 3 Mo.");
        }
      }}
      className="p-4 sm:p-5"
    >
      {document && (
        <>
          <input
            type="hidden"
            name="documentId"
            value={document.id}
          />

          <input
            type="hidden"
            name="expectedVersionId"
            value={currentVersion?.id ?? ""}
          />
        </>
      )}

      <fieldset disabled={pending} className="space-y-5">
        <div>
          <label
            htmlFor={`${id}-title`}
            className="text-sm font-medium"
          >
            Titre du document
          </label>

          <input
            id={`${id}-title`}
            name="titre"
            value={titre}
            onChange={(event) => setTitre(event.target.value)}
            required
            minLength={3}
            maxLength={200}
            placeholder="Ex. Procédure de demande de congé"
            className={inputClass}
          />
        </div>

        {currentVersion && currentPdfUrl && (
          <section
            aria-labelledby={`${id}-current-pdf`}
            className="rounded-xl border border-[#DDE3DC] bg-[#F7F8F5] p-4"
          >
            <h3
              id={`${id}-current-pdf`}
              className="mb-3 text-xs font-medium text-[#65716A]"
            >
              PDF actuel
            </h3>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE3]">
                <FileText
                  aria-hidden="true"
                  className="size-5 text-[#285448]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium">
                  {currentVersion.nomFichier}
                </p>

                <p className="mt-1 text-xs text-[#65716A]">
                  Version {currentVersion.numero}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={currentPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <Eye aria-hidden="true" className="size-4" />
                Aperçu
                <span className="sr-only">
                  {" "}dans un nouvel onglet
                </span>
              </a>

              <a
                href={`${currentPdfUrl}?download=1`}
                className={linkClass}
              >
                <Download aria-hidden="true" className="size-4" />
                Télécharger
              </a>
            </div>
          </section>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${id}-service`}
              className="text-sm font-medium"
            >
              Périmètre
            </label>

            <select
              id={`${id}-service`}
              name="serviceId"
              value={serviceId}
              onChange={(event) =>
                setServiceId(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Toute la société</option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${id}-revision`}
              className="text-sm font-medium"
            >
              Date de révision
            </label>

            <input
              id={`${id}-revision`}
              name="dateRevision"
              type="date"
              value={revision}
              onChange={(event) =>
                setRevision(event.target.value)
              }
              required
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DDE3DC] p-4">
          <input
            type="checkbox"
            name="accessibleCollaborateurs"
            checked={collaborators}
            onChange={(event) =>
              setCollaborators(event.target.checked)
            }
            className="mt-1 accent-[#285448]"
          />

          <span className="text-sm">
            Accessible aux collaborateurs

            <span className="mt-1 block text-xs leading-5 text-[#65716A]">
              Après publication, dans le périmètre sélectionné.
            </span>
          </span>
        </label>

        <section className="rounded-xl border border-dashed border-[#BAC9BC] bg-[#FAFBF9] p-4">
          <label
            htmlFor={`${id}-file`}
            className="text-sm font-medium"
          >
            {editing ? "Remplacer le PDF" : "Fichier PDF"}

            {editing && (
              <span className="ml-2 text-xs font-normal text-[#65716A]">
                Facultatif
              </span>
            )}
          </label>

          <p
            id={`${id}-file-help`}
            className="mt-1 text-xs leading-5 text-[#65716A]"
          >
            {editing
              ? "Laisse ce champ vide pour conserver le PDF actuel. Un nouveau fichier créera une nouvelle version."
              : "Sélectionne un fichier PDF de 3 Mo maximum."}
          </p>

          <input
            id={`${id}-file`}
            name="fichier"
            type="file"
            accept=".pdf,application/pdf"
            required={!editing}
            aria-describedby={`${id}-file-help`}
            onChange={(event) => {
              setClientError("");
              setSelectedFilename(
                event.target.files?.[0]?.name ?? "",
              );
            }}
            className="mt-3 block w-full text-sm text-[#526A5E]
              file:mr-3 file:rounded-lg file:border-0
              file:bg-[#E5ECE3] file:px-3 file:py-2.5
              file:text-sm file:font-medium file:text-[#285448]"
          />

          {editing && selectedFilename && (
            <p className="mt-3 text-xs leading-5 text-[#65716A]">
              La nouvelle version sera en attente de traitement.
              Les versions précédentes seront archivées.
            </p>
          )}
        </section>

        <footer className="flex flex-col-reverse gap-3 border-t border-[#E8ECE6] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="min-h-11 rounded-lg border border-[#DDE3DC]
              px-4 text-sm font-medium text-[#526A5E]
              hover:bg-[#F0F3EF] disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg bg-[#285448]
              px-4 text-sm font-medium text-white
              hover:bg-[#1E4238] disabled:cursor-wait
              disabled:opacity-60"
          >
            {pending
              ? "Enregistrement…"
              : editing
                ? "Enregistrer les modifications"
                : "Ajouter le document"}
          </button>
        </footer>
      </fieldset>

      <div role="status" aria-live="polite">
        {(clientError || (!state.success && state.message)) && (
          <p className="mt-4 text-sm text-red-700">
            {clientError || state.message}
          </p>
        )}
      </div>
    </form>
  );
}