import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  timingSafeEqual,
} from "node:crypto";

import {
  markRevisionReminderFailed,
  markRevisionReminderSent,
} from "@/server/workflows/revision-document";

export const runtime =
  "nodejs";

function authorized(
  request: NextRequest,
) {
  const expected =
    process.env
      .N8N_REVISION_WEBHOOK_SECRET;

  const received =
    request.headers.get(
      "x-webhook-secret",
    );

  if (
    !expected ||
    !received
  ) {
    return false;
  }

  const a =
    Buffer.from(expected);

  const b =
    Buffer.from(received);

  return (
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 401,
      },
    );
  }

  const body:
    unknown =
    await request.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("relanceId" in body) ||
    typeof body.relanceId !==
      "string" ||
    !("success" in body) ||
    typeof body.success !==
      "boolean"
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Payload invalide.",
      },
      {
        status: 400,
      },
    );
  }

  if (body.success) {
    await markRevisionReminderSent(
      body.relanceId,
    );
  } else {
    const errorMessage =
      "error" in body &&
      typeof body.error ===
        "string"
        ? body.error
        : "Échec d’envoi n8n.";

    await markRevisionReminderFailed(
      body.relanceId,
      errorMessage,
    );
  }

  return NextResponse.json({
    ok: true,
  });
}