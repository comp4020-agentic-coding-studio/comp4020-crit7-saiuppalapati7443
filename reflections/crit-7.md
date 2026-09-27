# Crit 7 reflection

## What was the breakthrough that moved the work forward?

The breakthrough came before I'd written any code. I went into this week thinking the problem with PaperCut was the interface: slow uploads, a cluttered page, bad feedback. While planning the schema, I realised the phantom queue of 100+ jobs is probably a data problem. Somewhere a counter is stored, and nothing keeps it in sync with the jobs it's meant to count. Once I saw that, the rule for my app became simple: queue depth and printer status are never stored, only derived from the jobs table. If a job doesn't exist, it can't be counted.

The second moment was catching a mistake in Claude's plan. It proposed allowing only one printing job per printer, which sounded sensible, but combined with the rest of the model it meant the queue could only ever show 0 or 1. That would have quietly removed the exact thing I was building the app to fix. I changed it so jobs queue in order at each printer.

## What did this work change about who I want to be as a software developer?

I want to be the developer who reads the plan properly before saying yes. The agent was fast and mostly right, and that's what made the one wrong assumption easy to miss. I also want to start with the data. A schema isn't a detail you sort out after the UI; it decides which bugs are even possible.
