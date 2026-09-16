import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  timingSafeEqual,
} from "node:crypto";

import {
  prepareDueRevisionTasks,
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

  const result =
    await prepareDueRevisionTasks();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}