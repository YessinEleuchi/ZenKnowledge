import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/types/auth";

import { Role, StatutVersion } from "@/types/enums";

export function getTodayInTunis(): Date {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  const day = parts.find((part) => part.type === "day")!.value;

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

type DocumentReadScope = {
  where: Prisma.DocumentWhereInput;
  latestVersionOnly: boolean;
};
export function getDocumentReadScope(
  user: CurrentUser,
): DocumentReadScope | null {
  if (!user.societeId) {
    return null;
  }

  if (user.role === Role.GESTIONNAIRE) {
    return {
      where: {
        societeId: user.societeId,
        supprimeLe: null,
      },
      latestVersionOnly: false,
    };
  }

  if (user.role === Role.COLLABORATEUR) {
  return {
    where: {
      societeId: user.societeId,
      supprimeLe: null,

      rolesAutorises: {
        has: Role.COLLABORATEUR,
      },

      dateRevision: {
        gt: getTodayInTunis(),
      },

      OR: [
        // Documents accessibles à toute la société.
        {
          serviceId: null,
        },

        // Documents propres au service du collaborateur.
        ...(user.serviceId
          ? [
              {
                serviceId: user.serviceId,
                service: {
                  is: {
                    id: user.serviceId,
                    societeId: user.societeId,
                  },
                },
              },
            ]
          : []),
      ],
    },

    latestVersionOnly: true,
  };
}

  // ADMIN et collaborateur sans service : aucun accès ici.
  return null;
}

export function isPublishedVersion(
  version: { statut: StatutVersion } | undefined,
): boolean {
  return version?.statut === StatutVersion.PUBLIEE;
}