---
name: Managed AI provisioning
description: Avoid misdiagnosing missing Replit-managed AI credentials as model errors or organization restrictions.
---

Diagnose managed-AI provisioning separately from model and API compatibility. A client that fails before making an HTTP request has not tested model availability.

**Why:** Missing managed credentials were previously attributed to organization settings without establishing the cause. Searching the connector catalog also failed to establish managed-AI availability.

**How to apply:** Use the app's client to identify the failure stage without exposing credentials. Check current official Replit AI Integrations documentation for provisioning and plan rules; do not promise that naming environment variables or repeating a prompt will inject credentials. Existing-app approval and organization-level enablement are separate requirements. Core availability alone does not imply that an existing app needs no approval.

The user wants the app's AI usage paid only from subscription credits, not a personal provider API key or uncontrolled extra charges.

**Why:** The user explicitly requested investigating how to run Luna while spending only subscription credits.

**How to apply:** Keep provider provisioning separate from spending controls. Managed billing alone does not cap spending at included credits. Verify current shutdown-limit and auto-reload controls, explain that limits can affect other usage-based services, and never claim a billing cap has been configured without actually doing so.

Check the underlying documentation pages before recommending alternate activation routes suggested by documentation search summaries.

**Why:** Search summaries suggested the generic Connectors menu could provision managed OpenAI, but their cited page described third-party account connectors and did not establish that capability.

**How to apply:** Treat such summaries as pointers, not proof of an activation mechanism. Do not invent integration identifiers or edit integration metadata as a substitute for credential provisioning.

The user confirms this workspace is on Core. Replit AI Integrations supports managed credentials on Core, while Pro and Enterprise have an organization-level access toggle.

**Why:** Confusing Core plan access with Pro/Enterprise organization controls caused incorrect guidance.

**How to apply:** For this workspace, do not tell the user that an organization admin must enable AI Integrations solely because the managed provider keys are absent. For an existing app, distinguish plan eligibility from the Agent's managed-integration approval/provisioning flow.
