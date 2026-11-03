---
name: Classification policy
description: Product constraints for accurate news topics without substantial extra AI spending.
---

Prioritize contextual precision over filling every news item with topics. Abstaining is preferable to assigning a topic from an incidental word. Keep additional AI spending small.

**Why:** The user reported inappropriate category associations caused by literal word matches and explicitly requested contextual classification with only a small spending increase.

**How to apply:** Prefer general category boundaries and contextual evidence over special-case prompt exceptions or an extra routine AI verification call. Do not launch unrestricted historical reclassification without scoping its AI usage.

The user's illustrative stories are test cases, not instructions to insert those specific examples or warnings into the production prompt.

**Why:** The user explicitly asked not to add specific example-based warnings to the prompt.

**How to apply:** Capture ambiguous examples in tests; express production classification rules as general principles about event identity, category scope, and substantial versus incidental context.

Provider migrations must preserve the complete structured summary/classification contract, not merely request valid JSON.

**Why:** Fresh articles were ingested but hidden because model responses did not match the parser's field names; publication dates alone falsely suggested collection was healthy.

**How to apply:** Enforce the response schema at the model API and validate evidence locally. Verify both ingestion freshness and visible classified freshness after changing models. A valid abstention must not trigger another paid classification; recover failed recent records in bounded batches instead of reclassifying history.
