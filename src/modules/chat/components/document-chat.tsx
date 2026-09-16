"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowUp,
  FileSearch,
  Sparkles,
} from "lucide-react";

import { askDocumentQuestion } from "../server/chat-answer.actions";

import type {
  ChatAnswerResult,
  ChatCitation,
  ChatFeedbackEvaluation,
  StoredConversation,
} from "../chat.types";

import { FeedbackButtons } from "./feedback-buttons";
import { SourcePreview } from "./source-preview";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type Exchange = {
  id: string;
  question: string;
  result: ChatAnswerResult;

  evaluation:
    | ChatFeedbackEvaluation
    | null;

  commentaire:
    | string
    | null;
};

/* -------------------------------------------------------------------------- */
/*                               SUGGESTIONS                                  */
/* -------------------------------------------------------------------------- */

const suggestions = [
  "Combien de jours de congés annuels avons-nous ?",
  "Comment demander un congé ?",
  "Quel est le délai de validation ?",
];

/* -------------------------------------------------------------------------- */
/*                          HISTORIQUE INITIAL                                */
/* -------------------------------------------------------------------------- */

function createInitialExchanges(
  conversation: StoredConversation | null,
): Exchange[] {
  if (!conversation) {
    return [];
  }

  const exchanges: Exchange[] = [];

  let currentQuestion:
    | StoredConversation["messages"][number]
    | null = null;

  for (const message of conversation.messages) {
    if (message.role === "USER") {
      currentQuestion = message;
      continue;
    }

    if (
      message.role === "ASSISTANT" &&
      currentQuestion
    ) {
      exchanges.push({
        id: message.id,

        question:
          currentQuestion.contenu,

        evaluation:
          message.evaluation,

        commentaire:
          message.commentaire,

        result: {
          success: true,

          questionMessageId:
            currentQuestion.id,

          assistantMessageId:
            message.id,

          reponse:
            message.contenu,

          sourcesInsuffisantes:
            message.sourcesInsuffisantes,

          citations:
            message.citations,
        },
      });

      currentQuestion = null;
    }
  }

  return exchanges;
}

/* -------------------------------------------------------------------------- */
/*                            TEXTE + CITATIONS                               */
/* -------------------------------------------------------------------------- */

