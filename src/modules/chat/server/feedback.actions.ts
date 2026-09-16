"use server";

import type {
  ChatFeedbackEvaluation,
} from "../chat.types";

import {
  setMessageFeedback,
} from "./chat.dal";

export type FeedbackActionResult =
  | {
      success: true;
      evaluation:
        | ChatFeedbackEvaluation
        | null;
    }
  | {
      success: false;
      message: string;
    };

export async function saveMessageFeedback(
  messageId: string,
  evaluation:
    | ChatFeedbackEvaluation
    | null,
): Promise<FeedbackActionResult> {
  try {
    const result =
      await setMessageFeedback({
        messageId,
        evaluation,
      });

    return {
      success: true,

      evaluation:
        result.evaluation,
    };
  } catch (error) {
    console.error(
      "Échec de l’enregistrement du feedback :",
      error,
    );

    return {
      success: false,

      message:
        "Le feedback n’a pas pu être enregistré.",
    };
  }
}