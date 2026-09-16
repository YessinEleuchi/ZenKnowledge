import "server-only";

type TriggerIngestionInput = {
  executionId: string;
  versionId: string;
};

export async function triggerDocumentIngestion(
  input: TriggerIngestionInput,
): Promise<void> {
  const url = process.env.N8N_INGESTION_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!url || !secret) {
    throw new Error("Configuration du workflow d’ingestion manquante.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-workflow-secret": secret,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Le webhook n8n a répondu avec le statut ${response.status}.`,
    );
  }
}