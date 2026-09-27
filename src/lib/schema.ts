import { sql } from "drizzle-orm";
import { check, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// Printers are seeded once at boot (see src/lib/db.ts) and never change from
// the app: offline and paper_level are fixed demo state, not sensed from a
// real device. Busy/idle and queue depth are never stored here — they're
// derived from print_jobs at read time (see src/lib/printjobs.ts).
export const printers = sqliteTable("printers", {
  id: text().primaryKey(),
  name: text().notNull(),
  libraryLocation: text("library_location").notNull(),
  isOffline: int("is_offline", { mode: "boolean" }).notNull().default(false),
  paperLevel: text("paper_level", { enum: ["ok", "low", "empty"] })
    .notNull()
    .default("ok"),
});

export type Printer = typeof printers.$inferSelect;

// A job's queue position and finish time are derived from released_at and
// the duration formula (src/lib/printjobs.ts), never stored or timed — the
// machine this runs on can suspend between requests (see fly.toml).
export const printJobs = sqliteTable(
  "print_jobs",
  {
    id: int().primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id").notNull(),
    fileName: text("file_name").notNull(),
    pageCount: int("page_count").notNull(),
    color: int({ mode: "boolean" }).notNull().default(false),
    duplex: int({ mode: "boolean" }).notNull().default(false),
    status: text({ enum: ["ready_to_release", "printing", "completed", "cancelled"] })
      .notNull()
      .default("ready_to_release"),
    printerId: text("printer_id").references(() => printers.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    releasedAt: text("released_at"),
    completedAt: text("completed_at"),
  },
  (table) => [check("page_count_positive", sql`${table.pageCount} > 0`)],
);

export type PrintJob = typeof printJobs.$inferSelect;