function AnswerText({
  text,
  citations,
}: {
  text: string;
  citations: ChatCitation[];
}) {
  return (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-7 text-[#2A342E]">
      {text
        .split(/(\[\d+\])/g)
        .map((part, index) => {
          const match =
            part.match(/^\[(\d+)\]$/);

          if (!match) {
            return (
              <span key={index}>
                {part}
              </span>
            );
          }

          const numero =
            Number(match[1]);

          const citation =
            citations.find(
              (item) =>
                item.numero === numero,
            );

          if (!citation) {
            return (
              <span key={index}>
                {part}
              </span>
            );
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

/* -------------------------------------------------------------------------- */
/*                                SOURCES                                     */
/* -------------------------------------------------------------------------- */

function Sources({
  citations,
  exchangeId,
}: {
  citations: ChatCitation[];
  exchangeId: string;
}) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-[#E3E8E3] pt-4">
      <div className="mb-3 flex items-center gap-2">
        <FileSearch
          aria-hidden="true"
          className="size-4 text-[#65716A]"
          strokeWidth={1.8}
        />

        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#65716A]">
          Sources
        </p>
      </div>

      <div className="space-y-2">
        {citations.map(
          (citation) => (
            <div
              key={citation.numero}
              id={`source-${exchangeId}-${citation.numero}`}
              className="flex flex-col gap-3 rounded-xl border border-[#E0E6DF] bg-[#FAFBF9] px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E8F0E6] text-xs font-semibold text-[#285448]">
                  {citation.numero}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#243E35]">
                    {citation.titre}
                  </p>

                  <p className="mt-0.5 text-xs text-[#758179]">
                    Version{" "}
                    {citation.numeroVersion}

                    {citation.reperePassage
                      ? ` · ${citation.reperePassage}`
                      : ""}

                    {citation.pageDebut !== null
                      ? ` · Page ${citation.pageDebut}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <SourcePreview
                  citation={citation}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              DOCUMENT CHAT                                 */
/* -------------------------------------------------------------------------- */

export function DocumentChat({
  initialConversation,
}: {
  initialConversation:
    | StoredConversation
    | null;
}) {
  const [draft, setDraft] =
    useState("");

  const [
    submitted,
    setSubmitted,
  ] = useState("");

  const textarea =
    useRef<HTMLTextAreaElement>(
      null,
    );

  const bottom =
    useRef<HTMLDivElement>(
      null,
    );

  const initialScrollDone =
    useRef(false);

  const initialExchanges =
    createInitialExchanges(
      initialConversation,
    );

  const [
    exchanges,
    submitAction,
    pending,
  ] = useActionState(
    async (
      previous: Exchange[],
      formData: FormData,
    ): Promise<Exchange[]> => {
      const question =
        String(
          formData.get("question") ??
            "",
        ).trim();

      /*
       * Le FormData contient déjà la valeur.
       * On peut donc vider immédiatement
       * le champ côté interface.
       */
      setDraft("");

      const result =
        await askDocumentQuestion(
          formData,
        );

      return [
        ...previous,

        {
          id:
            result.success
              ? result.assistantMessageId
              : crypto.randomUUID(),

          question,

          result,

          /*
           * Une nouvelle réponse ne possède
           * encore aucun feedback.
           */
          evaluation: null,

          commentaire: null,
        },
      ];
    },

    initialExchanges,
  );

  /* ------------------------------------------------------------------------ */
  /*                           TEXTAREA AUTO-GROW                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const element =
      textarea.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";

    const nextHeight =
      Math.min(
        element.scrollHeight,
        128,
      );

    element.style.height =
      `${Math.max(nextHeight, 44)}px`;
  }, [draft]);

  /* ------------------------------------------------------------------------ */
  /*                           SCROLL AUTOMATIQUE                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const behavior =
      initialScrollDone.current
        ? "smooth"
        : "auto";

    bottom.current?.scrollIntoView({
      behavior,
      block: "end",
    });

    initialScrollDone.current =
      true;
  }, [
    exchanges.length,
    pending,
  ]);

  /* ------------------------------------------------------------------------ */
  /*                                FOCUS                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      !pending &&
      exchanges.length > 0
    ) {
      textarea.current?.focus();
    }
  }, [
    pending,
    exchanges.length,
  ]);

  /* ------------------------------------------------------------------------ */
  /*                             SUGGESTIONS                                  */
  /* ------------------------------------------------------------------------ */

  function reuseQuestion(
    question: string,
  ) {
    setDraft(question);

    requestAnimationFrame(() => {
      textarea.current?.focus();
    });
  }

  /* ------------------------------------------------------------------------ */
  /*                                   UI                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <section className="flex h-[calc(100dvh-7rem)] min-h-[520px] w-full flex-col overflow-hidden text-[#202923]">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="shrink-0 border-b border-[#DDE3DC] bg-[#F7F8F5] pb-4">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E5ECE3]">
              <Sparkles
                aria-hidden="true"
                className="size-[18px] text-[#285448]"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#202923] sm:text-[22px]">
                Assistant documentaire
              </h1>

              <p className="mt-1 text-sm leading-5 text-[#65716A]">
                Interrogez les documents
                accessibles à votre
                organisation.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* MESSAGES                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        aria-label="Conversation"
        aria-busy={pending}
      >
        <div className="mx-auto w-full max-w-4xl space-y-9 px-1 py-8 sm:px-4">

          {/* -------------------------------------------------------------- */}
          {/* EMPTY STATE                                                    */}
          {/* -------------------------------------------------------------- */}

          {exchanges.length === 0 &&
            !pending && (
              <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center sm:py-16">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-[#DCE4DB] bg-white shadow-sm">
                  <Sparkles
                    aria-hidden="true"
                    className="size-5 text-[#285448]"
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#202923] sm:text-2xl">
                  Que souhaitez-vous savoir ?
                </h2>

                <p className="mt-2 max-w-lg text-sm leading-6 text-[#65716A]">
                  Posez une question sur
                  les documents mis à votre
                  disposition. Les sources
                  utilisées restent
                  consultables.
                </p>

                <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
                  {suggestions.map(
                    (question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          reuseQuestion(
                            question,
                          )
                        }
                        className="min-h-16 rounded-xl border border-[#DDE3DC] bg-white px-4 py-3 text-left text-sm leading-5 text-[#435148] shadow-[0_1px_2px_rgba(20,40,30,0.03)] transition hover:border-[#B9C9BC] hover:bg-[#FAFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285448]/30"
                      >
                        {question}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* -------------------------------------------------------------- */}
          {/* EXCHANGES                                                      */}
          {/* -------------------------------------------------------------- */}

          {exchanges.map(
            (exchange) => (
              <article
                key={exchange.id}
                className="space-y-5"
              >

                {/* -------------------------------------------------------- */}
                {/* USER                                                     */}
                {/* -------------------------------------------------------- */}

                <div className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-[#285448] px-4 py-3 text-white sm:max-w-[78%]">
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                      {
                        exchange.question
                      }
                    </p>
                  </div>
                </div>

                {/* -------------------------------------------------------- */}
                {/* ERROR                                                    */}
                {/* -------------------------------------------------------- */}

                {!exchange.result
                  .success ? (
                  <div className="max-w-[92%]">
                    <div
                      role="alert"
                      className="rounded-xl border border-[#F1D4CE] bg-[#FFF7F5] px-4 py-3"
                    >
                      <p className="text-sm leading-6 text-[#843D32]">
                        {
                          exchange.result
                            .message
                        }
                      </p>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          reuseQuestion(
                            exchange.question,
                          )
                        }
                        className="mt-2 text-sm font-medium text-[#843D32] underline underline-offset-4 disabled:opacity-50"
                      >
                        Réessayer cette
                        question
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ------------------------------------------------------ */
                  /* ASSISTANT                                              */
                  /* ------------------------------------------------------ */

                  <div className="max-w-[96%] sm:max-w-[90%]">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-[#E5ECE3]">
                        <Sparkles
                          aria-hidden="true"
                          className="size-3.5 text-[#285448]"
                          strokeWidth={
                            1.9
                          }
                        />
                      </div>

                      <span className="text-sm font-semibold text-[#243E35]">
                        Assistant
                      </span>

                      {exchange.result
                        .sourcesInsuffisantes && (
                        <span className="rounded-md bg-[#FAF2DF] px-2 py-1 text-[11px] font-medium text-[#806122]">
                          Sources
                          insuffisantes
                        </span>
                      )}
                    </div>

                    <div className="pl-9">

                      {/* -------------------------------------------------- */}
                      {/* ANSWER                                             */}
                      {/* -------------------------------------------------- */}

                      <AnswerText
                        text={
                          exchange.result
                            .reponse
                        }
                        citations={
                          exchange.result
                            .citations
                        }
                      />

                      {/* -------------------------------------------------- */}
                      {/* SOURCES                                            */}
                      {/* -------------------------------------------------- */}

                      <Sources
                        citations={
                          exchange.result
                            .citations
                        }
                        exchangeId={
                          exchange.id
                        }
                      />

                      {/* -------------------------------------------------- */}
                      {/* FEEDBACK                                           */}
                      {/* -------------------------------------------------- */}

                      <FeedbackButtons
                        messageId={
                          exchange.result
                            .assistantMessageId
                        }
                        initialEvaluation={
                          exchange.evaluation
                        }
                        initialComment={
                          exchange.commentaire
                        }
                      />
                    </div>
                  </div>
                )}
              </article>
            ),
          )}

          {/* -------------------------------------------------------------- */}
          {/* PENDING                                                        */}
          {/* -------------------------------------------------------------- */}

          {pending && (
            <article className="space-y-5">

              <div className="flex justify-end">
                <div className="max-w-[92%] rounded-2xl rounded-br-md bg-[#285448] px-4 py-3 text-white sm:max-w-[78%]">
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                    {submitted}
                  </p>
                </div>
              </div>

              <div
                role="status"
                aria-live="polite"
                className="flex max-w-[90%] items-center gap-3 pl-1 text-sm text-[#65716A]"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#E5ECE3]">
                  <Sparkles
                    aria-hidden="true"
                    className="size-3.5 text-[#285448]"
                    strokeWidth={1.8}
                  />
                </div>

                <span className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#789087]" />

                    <span className="size-1.5 animate-pulse rounded-full bg-[#789087] [animation-delay:150ms]" />

                    <span className="size-1.5 animate-pulse rounded-full bg-[#789087] [animation-delay:300ms]" />
                  </span>

                  Recherche dans vos
                  documents…
                </span>
              </div>
            </article>
          )}

          <div
            ref={bottom}
            className="h-px"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* COMPOSER                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="shrink-0 border-t border-[#DDE3DC] bg-[#F7F8F5]/95 pt-4 backdrop-blur-sm">
        <form
          action={submitAction}
          onSubmit={(event) => {
            const value =
              draft.trim();

            if (
              pending ||
              value.length < 3
            ) {
              event.preventDefault();
              return;
            }

            setSubmitted(value);
          }}
          className="mx-auto w-full max-w-4xl"
        >
          <label
            htmlFor="chat-question"
            className="sr-only"
          >
            Votre question
          </label>

          <div className="flex items-end gap-2 rounded-2xl border border-[#CFD9D0] bg-white p-2 shadow-[0_2px_8px_rgba(28,55,42,0.05)] transition focus-within:border-[#78968A] focus-within:ring-2 focus-within:ring-[#285448]/10">
            <textarea
              ref={textarea}
              id="chat-question"
              name="question"
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent
                    .isComposing
                ) {
                  return;
                }

                event.preventDefault();

                if (
                  pending ||
                  draft.trim()
                    .length < 3
                ) {
                  return;
                }

                event.currentTarget.form
                  ?.requestSubmit();
              }}
              placeholder="Posez une question sur vos documents…"
              required
              minLength={3}
              maxLength={2000}
              readOnly={pending}
              rows={1}
              aria-describedby="chat-help"
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#263129] outline-none placeholder:text-[#8A958E] disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={
                pending ||
                draft.trim().length <
                  3
              }
              aria-label={
                pending
                  ? "Réponse en cours"
                  : "Envoyer la question"
              }
              title="Envoyer"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#285448] text-white transition hover:bg-[#1F483D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285448]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#AAB7B1]"
            >
              <ArrowUp
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={2}
              />
            </button>
          </div>

          <div className="flex min-h-7 items-center justify-between gap-4 px-2">
            <p
              id="chat-help"
              className="text-[11px] text-[#7B867F]"
            >
              Entrée pour envoyer ·
              Maj + Entrée pour une
              nouvelle ligne
            </p>

            <p className="hidden text-[11px] text-[#7B867F] sm:block">
              Vérifiez les informations
              importantes dans les
              sources citées.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}