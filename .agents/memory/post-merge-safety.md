---
name: Post-merge safety
description: Boundaries for unattended setup and why clean dependency installation is necessary.
---

Keep unattended post-merge preparation limited to dependency reconciliation, offline safety tests, and building. Do not run news-review batches, call AI providers, apply review proposals, or change production schemas from this hook.

**Why:** News reviews use frozen production selections and paid model calls. Merging review tooling does not authorize regenerating those decisions or applying their proposed changes.

**How to apply:** Treat review artifacts and their manual application as separate deliverables. Keep setup non-interactive and fail on dependency, test, or build errors.

Validate setup with a clean lockfile installation, not merely the currently installed dependencies. Preserve compatible transitive security floors until a clean installation demonstrates they can safely be removed.

**Why:** The existing application could run while a clean installation of its older lockfile was blocked by the package firewall. Updating one parent exposed another blocked transitive dependency; testing the running application alone did not reveal either problem.

**How to apply:** Resolve blocked dependencies through approved, compatible updates rather than bypassing the firewall. Confirm the complete setup succeeds from the lockfile and that the managed application workflow starts afterward.
