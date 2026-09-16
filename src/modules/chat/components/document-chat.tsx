"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { askDocumentQuestion } from "../server/chat-answer.actions";
import type { ChatAnswerResult } from "../chat.types";
import { SourcePreview } from "./source-preview";
import { ChatCitation } from "../chat.types";


type Exchange = {
  id: string;
  question: string;
  result: ChatAnswerResult;
};

const suggestions = [
  "Combien de jours de congés annuels avons-nous ?",
  "Comment demander un congé ?",
  "Quel est le délai de validation ?",
];

function AnswerText({
  text,
  citations,
}: {
  text: string;
  citations: ChatCitation[];
}) {
  return (
    <div className="whitespace-pre-wrap break-words leading-7">
      {text.split(/(\[\d+\])/g).map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);

        if (!match) {
          return <span key={index}>{part}</span>;
        }

        const numero = Number(match[1]);
        const citation = citations.find(
          (item) => item.numero === numero,
        );

        if (!citation) {
          return <span key={index}>{part}</span>;
        }

        return (
          <SourcePreview
            key={index}
            citation={citation}
            inline
          />
        );
      })}
    </div>
  );
}

export function DocumentChat() {
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const [exchanges, submitAction, pending] = useActionState(
    async (
      previous: Exchange[],
      formData: FormData,
    ): Promise<Exchange[]> => {
      const question = String(formData.get("question") ?? "").trim();
      const result = await askDocumentQuestion(formData);

      return [
        ...previous,
        {
          id: crypto.randomUUID(),
          question,
          result,
        },
      ];
    },
    [],
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [exchanges, pending]);

  useEffect(() => {
    if (!pending && exchanges.length > 0) {
      textarea.current?.focus();
    }
  }, [pending, exchanges.length]);

  function reuseQuestion(question: string) {
    setDraft(question);
    textarea.current?.focus();
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[480px] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#DDE3DC] bg-[#F8FAF7] text-[#202923]">
      <header className="border-b border-[#DDE3DC] bg-white px-5 py-4 sm:px-7">
        <h1 className="text-xl font-semibold">Assistant documentaire</h1>
        <p className="mt-1 text-sm text-[#65716A]">
          Des réponses fondées sur vos documents accessibles.
        </p>
      </header>

      <div
        className="flex-1 space-y-7 overflow-y-auto px-4 py-6 sm:px-7"
        aria-label="Conversation"
        aria-busy={pending}
      >
        {exchanges.length === 0 && !pending && (
          <div className="mx-auto max-w-xl py-10 text-center">
            <span className="rounded-full bg-[#EAF2E8] px-3 py-1 text-xs font-medium text-[#173E36]">
              Vos documents, plus faciles à consulter
            </span>

            <h2 className="mt-5 text-2xl font-semibold">
              Que souhaitez-vous savoir ?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#65716A]">
              Posez une question précise. Chaque réponse documentée
              vous permet de consulter les extraits utilisés.
            </p>

            <div className="mt-6 grid gap-2 text-left">
              {suggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => reuseQuestion(question)}
                  className="rounded-xl border border-[#DDE3DC] bg-white px-4 py-3 text-sm transition hover:border-[#173E36] hover:bg-[#F0F5EF] focus-visible:outline-2 focus-visible:outline-[#173E36]"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {exchanges.map((exchange) => (
          <article key={exchange.id} className="space-y-4">
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-[#173E36] px-4 py-3 text-white sm:max-w-[80%]">
              <p className="mb-1 text-xs text-white/70">Vous</p>
              <p className="whitespace-pre-wrap break-words">
                {exchange.question}
              </p>
            </div>

            {!exchange.result.success ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p>{exchange.result.message}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reuseQuestion(exchange.question)}
                  className="mt-2 font-semibold underline disabled:opacity-50"
                >
                  Reprendre cette question
                </button>
              </div>
            ) : (
              <div className="rounded-2xl rounded-tl-sm border border-[#DDE3DC] bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#65716A]">
                  Assistant
                </p>

                {exchange.result.sourcesInsuffisantes && (
                  <p className="mb-3 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    Informations insuffisantes
                  </p>
                )}

                <AnswerText
  text={exchange.result.reponse}
  citations={exchange.result.citations}
/>

                {exchange.result.citations.length > 0 && (
                  <div className="mt-5 border-t border-[#E8ECE6] pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#65716A]">
                      Sources utilisées
                    </p>

                    <div className="grid gap-3">
                      {exchange.result.citations.map((citation : ChatCitation) => (
                        <section
                          key={citation.numero}
                          id={`source-${exchange.id}-${citation.numero}`}
                          tabIndex={-1}
                          className="scroll-mt-4 rounded-xl border border-[#DDE3DC] bg-[#F8FAF7] p-4 target:ring-2 target:ring-[#173E36]"
                        >
                          <div className="flex items-start gap-3">
                            <span className="rounded-md bg-[#EAF2E8] px-2 py-1 text-xs font-bold text-[#173E36]">
                              [{citation.numero}]
                            </span>

                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold">
                                {citation.titre}
                              </p>
                              <p className="mt-1 text-xs text-[#65716A]">
                                Version {citation.numeroVersion}
                                {" · "}
                                {citation.reperePassage}
                                {citation.pageDebut !== null &&
                                  ` · Page ${citation.pageDebut}`}
                              </p>
                            </div>
                          </div>

                          <blockquote className="mt-3 whitespace-pre-wrap break-words border-l-2 border-[#B8CBAF] pl-3 text-sm leading-6 text-[#465348]">
                            {citation.extrait}
                          </blockquote>
                            <SourcePreview citation={citation} />
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}

        {pending && (
          <div className="space-y-4">
            <div className="ml-auto max-w-[90%] rounded-2xl bg-[#173E36] px-4 py-3 text-white">
              <p className="whitespace-pre-wrap break-words">
                {submitted}
              </p>
            </div>

            <p
              role="status"
              className="flex items-center gap-3 px-2 text-sm text-[#65716A]"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-[#CBD7C6] border-t-[#173E36] motion-reduce:animate-none"
              />
              Recherche des passages et préparation de la réponse…
            </p>
          </div>
        )}

        <div ref={bottom} />
      </div>

      <form
        action={submitAction}
        onSubmit={(event) => {
          if (pending || draft.trim().length < 3) {
            event.preventDefault();
            return;
          }

          setSubmitted(draft.trim());
          // Le champ contrôlé reste disponible pour reprendre la question.
        }}
        className="border-t border-[#DDE3DC] bg-white p-4"
      >
        <label htmlFor="chat-question" className="sr-only">
          Votre question
        </label>

        <div className="flex items-end gap-3">
          <textarea
            ref={textarea}
            id="chat-question"
            name="question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Posez une question sur vos documents…"
            required
            minLength={3}
            maxLength={2000}
            readOnly={pending}
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-xl border border-[#DDE3DC] bg-[#F8FAF7] px-4 py-3 text-sm outline-none focus:border-[#173E36] focus:ring-2 focus:ring-[#173E36]/10"
          />

          <button
            type="submit"
            disabled={pending || draft.trim().length < 3}
            className="rounded-xl bg-[#173E36] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245548] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "En cours…" : "Envoyer"}
          </button>
        </div>

        <p className="mt-2 text-xs text-[#65716A]">
          Chaque question est indépendante. Consultez les sources
          avant de vous appuyer sur une réponse.
        </p>
      </form>
    </section>
  );
}