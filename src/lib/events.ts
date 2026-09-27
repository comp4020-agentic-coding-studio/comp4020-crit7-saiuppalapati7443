import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here. A
// "printers" event carries a fresh derived snapshot of every printer (id,
// location, offline, paper level, busy, queue depth) — never a job's owner
// or file name, so a broadcast never leaks who's printing what. This only
// works because the app runs on exactly one machine (see fly.toml) — a
// second machine would have its own bus and clients would miss events.
export const bus = new EventEmitter();
bus.setMaxListeners(0);
