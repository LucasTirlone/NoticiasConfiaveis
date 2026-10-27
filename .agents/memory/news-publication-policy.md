---
name: News publication policy
description: Reliability tradeoffs and role-specific model authorization for news ingestion.
---

Prefer withholding a new article when classification or factual grounding cannot be validated, rather than publishing provisional keyword tags or an unreviewed generated translation.

**Why:** The user requested preventing incorrect tags and invented details. Silent fallbacks preserved apparent availability at the expense of those requirements. Withholding uncertain content is the intentional tradeoff; automated review still cannot guarantee factual accuracy.

**How to apply:** Do not restore a publish-first/update-later flow or keyword fallback merely to increase ingestion throughput. Make uncertainty and provider failures explicit. Reconsider the cost/coverage tradeoff with the user if necessary.

A model upgrade approved for theme selection is not permission to replace the models in every stage.

**Why:** Real-news evaluation showed different strengths by role, and the user specifically selected the newer tested model for theme selection, not a wholesale replacement.

**How to apply:** Keep model routing role-specific and seek a new instruction before broadening an upgrade to triage or summarization.
