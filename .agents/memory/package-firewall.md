---
name: Package firewall recovery
description: Handling security-blocked dependency installs without bypassing the package firewall.
---

When upgrading a parent dependency after a security block, verify the resolved transitive versions in the lockfile rather than assuming the upgrade replaced them.

**Why:** Installing the latest parent retained a blocked but semver-compatible transitive version from the existing lockfile. The local installed tree already had newer versions, so inspecting node_modules alone was misleading.

**How to apply:** Compare the publishing error with the lockfile. If upgrading the parent still retains the blocked version, invalidate only the affected lock entries and regenerate them through the normal package installer. Keep the firewall enabled and verify installation and the production build.
