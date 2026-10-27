#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Unattended setup must not run news-review jobs, call AI providers, apply
# database changes, or publish. Review artifacts remain separate deliverables.
npm ci --include=dev --no-audit --no-fund
npm run test:news
npm run build
