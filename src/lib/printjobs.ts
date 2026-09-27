import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { printDurationSeconds } from "./duration";
import { type PrintJob, type Printer, printJobs, printers } from "./schema";

export type PrinterState = Printer & { busy: boolean; queueDepth: number };

export class ValidationError extends Error {}
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ConflictError extends Error {}

function nowIso(): string {
  return new Date().toISOString();
}

// Walks a printer's released jobs in release order, working out each one's
// finish time — a job can't start before the previous job on the same
// printer finishes — and writes `completed` for any whose window has
// passed. This runs on every read and every mutation, inside a transaction,
// because there's no timer to do it for us: the machine this runs on can
// suspend between requests (see fly.toml). It's the only place
// `printing -> completed` happens.
function materializePrinter(printerId: string, now: string): void {
  db.transaction((tx) => {
    const active = tx
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.printerId, printerId), eq(printJobs.status, "printing")))
      .orderBy(asc(printJobs.releasedAt))
      .all();

    const nowMs = new Date(now).getTime();
    let priorFinish = 0;
    for (const job of active) {
      const released = new Date(job.releasedAt as string).getTime();
      const start = Math.max(released, priorFinish);
      const finish = start + printDurationSeconds(job.pageCount, job.color, job.duplex) * 1000;
      priorFinish = finish;
      if (finish <= nowMs) {
        tx.update(printJobs)
          .set({ status: "completed", completedAt: now })
          .where(eq(printJobs.id, job.id))
          .run();
      }
    }
  });
}

function syncAllPrinters(now: string): void {
  for (const printer of db.select({ id: printers.id }).from(printers).all()) {
    materializePrinter(printer.id, now);
  }
}

// The state a dashboard and the live-update stream show: never a stored
// counter or flag, always recomputed from print_jobs.
export function derivePrinterStates(): PrinterState[] {
  const now = nowIso();
  syncAllPrinters(now);
  return db
    .select()
    .from(printers)
    .all()
    .map((printer) => {
      const queueDepth = db
        .select()
        .from(printJobs)
        .where(and(eq(printJobs.printerId, printer.id), eq(printJobs.status, "printing")))
        .all().length;
      return { ...printer, busy: queueDepth > 0, queueDepth };
    });
}

export function jobsForOwner(ownerId: string): PrintJob[] {
  syncAllPrinters(nowIso());
  return db
    .select()
    .from(printJobs)
    .where(eq(printJobs.ownerId, ownerId))
    .orderBy(desc(printJobs.id))
    .all();
}

export function createJob(
  ownerId: string,
  fileName: string,
  pageCount: number,
  color: boolean,
  duplex: boolean,
): PrintJob {
  const name = fileName.trim().slice(0, 200);
  if (!name) throw new ValidationError("A file name is required.");
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 500) {
    throw new ValidationError("Pages must be a whole number from 1 to 500.");
  }
  return db.insert(printJobs).values({ ownerId, fileName: name, pageCount, color, duplex }).returning().get();
}

export function releaseJob(jobId: number, ownerId: string, printerId: string): PrintJob {
  const job = db.select().from(printJobs).where(eq(printJobs.id, jobId)).get();
  if (!job) throw new NotFoundError("Job not found.");
  if (job.ownerId !== ownerId) throw new ForbiddenError("That isn't your job.");
  if (job.status !== "ready_to_release") throw new ConflictError("That job isn't waiting for release.");

  const printer = db.select().from(printers).where(eq(printers.id, printerId)).get();
  if (!printer) throw new NotFoundError("Printer not found.");
  if (printer.isOffline) throw new ConflictError("That printer is offline.");

  return db
    .update(printJobs)
    .set({ status: "printing", printerId, releasedAt: nowIso() })
    .where(eq(printJobs.id, jobId))
    .returning()
    .get();
}

export function cancelJob(jobId: number, ownerId: string): PrintJob {
  const job = db.select().from(printJobs).where(eq(printJobs.id, jobId)).get();
  if (!job) throw new NotFoundError("Job not found.");
  if (job.ownerId !== ownerId) throw new ForbiddenError("That isn't your job.");
  if (job.status !== "ready_to_release" && job.status !== "printing") {
    throw new ConflictError("That job is already finished.");
  }
  return db.update(printJobs).set({ status: "cancelled" }).where(eq(printJobs.id, jobId)).returning().get();
}
