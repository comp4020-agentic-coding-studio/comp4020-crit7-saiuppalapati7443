# FastPrint ANU

FastPrint ANU is a slice of ANU's PaperCut Web Print portal, rebuilt: pick a
library printer, submit a job, release it when you're ready, and watch the
printer's real queue and status live, without a reload. It models the
hold-then-release flow PaperCut itself uses — a job sits unassigned until you
choose a printer — across a handful of printers at Chifley, Hancock and Marie
Reay libraries.

I use the ANU Web Print portal most weeks, and three things about it wear me
down: it hangs on file uploads often enough that I've learned to expect it.
[CONFIRM] It shows queues of 100+ jobs that aren't real — numbers that never
seem to go down even when the printer is plainly idle. [CONFIRM] And it never
tells me that a printer two floors away, or in the next building, is actually
free right now. [CONFIRM] Those three are what this prototype is built to fix,
and nothing else. [CONFIRM]

## What good looks like here

**The queue count and the busy/idle status you see are never stored — they're
recomputed from the print jobs themselves every time the page loads or a
client is listening live.** This is the actual fix for the first two pain
points: the real portal's queue and status are numbers someone/something has
to remember to update, and they drift. [CONFIRM] Here there's no counter to
drift, because there's no counter — a printer's queue depth is a count of its
unfinished jobs, computed on read, and "busy" falls out of that same count.
A print job's move from `printing` to `completed` is computed the same way,
from when it was released and how long a job that size should take — never a
background timer, because the server this runs on is allowed to go to sleep
between requests.

**What the database enforces, not just the app:** a print job's status is
restricted to its four real states by a `CHECK` constraint, not just careful
code; a job's printer is a real foreign key to a real printer row; page counts
must be positive. What the app enforces on top, because SQLite can't check it
by itself: you can only release or cancel your own job, and you can't release
to a printer that's offline. What's left to a person's judgement, and not
checked by any test: whether the dashboard actually reads as clear and honest
about a printer's state at a glance, not just correct underneath.

**Printer state is simulated, not sensed.** Whether a printer is offline and
how much paper it has are fixed at startup and don't change from anywhere in
the app — there's no real printer to ask, and no operator screen pretending
otherwise. What genuinely changes live is job state: submitting, releasing,
cancelling, and a job quietly finishing all update the printers you're looking
at, in your tab and everyone else's, without exposing whose job it is or what
it's called.

**Who you are** is an ANU ID typed into a cookie, not a login — enough to keep
"your jobs" straight and stop you from cancelling someone else's by accident,
not enough to stop anyone who edits their own cookie from claiming any ID.
It's identification, not authentication, and that's a deliberate limit, not an
oversight.

## What I chose not to build

No real file uploads — a job is a declared file name and page count, not an
actual document, because the pain point was the queue lying to me, not the
upload pipe. [CONFIRM] No PDF parsing, for the same reason: nothing here needs
to open the file to know how long it takes to print. No payments or print
quotas — ANU printing has a real dollar balance, and it's a whole system of
its own that isn't one of the three things that actually bother me.
[CONFIRM] No real printer integration — nothing here talks to an actual
device over IPP or a driver; every status is the seed data. And no real ANU
authentication — see above.

## What's enforced, and by what

- **Database:** job status and paper level can only be their real enum
  values; a job's printer must exist; a job's page count must be positive.
- **Automated spec tests** (`spec/fastprint.test.ts`, run against the built,
  running app): a submitted job survives a reload; invalid input is rejected;
  a release to an offline printer is rejected; releasing raises that printer's
  queue depth and cancelling lowers it; one person can't cancel another's job;
  a cross-origin form POST is refused; the live-update stream sends bytes.
  Alongside the starter's own invariants (a nav landmark, one heading, alt
  text, an accessibility floor) and the promise that this page carries the
  whole of this file.
- **Judgement, at the crit:** whether the dashboard is actually clear, whether
  the printer names and locations read as real, whether an hour of using it
  would have saved me the trip to a printer that turns out to be offline.
  [CONFIRM]
