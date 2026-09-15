import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { db } from "@/server/db";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

// Permet aussi de comparer un hash quand l'email n'existe pas.
const dummyHash = hash("unused-password-for-timing-comparison", 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // bcrypt limite les mots de passe à 72 octets.
        if (Buffer.byteLength(password, "utf8") > 72) return null;

        const user = await db.utilisateur.findUnique({
          where: { email },
          select: {
            id: true,
            nom: true,
            email: true,
            actif: true,
            passwordHash: true,
          },
        });

        const validPassword = await compare(
          password,
          user?.passwordHash ?? (await dummyHash),
        );

        if (
          !user ||
          !user.actif ||
          !user.passwordHash ||
          !validPassword
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.nom,
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },

    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});