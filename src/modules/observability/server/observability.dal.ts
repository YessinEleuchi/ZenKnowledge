import "server-only";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";

import { Role } from "@/types/enums";

import type {
  ObservabilityData,
} from "../observability.types";

type ObservabilityOptions = {
  days?: number;
  limit?: number;
};

export async function getObservabilityData({
  days = 30,
  limit = 100,
}: ObservabilityOptions = {}): Promise<ObservabilityData> {
  const actor =
    await requireUser();

  if (actor.role !== Role.ADMIN) {
    throw new Error(
      "Accès administrateur requis.",
    );
  }

  const safeDays =
    Math.min(
      Math.max(days, 1),
      365,
    );

  const safeLimit =
    Math.min(
      Math.max(limit, 1),
      500,
    );

  const since = new Date();

  since.setDate(
    since.getDate() - safeDays,
  );

  /*
   * IMPORTANT :
   *
   * On sélectionne explicitement uniquement
   * les données nécessaires à l'observabilité.
   *
   * Aucun secret, token API, webhook n8n,
   * embedding ou credential n'est chargé ici.
   */
  const rows =
    await db.executionRAG.findMany({
      where: {
        creeLe: {
          gte: since,
        },
      },

      orderBy: {
        creeLe: "desc",
      },

      take: safeLimit,

      select: {
        id: true,

        creeLe: true,

        statut: true,
        modele: true,

        latenceMs: true,

        tokensEntree: true,
        tokensSortie: true,

        sourcesInsuffisantes:
          true,

        question: {
          select: {
            conversation: {
              select: {
                utilisateur: {
                  select: {
                    nom: true,
                    email: true,
                  },
                },

                societe: {
                  select: {
                    nom: true,
                  },
                },
              },
            },
          },
        },

        reponse: {
          select: {
            feedbacks: {
              select: {
                evaluation: true,
                commentaire: true,
              },

              take: 1,
            },
          },
        },

        passages: {
          orderBy: {
            rang: "asc",
          },

          select: {
            rang: true,
            score: true,

            chunk: {
              select: {
                reperePassage:
                  true,

                pageDebut:
                  true,

                pageFin:
                  true,

                version: {
                  select: {
                    numero: true,

                    document: {
                      select: {
                        id: true,
                        titre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  const executions =
    rows.map((row) => {
      const feedback =
        row.reponse
          ?.feedbacks[0] ??
        null;

      const tokensEntree =
        row.tokensEntree ?? 0;

      const tokensSortie =
        row.tokensSortie ?? 0;

      return {
        id:
          row.id,

        creeLe:
          row.creeLe.toISOString(),

        statut:
          row.statut,

        modele:
          row.modele,

        latenceMs:
          row.latenceMs,

        tokensEntree:
          row.tokensEntree,

        tokensSortie:
          row.tokensSortie,

        totalTokens:
          tokensEntree +
          tokensSortie,

        sourcesInsuffisantes:
          row.sourcesInsuffisantes,

        utilisateur: {
          nom:
            row.question
              .conversation
              .utilisateur
              .nom,

          email:
            row.question
              .conversation
              .utilisateur
              .email,
        },

        societe: {
          nom:
            row.question
              .conversation
              .societe
              .nom,
        },

        feedback:
          feedback
            ? {
                evaluation:
                  feedback.evaluation,

                commentaire:
                  feedback.commentaire,
              }
            : null,

        sources:
          row.passages.map(
            (passage) => ({
              rang:
                passage.rang,

              score:
                passage.score,

              documentId:
                passage.chunk
                  .version
                  .document
                  .id,

              titre:
                passage.chunk
                  .version
                  .document
                  .titre,

              numeroVersion:
                passage.chunk
                  .version
                  .numero,

              reperePassage:
                passage.chunk
                  .reperePassage,

              pageDebut:
                passage.chunk
                  .pageDebut,

              pageFin:
                passage.chunk
                  .pageFin,
            }),
          ),
      };
    });

  const totalExecutions =
    executions.length;

  const succes =
    executions.filter(
      (execution) =>
        execution.statut ===
        "SUCCES",
    ).length;

  const echecs =
    executions.filter(
      (execution) =>
        execution.statut ===
        "ECHEC",
    ).length;

  const latencies =
    executions
      .map(
        (execution) =>
          execution.latenceMs,
      )
      .filter(
        (
          latency,
        ): latency is number =>
          latency !== null,
      )
      .sort(
        (a, b) => a - b,
      );

  const latenceMoyenneMs =
    latencies.length > 0
      ? Math.round(
          latencies.reduce(
            (total, value) =>
              total + value,
            0,
          ) /
            latencies.length,
        )
      : 0;

  const p95Index =
    latencies.length > 0
      ? Math.max(
          0,
          Math.ceil(
            latencies.length *
              0.95,
          ) - 1,
        )
      : 0;

  const latenceP95Ms =
    latencies[
      p95Index
    ] ?? 0;

  const totalTokens =
    executions.reduce(
      (
        total,
        execution,
      ) =>
        total +
        execution.totalTokens,
      0,
    );

  const sourcesInsuffisantes =
    executions.filter(
      (execution) =>
        execution
          .sourcesInsuffisantes,
    ).length;

  const feedbacks =
    executions.filter(
      (execution) =>
        execution.feedback !==
        null,
    );

  const utiles =
    feedbacks.filter(
      (execution) =>
        execution.feedback
          ?.evaluation ===
        "UTILE",
    ).length;

  const inexacts =
    feedbacks.filter(
      (execution) =>
        execution.feedback
          ?.evaluation ===
        "INEXACT",
    ).length;

  return {
    summary: {
      totalExecutions,

      succes,
      echecs,

      tauxSucces:
        totalExecutions > 0
          ? Math.round(
              (succes /
                totalExecutions) *
                100,
            )
          : 0,

      latenceMoyenneMs,

      latenceP95Ms,

      totalTokens,

      sourcesInsuffisantes,

      tauxSourcesInsuffisantes:
        totalExecutions > 0
          ? Math.round(
              (
                sourcesInsuffisantes /
                totalExecutions
              ) * 100,
            )
          : 0,

      feedbacks:
        feedbacks.length,

      utiles,

      inexacts,
    },

    executions,
  };
}