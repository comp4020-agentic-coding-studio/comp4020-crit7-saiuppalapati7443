# Process overview

## What I built

FastPrint ANU: a replacement for the slice of ANU's PaperCut Web Print portal I actually use. You submit a print job, see every library printer's real status and queue side by side with your own jobs, and release a job at the printer you choose. `README.md` explains what it is and what good looks like; this file is how I got there.

## How I got here

**Planning before code.** I started by having Claude read the whole starter (CI workflow, spec tests, fly.toml, check-evidence script) and propose a plan without writing anything. My brief to it named my three pain points and set two rules up front:

> Queue depth must be DERIVED from print_jobs, not stored, so it can't drift like the real portal's. printing→completed must be derived from released_at and page count, not an in-memory timer, because fly.toml auto-stops the machine.

Claude's plan was mostly good, and it pushed back in a useful way: it pointed out that storing printer status (idle/printing) was the same drift problem as storing a queue count, so I made busy/idle derived too, and kept only `is_offline` and `paper_level` stored.

**The main correction.** The plan also proposed allowing only one printing job per printer, enforced by a unique index. Combined with jobs having no printer until release, that meant a printer's queue could only ever show 0 or 1, which would have quietly removed the exact thing I was building the app to fix. I replaced it with a sequential queue: releasing to a busy printer is allowed, and each job's finish time is computed from the job released before it. I also set the print duration constants (5s base + 2s per page) so a job completes during a live demo, and dropped a proposed "commit the red test first" rule because it contradicted "`pnpm check` green before every commit". These decisions became the harness in [`c141d8e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-saiuppalapati7443/commit/c141d8e).

**Building.** The schema, migration, seed, submit, dashboard, release, cancel and live SSE updates all landed in one large commit, [`d6c5d4a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-saiuppalapati7443/commit/d6c5d4a). That's the weakest part of this history: I let one prompt run too far, and it makes that stage harder to review. For the rest I asked for one commit per step, which is what [`60612d6...f6ac70f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-saiuppalapati7443/compare/60612d6...f6ac70f) shows: spec tests first, then removing the guestbook only once those tests covered persistence and live broadcast (a rule from my CLAUDE.md), then a polish pass.

**Grounding the README.** Claude drafted the README with every claim about my own experience tagged `[CONFIRM]` for me to check. Reviewing them, I found two sentences that contradicted my own opening: one said the derived queue fixed "the first two" pain points, when the first one (uploads hanging) is fixed a different way, by not uploading at all and saving the job the moment it's submitted. I rewrote those in [`dea4a54`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-saiuppalapati7443/commit/dea4a54). Before that, when I told Claude to commit the README and the tags were still there, it stopped instead of committing placeholders, because I'd told it to halt on any failure rather than work around it.

## How I knew it was right

`spec/fastprint.test.ts` runs against the built server and checks the contracts I care about: a job survives a fresh page load, invalid input and release to an offline printer are rejected, release and cancel move the queue count, one user can't cancel another's job, cross-origin POSTs are refused, and the live stream broadcasts printer updates. `pnpm check` was green (32/32) before each commit. After deploying, I had Claude verify the live site directly: a real job submitted on fly.dev survived a reload, moved to printing on release, and completed after its duration, and `/readme/` served the final README with no placeholders.
