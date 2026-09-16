import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isInternalWorkflowRequest(request: Request) {
  const expected = process.env.N8N_INTERNAL_API_SECRET;
  const received = request.headers.get("x-internal-secret");

  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}