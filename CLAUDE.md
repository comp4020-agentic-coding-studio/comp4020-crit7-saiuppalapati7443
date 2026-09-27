# CLAUDE.md — FastPrint ANU

Working rules for this repo, decided during crit-7 planning.

- Schema changes go `schema.ts` → `pnpm db:generate` → commit the migration together with the schema change. Never hand-edit `drizzle/`.
- Queue depth and printer busy/idle are always derived from `print_jobs` at query time, never stored.
- `printing → completed` is computed from `released_at` and the duration formula at read time; never a timer.
- Every new page is added to `spec/routes.ts` in the same commit.
- Every page keeps one `<h1>`, a labelled `<nav>`, a real `<title>`, alt text on every image; never weaken `invariants.test.ts` to pass.
- `/readme/` serves the full current `README.md`.
- Keep `/api/events` streaming; repurpose its payload, never remove it.
- Keep `/` server-rendered and `astro.config.ts` security settings unchanged.
- Delete `guestbook.test.ts` only once the print-job tests cover persistence and live broadcast.
- `pnpm check` is green before every commit; one feature per commit.
- Ask before adding a dependency or changing scope.
