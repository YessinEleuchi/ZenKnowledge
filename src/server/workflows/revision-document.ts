import "server-only";

import { db } from "@/server/db";

import {
  getTodayInTunis,
} from "@/modules/documents/server/document.permissions";

import {
  StatutRelance,
  StatutRevision,
  StatutVersion,
} from "@/types/enums";

const REVISION_DELAY_DAYS = 7;
const REMINDER_DELAY_DAYS = 3;

function addDays(
  date: Date,
  days: number,
) {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return result;
}

export async function prepareDueRevisionTasks() {
  const today =
    getTodayInTunis();

  const documents =
    await db.document.findMany({
      where: {
        supprimeLe: null,

        dateRevision: {
          lte: today,
        },
      },

      select: {
        id: true,
        titre: true,
        dateRevision: true,
        proprietaireId: true,

        versions: {
          orderBy: {
            numero: "desc",
          },

          take: 1,

          select: {
            id: true,
            numero: true,
            statut: true,
          },
        },

        tachesRevision: {
          where: {
            statut: {
              in: [
                StatutRevision.OUVERTE,
                StatutRevision.EN_COURS,
              ],
            },
          },

          take: 1,

          select: {
            id: true,
          },
        },
      },
    });

  let created = 0;

  for (const document of documents) {
    const latest =
      document.versions[0];

    if (!latest) {
      continue;
    }

    if (
      document.tachesRevision.length >
      0
    ) {
      continue;
    }
    if (
      latest.statut !==
        StatutVersion.PUBLIEE &&
      latest.statut !==
        StatutVersion.A_VALIDER
    ) {
      continue;
    }

    await db.$transaction(
      async (tx) => {
    
        const existingTask =
          await tx.tacheRevision.findFirst({
            where: {
              documentId:
                document.id,

              statut: {
                in: [
                  StatutRevision.OUVERTE,
                  StatutRevision.EN_COURS,
                ],
              },
            },

            select: {
              id: true,
            },
          });

        if (existingTask) {
          return;
        }
        if (
          latest.statut ===
          StatutVersion.PUBLIEE
        ) {
          await tx.versionDocument.updateMany({
            where: {
              id:
                latest.id,

              statut:
                StatutVersion.PUBLIEE,
            },

            data: {
              statut:
                StatutVersion.A_VALIDER,
            },
          });
        }

        const now =
          new Date();
        const taskDeadline =
          addDays(
            now,
            REVISION_DELAY_DAYS,
          );

        const reminderDate =
          addDays(
            now,
            REMINDER_DELAY_DAYS,
          );

        const task =
          await tx.tacheRevision.create({
            data: {
              documentId:
                document.id,

              responsableId:
                document.proprietaireId,

              statut:
                StatutRevision.OUVERTE,

              echeance:
                taskDeadline,
            },

            select: {
              id: true,
            },
          });

        await tx.relance.create({
          data: {
            tacheId:
              task.id,

            canal:
              "EMAIL",

            statut:
              StatutRelance.PLANIFIEE,

            prevueLe:
              now,
          },
        });

        await tx.relance.create({
          data: {
            tacheId:
              task.id,

            canal:
              "EMAIL",

            statut:
              StatutRelance.PLANIFIEE,

            prevueLe:
              reminderDate,
          },
        });

        created += 1;
      },
      {
        isolationLevel:
          "Serializable",
      },
    );
  }

  return {
    scanned:
      documents.length,

    created,
  };
}

export async function getPendingRevisionReminders() {
  const now =
    new Date();

  const relances =
    await db.relance.findMany({
      where: {
        statut:
          StatutRelance.PLANIFIEE,

        prevueLe: {
          lte: now,
        },

        tache: {
          statut: {
            in: [
              StatutRevision.OUVERTE,
              StatutRevision.EN_COURS,
            ],
          },

          document: {
            supprimeLe:
              null,
          },
        },
      },

      orderBy: {
        prevueLe:
          "asc",
      },

      take: 100,

      select: {
        id: true,
        prevueLe: true,

        tache: {
          select: {
            id: true,
            creeLe: true,
            echeance: true,

            relances: {
              where: {
                statut:
                  StatutRelance.ENVOYEE,
              },

              select: {
                id: true,
              },
            },

            responsable: {
              select: {
                id: true,
                nom: true,
                email: true,
              },
            },

            document: {
              select: {
                id: true,
                titre: true,
                dateRevision: true,

                societe: {
                  select: {
                    nom: true,
                  },
                },

                service: {
                  select: {
                    nom: true,
                  },
                },

                versions: {
                  orderBy: {
                    numero:
                      "desc",
                  },

                  take: 1,

                  select: {
                    id: true,
                    numero: true,
                    statut: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  return relances.map(
    (relance) => {
      const document =
        relance.tache.document;

      const version =
        document.versions[0];

      const numero =
        relance.tache.relances
          .length + 1;

      return {
        relanceId:
          relance.id,

        tacheId:
          relance.tache.id,

        numero,

        type:
          numero === 1
            ? "REVISION_DUE"
            : "REMINDER",

        prevueLe:
          relance.prevueLe
            .toISOString(),

        echeance:
          relance.tache.echeance
            .toISOString(),

        proprietaire: {
          id:
            relance.tache
              .responsable.id,

          nom:
            relance.tache
              .responsable.nom,

          email:
            relance.tache
              .responsable.email,
        },

        document: {
          id:
            document.id,

          titre:
            document.titre,

          dateRevision:
            document.dateRevision
              .toISOString(),

          service:
            document.service
              ?.nom ??
            "Toute la société",

          societe:
            document.societe.nom,

          versionId:
            version?.id ??
            null,

          numeroVersion:
            version?.numero ??
            null,
        },
      };
    },
  );
}
export async function markRevisionReminderSent(
  relanceId: string,
) {
  const result = await db.relance.updateMany({
    where: {
      id: relanceId,
      statut: StatutRelance.PLANIFIEE,
    },
    data: {
      statut: StatutRelance.ENVOYEE,
      envoyeeLe: new Date(),
      erreur: null,
    },
  });

  if (result.count === 1) {
    return;
  }

  const relance = await db.relance.findUnique({
    where: {
      id: relanceId,
    },
    select: {
      statut: true,
    },
  });

  if (
    relance?.statut ===
    StatutRelance.ENVOYEE
  ) {
    return;
  }

  throw new Error(
    "Relance introuvable ou non confirmable.",
  );
}

export async function markRevisionReminderFailed(
  relanceId: string,
  errorMessage: string,
) {
  const cleanError =
    errorMessage
      .trim()
      .slice(0, 1000);

  const result =
    await db.relance.updateMany({
      where: {
        id:
          relanceId,

        statut:
          StatutRelance.PLANIFIEE,
      },

      data: {
        statut:
          StatutRelance.ECHEC,

        erreur:
          cleanError ||
          "Échec d’envoi n8n.",
      },
    });

  if (result.count !== 1) {
    throw new Error(
      "Relance introuvable ou déjà traitée.",
    );
  }
}