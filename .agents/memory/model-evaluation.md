---
name: Model evaluation data
description: Evidence requirements when comparing AI models for this news application.
---

Base model comparisons for this application on real news from its sources, preserving original inputs and source URLs. Synthetic examples may supplement testing but must not substitute for real-news evaluation.

**Why:** The user explicitly corrected an evaluation based on invented stories and requested tests with real news.

**How to apply:** Before model calls, capture the source text and define expected decisions and facts. Separate fidelity to the supplied text from independent fact-checking, and model behavior from downstream application mapping errors. Do not change the app's model merely to run a comparison.
