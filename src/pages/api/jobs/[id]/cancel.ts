import type { APIRoute } from "astro";
import { bus } from "../../../../lib/events";
import { IDENTITY_COOKIE } from "../../../../lib/identity";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  cancelJob,
  derivePrinterStates,
} from "../../../../lib/printjobs";

export const POST: APIRoute = async ({ params, cookies, redirect }) => {
  const ownerId = cookies.get(IDENTITY_COOKIE)?.value;
  if (!ownerId) {
    return new Response("Set your ANU ID first.", { status: 400 });
  }

  const jobId = Number(params.id);

  try {
    cancelJob(jobId, ownerId);
  } catch (err) {
    if (err instanceof NotFoundError) return new Response(err.message, { status: 404 });
    if (err instanceof ForbiddenError) return new Response(err.message, { status: 403 });
    if (err instanceof ConflictError) return new Response(err.message, { status: 409 });
    throw err;
  }

  bus.emit("printers", derivePrinterStates());
  return redirect("/", 303);
};
