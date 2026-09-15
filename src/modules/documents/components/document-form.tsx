"use client";

import { useActionState, useState } from "react";

import { createDocument } from
  "../server/document.actions";
import type { ServiceListProps } from "../document.types";
import {initialState} from "../document.types";



const inputClass =
  "mt-2 w-full rounded-lg border border-[#DDE3DC] " +
  "bg-white px-3 py-2 text-sm";

export function DocumentForm({ services }: ServiceListProps) {
  const [open, setOpen] = useState(false);
  const [clientError, setClientError] = useState("");

  const [state, formAction, pending] = useActionState(
    createDocument,
    initialState,
  );

  return (
    <section className="rounded-xl border border-[#DDE3DC] bg-white p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="document-upload-form"
        className="rounded-lg bg-[#173E36] px-4 py-2 text-sm font-medium text-white"
      >
        {open ? "Fermer le formulaire" : "Ajouter un document"}
      </button>

      {open && (
        <form
          id="document-upload-form"
          action={formAction}
          onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            const file = form.get("fichier");

            setClientError("");

            if (
              file instanceof File &&
              file.size > 3 * 1024 * 1024
            ) {
              event.preventDefault();
              setClientError("Le PDF ne doit pas dépasser 3 Mo.");
            }
          }}
          className="mt-6 space-y-5"
        >
          <fieldset disabled={pending} className="space-y-5">
            <div>
              <label htmlFor="titre" className="text-sm font-medium">
                Titre
              </label>
              <input
                id="titre"
                name="titre"
                required
                minLength={3}
                maxLength={200}
                className={inputClass}
                placeholder="Ex. Procédure de demande de congé"
              />
            </div>

            <div>
              <label htmlFor="fichier" className="text-sm font-medium">
                Fichier PDF
              </label>
              <input
                id="fichier"
                name="fichier"
                type="file"
                accept=".pdf,application/pdf"
                required
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#65716A]">
                PDF uniquement, 3 Mo maximum.
              </p>
            </div>

            <div>
              <label htmlFor="serviceId" className="text-sm font-medium">
                Périmètre
              </label>
              <select
                id="serviceId"
                name="serviceId"
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

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="accessibleCollaborateurs"
                className="mt-1"
              />
              <span>
                Accessible aux collaborateurs
                <span className="mt-1 block text-xs text-[#65716A]">
                  Après publication, dans le périmètre sélectionné.
                </span>
              </span>
            </label>

            <div>
              <label
                htmlFor="dateRevision"
                className="text-sm font-medium"
              >
                Date de révision
              </label>
              <input
                id="dateRevision"
                name="dateRevision"
                type="date"
                required
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-[#173E36] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Dépôt en cours…" : "Enregistrer le document"}
            </button>
          </fieldset>

          <div aria-live="polite">
            {clientError ? (
              <p className="text-sm text-red-700">{clientError}</p>
            ) : state.message ? (
              <p
                className={
                  state.success
                    ? "text-sm text-green-700"
                    : "text-sm text-red-700"
                }
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}