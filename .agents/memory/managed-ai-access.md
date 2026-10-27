---
name: Managed AI access
description: Avoid confusing public OpenRouter availability with provisioned Replit-managed app access.
---

Public model catalog availability does not prove that the project can call that model through Replit-managed credentials. The connector catalog and managed AI provider approval flow are separate. A chat choice collected with AskQuestion does not provision either one.

**Why:** Managed OpenRouter access was promised from public catalog listings and documentation, but no actionable managed integration was exposed in the session. Sending the user to the connector panel and repeating approval questions did not establish access.

**How to apply:** Verify an actionable integration or successful authenticated request before claiming a provider is connected. If the required provisioning action is unavailable in the session, state that limitation clearly instead of inventing a connector handle, asking the user to repeat the same prompt, or silently switching to user-owned credentials.

Successful smoke tests do not establish sustained batch capacity. Managed model access may return 429 during a larger review even when small requests succeed.

**Why:** A real-news batch exceeded available request capacity after individual model tests had succeeded. Treating unavailable classification as an empty theme list would incorrectly withdraw publications.

**How to apply:** Checkpoint individual proposals, throttle calls, and resume failures with backoff. Provider errors must remain pending, never become publication or withdrawal decisions. Do not promise a throughput limit without evidence.
