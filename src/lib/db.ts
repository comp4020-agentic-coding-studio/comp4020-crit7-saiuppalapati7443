import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { printers } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// Printers are seeded once, at boot, and never change from the app itself —
// there's no operator UI. is_offline and paper_level are fixed demo state, a
// deliberate stand-in for real sensors this prototype doesn't have.
if (db.select({ id: printers.id }).from(printers).all().length === 0) {
  db.insert(printers)
    .values([
      { id: "chifley-l2-01", name: "Chifley L2 MFD", libraryLocation: "Chifley Library, Level 2" },
      {
        id: "chifley-l1-01",
        name: "Chifley L1 MFD",
        libraryLocation: "Chifley Library, Level 1",
        paperLevel: "low",
      },
      { id: "hancock-l3-01", name: "Hancock L3 MFD", libraryLocation: "Hancock Library, Level 3" },
      {
        id: "hancock-gnd-01",
        name: "Hancock Ground MFD",
        libraryLocation: "Hancock Library, Ground Floor",
        isOffline: true,
      },
      {
        id: "reay-l1-01",
        name: "Marie Reay L1 MFD",
        libraryLocation: "Marie Reay Building, Level 1",
        paperLevel: "empty",
      },
    ])
    .run();
}
