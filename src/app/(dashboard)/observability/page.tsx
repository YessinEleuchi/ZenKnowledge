import {
  Activity,
  Brain,
  Clock3,
  FileSearch,
  MessageSquareText,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth/session";

import { Role } from "@/types/enums";

import {
  getObservabilityData,
} from "@/modules/observability/server/observability.dal";

export const runtime =
  "nodejs";

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "fr-FR",
  ).format(value);
}

function formatLatency(
  value: number,
) {
  if (value >= 1000) {
    return `${(
      value / 1000
    ).toFixed(2)} s`;
  }

  return `${value} ms`;
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Africa/Tunis",
    },
  ).format(
    new Date(value),
  );
}

export default async function ObservabilityPage() {
  const user =
    await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !== Role.ADMIN
  ) {
    redirect("/dashboard");
  }

  const data =
    await getObservabilityData({
      days: 30,
      limit: 100,
    });

  const {
    summary,
    executions,
  } = data;

  const cards = [
    {
      label:
        "Exécutions RAG",
      value:
        formatNumber(
          summary.totalExecutions,
        ),
      helper:
        `${summary.tauxSucces}% de succès`,
      icon: Activity,
    },

    {
      label:
        "Latence moyenne",
      value:
        formatLatency(
          summary.latenceMoyenneMs,
        ),
      helper:
        `P95 ${formatLatency(
          summary.latenceP95Ms,
        )}`,
      icon: Clock3,
    },

    {
      label:
        "Tokens",
      value:
        formatNumber(
          summary.totalTokens,
        ),
      helper:
        "Entrée + sortie",
      icon: Zap,
    },

    {
      label:
        "Sources insuffisantes",
      value:
        `${summary.tauxSourcesInsuffisantes}%`,
      helper:
        `${summary.sourcesInsuffisantes} exécution(s)`,
      icon: FileSearch,
    },

    {
      label:
        "Réponses utiles",
      value:
        formatNumber(
          summary.utiles,
        ),
      helper:
        `${summary.feedbacks} feedback(s)`,
      icon: ThumbsUp,
    },

    {
      label:
        "Réponses inexactes",
      value:
        formatNumber(
          summary.inexacts,
        ),
      helper:
        "À analyser",
      icon: ThumbsDown,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#E5ECE3]">
            <Activity
              className="size-5 text-[#285448]"
              strokeWidth={1.8}
            />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#202923]">
              Observabilité RAG
            </h1>

            <p className="mt-1 text-sm text-[#65716A]">
              Performance,
              récupération documentaire
              et qualité des réponses sur
              les 30 derniers jours.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <article
                key={card.label}
                className="rounded-2xl border border-[#DDE3DC] bg-white p-5 shadow-[0_1px_2px_rgba(20,40,30,0.03)]"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-[#59675E]">
                    {card.label}
                  </p>

                  <Icon
                    className="size-[18px] text-[#789087]"
                    strokeWidth={
                      1.7
                    }
                  />
                </div>

                <p className="mt-4 text-2xl font-semibold tracking-tight text-[#243E35]">
                  {card.value}
                </p>

                <p className="mt-1 text-xs text-[#7A867F]">
                  {card.helper}
                </p>
              </article>
            );
          },
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#DDE3DC] bg-white">
        <div className="border-b border-[#E3E8E3] px-5 py-4">
          <h2 className="font-semibold text-[#243E35]">
            Exécutions récentes
          </h2>

          <p className="mt-1 text-xs text-[#758179]">
            Les 100 dernières
            exécutions de la période.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#FAFBF9] text-xs uppercase tracking-wide text-[#65716A]">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Date
                </th>

                <th className="px-5 py-3 font-medium">
                  Utilisateur
                </th>

                <th className="px-5 py-3 font-medium">
                  Modèle
                </th>

                <th className="px-5 py-3 font-medium">
                  Latence
                </th>

                <th className="px-5 py-3 font-medium">
                  Tokens
                </th>

                <th className="px-5 py-3 font-medium">
                  Sources
                </th>

                <th className="px-5 py-3 font-medium">
                  Feedback
                </th>

                <th className="px-5 py-3 font-medium">
                  Statut
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF0EC]">
              {executions.map(
                (execution) => (
                  <tr
                    key={
                      execution.id
                    }
                    className="align-top hover:bg-[#FBFCFA]"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-[#65716A]">
                      {formatDate(
                        execution.creeLe,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-[#243E35]">
                        {
                          execution
                            .utilisateur
                            .nom
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-[#7A867F]">
                        {
                          execution
                            .societe
                            .nom
                        }
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F4EF] px-2 py-1 text-xs text-[#52625A]">
                        <Brain className="size-3.5" />

                        {
                          execution.modele
                        }
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {execution.latenceMs !==
                      null
                        ? formatLatency(
                            execution.latenceMs,
                          )
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <p>
                        {formatNumber(
                          execution.totalTokens,
                        )}
                      </p>

                      <p className="mt-1 text-[11px] text-[#8A958E]">
                        ↑{" "}
                        {formatNumber(
                          execution.tokensEntree ??
                            0,
                        )}{" "}
                        ↓{" "}
                        {formatNumber(
                          execution.tokensSortie ??
                            0,
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {execution.sources
                        .length ===
                      0 ? (
                        <span className="text-[#8A958E]">
                          —
                        </span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-[#285448]">
                            {
                              execution
                                .sources
                                .length
                            }{" "}
                            passage(s)
                          </summary>

                          <div className="mt-3 w-80 space-y-2">
                            {execution.sources.map(
                              (
                                source,
                              ) => (
                                <div
                                  key={`${execution.id}-${source.rang}`}
                                  className="rounded-lg border border-[#E3E8E3] bg-[#FAFBF9] p-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-[#243E35]">
                                      {
                                        source.titre
                                      }
                                    </p>

                                    <span className="text-xs text-[#758179]">
                                      #
                                      {
                                        source.rang
                                      }
                                    </span>
                                  </div>

                                  <p className="mt-1 text-xs text-[#758179]">
                                    Version{" "}
                                    {
                                      source.numeroVersion
                                    }
                                    {" · "}
                                    score{" "}
                                    {source.score.toFixed(
                                      3,
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-[#8A958E]">
                                    {
                                      source.reperePassage
                                    }

                                    {source.pageDebut !==
                                      null
                                      ? ` · page ${source.pageDebut}`
                                      : ""}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </details>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {!execution.feedback ? (
                        <span className="text-[#8A958E]">
                          —
                        </span>
                      ) : (
                        <div className="max-w-64">
                          <span
                            className={
                              execution
                                .feedback
                                .evaluation ===
                              "UTILE"
                                ? "inline-flex rounded-md bg-[#EAF2E8] px-2 py-1 text-xs font-medium text-[#365C3D]"
                                : "inline-flex rounded-md bg-[#FFF0ED] px-2 py-1 text-xs font-medium text-[#963F32]"
                            }
                          >
                            {execution
                              .feedback
                              .evaluation ===
                            "UTILE"
                              ? "Utile"
                              : "Inexact"}
                          </span>

                          {execution
                            .feedback
                            .commentaire && (
                            <p className="mt-2 text-xs leading-5 text-[#65716A]">
                              {
                                execution
                                  .feedback
                                  .commentaire
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          execution.statut ===
                          "SUCCES"
                            ? "rounded-md bg-[#EAF2E8] px-2 py-1 text-xs font-medium text-[#365C3D]"
                            : execution.statut ===
                                "ECHEC"
                              ? "rounded-md bg-[#FFF0ED] px-2 py-1 text-xs font-medium text-[#963F32]"
                              : "rounded-md bg-[#FAF2DF] px-2 py-1 text-xs font-medium text-[#806122]"
                        }
                      >
                        {
                          execution.statut
                        }
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {executions.length ===
          0 && (
          <div className="px-5 py-12 text-center">
            <MessageSquareText className="mx-auto size-6 text-[#9AA59E]" />

            <p className="mt-3 text-sm text-[#65716A]">
              Aucune exécution RAG sur
              cette période.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}