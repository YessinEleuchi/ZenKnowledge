import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInvitationForm } from
  "@/modules/invitations/components/accept-invitation-form";
import { isInvitationValid } from
  "@/modules/invitations/server/accept-invitation.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accepter l’invitation | ZenKnowledge",
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  const valid = await isInvitationValid(token);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-12">
      <div className="rounded-2xl border border-[#DDE3DC] bg-white p-6 shadow-sm">
        <header className="mb-7 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65716A]">
            ZenKnowledge
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-[#202923]">
            {valid ? "Bienvenue dans votre espace" : "Invitation indisponible"}
          </h1>

          <p className="text-sm leading-6 text-[#526A5E]">
            {valid
              ? "Définis ton mot de passe pour accéder à ton compte."
              : "Ce lien est invalide, expiré ou déjà utilisé. Si tu as déjà défini ton mot de passe, connecte-toi. Sinon, demande une nouvelle invitation à ton responsable."}
          </p>
        </header>

        {valid ? (
          <AcceptInvitationForm token={token} />
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-[#285448] underline
              underline-offset-4"
          >
            Aller à la connexion
          </Link>
        )}
      </div>
    </main>
  );
}