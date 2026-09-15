import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/server/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-svh bg-[#F7F8F5] text-[#202923] lg:grid lg:grid-cols-2">
      {/* Présentation */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#243E35] p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#C7D8B5]" />
          <span className="text-sm font-medium tracking-wide">
            ZenKnowledge
          </span>
        </div>

        <div className="max-w-lg py-16">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-[#C7D8B5]">
            Votre savoir collectif
          </p>

          <h1 className="text-4xl font-medium leading-tight tracking-tight xl:text-5xl">
            Le bon document.
            <br />
            La bonne réponse.
          </h1>

          <p className="mt-6 max-w-sm text-base leading-7 text-white/75">
            Retrouvez les connaissances de votre entreprise et les
            informations utiles à votre travail.
          </p>
        </div>

        <div className="border-t border-white/20 pt-6">
          <p className="text-sm text-white/70">
            Documents, connaissances et réponses dans un même espace.
          </p>
        </div>
      </aside>

      {/* Connexion */}
      <section
        aria-labelledby="login-title"
        className="flex min-h-svh flex-col px-6 py-8 sm:px-12 lg:px-16"
      >
        <header>
          <Image
            src="/images/zen.png"
            alt="ZEN"
            width={120}
            height={48}
            priority
            className="h-10 w-auto object-contain object-left"
          />
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#526A5E]">
              ZenKnowledge
            </p>

            <h2
              id="login-title"
              className="text-3xl font-semibold tracking-tight"
            >
              Connexion
            </h2>

            <LoginForm />

            <div className="mt-8 border-t border-[#DDE3DC] pt-5">
              <p className="text-xs leading-5 text-[#65716A]">
                Vous n’avez pas de compte ? Contactez votre administrateur
                pour obtenir un accès.
              </p>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-[#65716A]">
          ZenKnowledge · Espace de travail interne
        </footer>
      </section>
    </main>
  );
}