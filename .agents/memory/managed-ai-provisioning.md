---
name: Managed AI provisioning
description: Avoid misdiagnosing missing Replit-managed AI credentials as model errors or organization restrictions.
---

Diagnose managed-AI provisioning separately from model and API compatibility. A client that fails before making an HTTP request has not tested model availability.

**Why:** Missing managed credentials were previously attributed to organization settings without establishing the cause. Searching the connector catalog also failed to establish managed-AI availability.

**How to apply:** Use the app's client to identify the failure stage without exposing credentials. Check current official Replit AI Integrations documentation for provisioning and plan rules; do not promise that naming environment variables or repeating a prompt will inject credentials. Existing-app approval and organization-level enablement are separate requirements. Core availability alone does not imply that an existing app needs no approval.
