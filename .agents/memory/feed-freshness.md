---
name: Feed freshness on entry
description: User expectations for opening the published app without triggering paid collection.
---

Visitors should receive the latest stored news when opening or returning to the published app, subject to their selected topics.

**Why:** The user explicitly requested that other people opening the published address see the results of the latest update, rather than an older browser copy.

**How to apply:** Treat reading the current feed as separate from collecting/classifying news. Opening or returning to the app must not trigger an RSS collection or an AI call. Preserve administrator-only manual collection and the independent scheduled collection.

The news feed should use continuous scrolling through every available story in the existing seven-day window, not numbered pages or a fixed total-result cap.

**Why:** The user explicitly requested infinite scrolling until the last available news item within the program's existing time scope.

**How to apply:** Fetch stored records incrementally, preserve topic filtering, and stop clearly at the end of the time window. Loading additional items must not trigger collection or classification.

Returning to the app should preserve the reader's loaded history and scroll position while checking for fresh data. Clearly distinguish available totals from currently loaded batches.

**Why:** Restarting the list on each focus event made continuous scrolling appear capped at the initial batch, despite the next batch being available and working.

**How to apply:** Verify scrolling followed by focus/visibility events in a browser, not only the paginated API. Background freshness checks must not discard previously loaded pages.
