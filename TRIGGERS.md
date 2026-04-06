# TRIGGERS

This file records the automatic triggers that existed before the affected workflows were changed to manual-only execution (`workflow_dispatch`).

## Workflows that used to be automatic

| Workflow                                               | Previous automatic triggers                                                                                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                             | `push` to `main`; `pull_request` on `opened`, `reopened`, `synchronize`, `ready_for_review`, `converted_to_draft`                                                                                                                        |
| `.github/workflows/auto-response.yml`                  | `issues` on `opened`, `edited`, `labeled`; `issue_comment` on `created`; `pull_request_target` on `labeled`                                                                                                                              |
| `.github/workflows/sandbox-common-smoke.yml`           | `push` to `main` when `Dockerfile.sandbox`, `Dockerfile.sandbox-common`, or `scripts/sandbox-common-setup.sh` changed; `pull_request` with the same path filters                                                                         |
| `.github/workflows/control-ui-locale-refresh.yml`      | `push` to `main` when `ui/src/i18n/**`, `scripts/control-ui-i18n.ts`, or the workflow itself changed; `release.published`; `schedule` cron `23 4 * * *`                                                                                  |
| `.github/workflows/docs-sync-publish.yml`              | `push` to `main` when `docs/**`, `scripts/docs-sync-publish.mjs`, or the workflow itself changed                                                                                                                                         |
| `.github/workflows/docs-translate-trigger-release.yml` | `release.published`                                                                                                                                                                                                                      |
| `.github/workflows/plugin-npm-release.yml`             | `push` to `main` when `extensions/**`, `package.json`, `scripts/lib/plugin-npm-release.ts`, `scripts/plugin-npm-publish.sh`, `scripts/plugin-npm-release-check.ts`, `scripts/plugin-npm-release-plan.ts`, or the workflow itself changed |
| `.github/workflows/docker-release.yml`                 | `push` of tags matching `v*`, ignoring `docs/**`, `**/*.md`, `**/*.mdx`, `.agents/**`, and `skills/**`                                                                                                                                   |
| `.github/workflows/stale.yml`                          | `schedule` cron `17 3 * * *`                                                                                                                                                                                                             |
| `.github/workflows/labeler.yml`                        | `pull_request_target` on `opened`, `synchronize`, `reopened`, `edited`; `issues` on `opened`, `edited`                                                                                                                                   |
| `.github/workflows/install-smoke.yml`                  | `push` to `main`; `pull_request` on `opened`, `reopened`, `synchronize`, `ready_for_review`, `converted_to_draft`                                                                                                                        |
| `.github/workflows/workflow-sanity.yml`                | `push` to `main`; `pull_request`                                                                                                                                                                                                         |

## Workflows that were already manual-only

These workflows already used only `workflow_dispatch` before this change:

- `.github/workflows/codeql.yml`
- `.github/workflows/macos-release.yml`
- `.github/workflows/openclaw-npm-release.yml`
- `.github/workflows/plugin-clawhub-release.yml`

## Other automation that was found

- `.github/dependabot.yml` still defines scheduled updates:
  - `npm` (`/`): daily
  - `github-actions` (`/`): daily
  - `swift` (`/apps/macos`): daily
  - `swift` (`/apps/shared/MoltbotKit`): daily
  - `swift` (`/Swabble`): daily
  - `gradle` (`/apps/android`): daily
  - `docker` (`/`): weekly
