import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { z } from "zod";

import { PrismaClient } from "../src/generated/prisma/client";

const seedSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SEED_ADMIN_NAME: z.string().trim().min(1),
  SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().email().max(254),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(12)
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Le mot de passe dépasse 72 octets.",
    )
    .refine(
      (password) =>
        password !== "REMPLACE_PAR_UN_MOT_DE_PASSE_UNIQUE",
      "Remplace le mot de passe d'exemple.",
    ),
});

async function main() {
  const parsed = seedSchema.safeParse(process.env);

  if (!parsed.success) {
    // Affiche les erreurs de validation, sans afficher les secrets.
    for (const issue of parsed.error.issues) {
      console.error(`${issue.path.join(".")} : ${issue.message}`);
    }

    throw new Error("Configuration du seed invalide.");
  }

  const env = parsed.data;

  // Client indépendant : le seed s'exécute hors de Next.js.
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const existingUser = await prisma.utilisateur.findUnique({
      where: { email: env.SEED_ADMIN_EMAIL },
      select: {
        id: true,
        role: true,
        actif: true,
        passwordHash: true,
      },
    });

    if (existingUser) {
      if (
        existingUser.role !== "ADMIN" ||
        !existingUser.actif ||
        !existingUser.passwordHash
      ) {
        throw new Error(
          "Cet email existe déjà, mais ne correspond pas à un admin actif avec mot de passe. Aucun changement effectué.",
        );
      }

      console.info(
        "Administrateur déjà présent. Aucun changement effectué.",
      );
      return;
    }

    const passwordHash = await hash(env.SEED_ADMIN_PASSWORD, 12);

    const admin = await prisma.utilisateur.create({
      data: {
        nom: env.SEED_ADMIN_NAME,
        email: env.SEED_ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        actif: true,
        societeId: null,
        serviceId: null,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
      },
    });

    console.info("Administrateur créé :", admin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Échec du seed.",
  );
  process.exitCode = 1;
});