"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  ChatFeedbackEvaluation,
} from "../chat.types";

import {
  saveMessageFeedback,
} from "../server/feedback.actions";

export function FeedbackButtons({
  messageId,
  initialEvaluation,
}: {
  messageId: string;

  initialEvaluation:
    | ChatFeedbackEvaluation
    | null;
}) {
  const [
    evaluation,
    setEvaluation,
  ] = useState<
    ChatFeedbackEvaluation | null
  >(initialEvaluation);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    pending,
    startTransition,
  ] = useTransition();

  function submitFeedback(
    next:
      ChatFeedbackEvaluation,
  ) {
    if (pending) {
      return;
    }

    /*
     * Cliquer deux fois sur le même
     * bouton retire le feedback.
     */
    const nextEvaluation =
      evaluation === next
        ? null
        : next;

    const previousEvaluation =
      evaluation;

    /*
     * Optimistic UI.
     */
    setEvaluation(
      nextEvaluation,
    );

    setError(null);

    startTransition(
      async () => {
        const result =
          await saveMessageFeedback(
            messageId,
            nextEvaluation,
          );

        if (!result.success) {
          setEvaluation(
            previousEvaluation,
          );

          setError(
            result.message,
          );

          return;
        }

        setEvaluation(
          result.evaluation,
        );
      },
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            submitFeedback(
              "UTILE",
            )
          }
          aria-label="Réponse utile"
          aria-pressed={
            evaluation ===
            "UTILE"
          }
          title="Réponse utile"
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-[#285448]/30",
            "disabled:cursor-wait disabled:opacity-60",

            evaluation ===
              "UTILE"
              ? "bg-[#E5ECE3] text-[#285448]"
              : "text-[#758179] hover:bg-[#EDF1EB] hover:text-[#285448]",
          )}
        >
          <ThumbsUp
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.8}
          />
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            submitFeedback(
              "INEXACT",
            )
          }
          aria-label="Réponse inexacte"
          aria-pressed={
            evaluation ===
            "INEXACT"
          }
          title="Réponse inexacte"
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-[#285448]/30",
            "disabled:cursor-wait disabled:opacity-60",

            evaluation ===
              "INEXACT"
              ? "bg-[#FFF0ED] text-[#963F32]"
              : "text-[#758179] hover:bg-[#F5F0ED] hover:text-[#963F32]",
          )}
        >
          <ThumbsDown
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.8}
          />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-1 text-xs text-[#963F32]"
        >
          {error}
        </p>
      )}
    </div>
  );
}