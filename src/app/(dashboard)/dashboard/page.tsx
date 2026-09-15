import { logoutAction } from "@/modules/auth/server/auth.actions";
import { requireUser } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.nom}
        </h1>

        <p className="mt-2 text-gray-500">
          Vous êtes connecté avec {user.email}.
        </p>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg border px-4 py-2"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  );
}