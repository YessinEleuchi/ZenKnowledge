"use client";

import { useActionState } from "react";

import { searchPassagesAction } from "../server/chat.actions";
import type { ChatSearchState } from "../chat.types";

const initialState: ChatSearchState = {
  success: false,
  message: "",
  passages: [],
};

export function ChatSearch() {
  const [state, action, pending] = useActionState(
    searchPassagesAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <label
          htmlFor="question"
          className="block text-sm font-medium"
        >
          Votre question
        </label>

        <textarea
          id="question"
          name="question"
          required
          minLength={3}
          maxLength={2000}
          rows={3}
          placeholder="Ex. Quelle est la procédure de demande de congé ?"
          className="w-full rounded-lg border border-[#DDE3DC] bg-white p-3"
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#173E36] px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Recherche en cours…" : "Rechercher"}
        </button>
      </form>

      <p role="status" className="text-sm text-[#65716A]">
        {state.message}
      </p>

      {!pending && state.passages.map((passage) => (
        <article
          key={passage.chunkId}
          className="rounded-xl border border-[#DDE3DC] bg-white p-5"
        >
          <h2 className="font-semibold text-[#202923]">
            {passage.titre}
          </h2>

          <p className="mt-1 text-sm text-[#65716A]">
            Version {passage.numeroVersion} · {passage.reperePassage}
          </p>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
            {passage.contenu}
          </p>
        </article>
      ))}
    </div>
  );
}