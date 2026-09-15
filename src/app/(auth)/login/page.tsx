import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/server/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-gray-900 shadow-sm">
        <h1 className="text-2xl font-semibold">
          Connexion
        </h1>

        <p className="mb-6 mt-2 text-sm text-gray-600">
          Connectez-vous à votre espace ZenKnowledge.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}