---
name: Model evaluation data
description: Evidence requirements when comparing AI models for this news application.
---

Base model comparisons for this application on real news from its sources, preserving original inputs and source URLs. Synthetic examples may supplement testing but must not substitute for real-news evaluation.

**Why:** The user explicitly corrected an evaluation based on invented stories and requested tests with real news.

**How to apply:** Before model calls, capture the source text and define expected decisions and facts. Separate fidelity to the supplied text from independent fact-checking, and model behavior from downstream application mapping errors. Do not change the app's model merely to run a comparison.

For retrospective news reviews, do not assume historical `full_content` contains publisher text. Require recovered publisher material or explicit provenance; if recovery fails, keep the article pending rather than inferring it is outside the catalog.

**Why:** The historical ingestion pipeline stored generated summaries in the field intended for original content. Reviewing that text as an original source would validate earlier AI errors against themselves.

**How to apply:** Preserve a frozen row backup, record the source URL and retrieval method, and distinguish publisher excerpts from full articles. Never remove an existing publication merely because its original text is unavailable.

For retrospective reviews, a timestamp-looking URL is not proof of a historical edition. Live weather bulletins and graphics can return the newest issue even when an older timestamp remains in the URL.

**Why:** Public NHC `refresh` pages returned later Vance advisories for multiple older records. The official advisory archive retained the numbered editions; local issue dates can differ from the frozen UTC date.

**How to apply:** Match the official archive by cyclone/basin, advisory number and UTC issue time, accounting for the declared time zone. If a graphic or live report cannot be tied to the selected edition, keep it pending rather than substituting the current edition.
