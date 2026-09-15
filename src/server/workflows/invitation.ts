import "server-only";

type InvitationPayload = {
  invitationId: string;
  nom: string;
  email: string;
  invitationUrl: string;
};

export async function sendInvitationEmail(
  payload: InvitationPayload,
): Promise<void> {
  const webhookUrl = process.env.N8N_INVITATION_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl || !secret) {
    throw new Error("Configuration n8n manquante.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });


 if (!response.ok) {
  throw new Error(`Le webhook n8n a répondu HTTP ${response.status}.`);
}


const responseText = await response.text();

if (!responseText.trim()) {
  throw new Error(
    `n8n a répondu HTTP ${response.status}, mais sans contenu JSON. Vérifie Respond to Webhook.`,
  );
}

let result: unknown;

try {
  result = JSON.parse(responseText);
} catch {
  throw new Error(
    "n8n a renvoyé une réponse JSON invalide.",
  );
}
  if (
    typeof result !== "object" ||
    result === null ||
    !("ok" in result) ||
    result.ok !== true
  ) {
    throw new Error("Confirmation n8n invalide.");
  }
}