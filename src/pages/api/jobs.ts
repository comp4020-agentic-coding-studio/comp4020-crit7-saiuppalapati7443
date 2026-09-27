import type { APIRoute } from "astro";
import { bus } from "../../lib/events";
import { IDENTITY_COOKIE } from "../../lib/identity";
import { ValidationError, createJob, derivePrinterStates } from "../../lib/printjobs";

// Submits a job in ready_to_release, unassigned to any printer. Choosing a
// printer happens at release (see api/jobs/[id]/release.ts) — the same
// hold-then-release shape as the real portal.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const ownerId = cookies.get(IDENTITY_COOKIE)?.value;
  if (!ownerId) {
    return new Response("Set your ANU ID before submitting a job.", { status: 400 });
  }

  const form = await request.formData();
  const fileName = String(form.get("file_name") ?? "");
  const pageCount = Number(form.get("page_count"));
  const color = form.get("color") === "on";
  const duplex = form.get("duplex") === "on";

  try {
    createJob(ownerId, fileName, pageCount, color, duplex);
  } catch (err) {
    if (err instanceof ValidationError) return new Response(err.message, { status: 400 });
    throw err;
  }

  bus.emit("printers", derivePrinterStates());
  return redirect("/", 303);
};
