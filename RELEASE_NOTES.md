# Hotfix 0.2.9

## Two-week grading-period compatibility

- Pair the frontend package with backend 0.2.9 for the matching-tag Azure deployment contract; keep the existing same-origin configuration and hostname.
- The academic-year editor does not impose a three-week minimum. Add regressions proving it submits and displays a successful two-week update, retaining edits when the server rejects an invalid duration.
- Leave authorization, CSRF, cloud smoke, deployment gates and production data unchanged. New-version Azure acceptance remains a post-deployment step.

---

# Hotfix 0.2.8

## Cloud missing-route smoke coverage

- Pair the frontend release with backend 0.2.8; keep same-origin `/api/v1` configuration and the current Azure hostname.
- Require safe JSON HTTP 404 for unknown public routes, missing static assets and disabled Swagger; check that responses do not reflect the requested path.
- Verify an authenticated unknown API returns HTTP 404 rather than HTTP 500 or an Angular HTML fallback, while retaining anonymous authentication checks and repeated-write/logout smoke coverage.
- Do not change the Angular route allowlist or frontend UI. Direct unknown server routes return JSON 404; the existing Angular wildcard still redirects client-side navigation to the not-found page.
- Publish `hotfix/0.2.8` and its PR into main, stopping before merge, synchronization, matching tag publication or protected deployment. New smoke assertions must run against the newly deployed backend, not the current version.

---

# Hotfix 0.2.7

## CSRF recovery across Angular requests and native streaming

- Version the in-memory CSRF cache across authentication transitions. A late bootstrap from an older generation cannot restore a stale token or clear a newer pending request; concurrent rejections share the replacement.
- Retry a write at most once only for HTTP 403 with the backend filter's explicit `CSRF_TOKEN_MISSING` or `CSRF_TOKEN_INVALID` code, before its controller executed. Never replay ordinary permission failures, HTTP 500, session failures, provider errors, partially consumed streams or network failures.
- Apply the same contract to Angular HttpClient and Sery's native fetch path without weakening cookies, CSRF validation or origin restrictions.
- Distinguish an expired session, an authorization rejection and a server failure before streaming from a response interrupted after streaming begins, in both chat interfaces and both languages.
- Add unit regressions for invalidation races, bounded recovery and consecutive messages, plus synthetic browser journeys covering session creation, three answers, recovery, no duplicate AI generations and UI logout.

## CI and deployed smoke coverage

- Run the synthetic UI/CSRF browser suites in a dedicated frontend CI job. Fixtures intercept API requests and do not use Azure accounts or an AI provider.
- Type-check unit tests in CI and explicitly type the existing avatar regression fixture parameters.
- Select password generation by its real accessible title in the integrated student-creation journey, rather than relying on button order after the copy control was added.
- Strengthen the login smoke with three sequential POST requests to the GET-only CSRF endpoint, expecting JSON HTTP 405 while reusing the same valid cookie/token. These requests do not mutate production data and detect per-request cookie deletion missed by parallel logout alone.
- Synthetic/local success is not Azure functional acceptance. After deployment, separately validate consecutive Sery queries and logout using an authorized Sery-enabled test account, then the remaining module journeys.

## Protected hotfix preparation

- Set version 0.2.7 and prepare `hotfix/0.2.7` from `main`, paired with backend 0.2.7.
- Publish the branch and open the PR into `main`, leaving merge, `develop` synchronization, new matching tags and protected deployment for the next reviewed session.
- Keep existing tags, GitHub protection rules, deployment approval and cloud resources unchanged.

---

# Hotfix 0.2.6

## Authentication and administrative UI corrections

- Prevent repeated sign-in and logout submissions while a request is pending; retain login loading state through route navigation.
- Add accessible, independent password visibility controls to sign-in and password-update forms.
- Allow administrators to copy generated passwords, handle denied clipboard access without exposing the password, and clear the generated value when the modal closes.
- Use an HS Education favicon, name-based avatar initials, translated classroom planning labels and theme-aware generation information.
- Keep the onboarding tutorial open on save failure, display a translated retry message and close only after successful persistence.
- Add synthetic-data browser regressions for Chrome and Firefox. Extend the real deployment smoke to require successful concurrent logout requests before accepting deployment.

## Protected hotfix integration

- Prepare `hotfix/0.2.6` from `main`, paired with backend 0.2.6. This is not an already-deployed release.
- Require CI, CodeQL and independent approval for `hotfix/0.2.6` into `main`; then synchronize `main` into `develop` through a reviewed PR.
- Publish matching new `v0.2.6` tags on the reviewed main commits, frontend first. Preserve existing tags and environment approval protections.
- Local mocked browser tests do not establish Azure functional acceptance. Validate the reported logout and Firefox behavior after protected deployment.

---

# Release 0.2.5

## Coordinated Azure startup readiness release

- Set the frontend package version to 0.2.5 to pair with the backend cloud readiness fix.
- Preserve Angular application behavior, dependencies, the pnpm lockfile and protected release/smoke workflows.
- Produce matching tagged frontend assets so the backend can verify their main ancestry, manifest and checksum before packaging the same-origin Java/Angular application.

## Release preparation and integration

- Create `release/0.2.5` from integrated `develop` after its CI and CodeQL passed.
- Run all 8 local deployment/workflow tests; these do not establish cloud browser or functional acceptance.
- Require current CI, CodeQL and independent approval before merging the release PR into `main`, then synchronize `main` back into `develop` through reviewed PRs.
- Publish matching new `v0.2.5` tags on final main commits, frontend first; preserve `v0.2.4` and existing release assets.
- The authorized collaborator publishes the tags/initiates protected jobs so the designated reviewer can approve without self-review or bypass.
- Branch publication does not deploy. The backend CD deploys the frontend together with Java and runs browser smoke only after successful deployment.

---

# Release 0.2.4

## Coordinated Azure Web App authentication recovery release

- Set the frontend package version to 0.2.4 to pair with the backend Web App deployment authentication correction.
- Preserve Angular application behavior, dependencies, the pnpm lockfile and protected deployment/smoke workflows.
- Produce matching tagged frontend assets so the backend can verify their main ancestry, manifest and checksum before packaging Java and Angular together.

## Release preparation and integration

- Create `release/0.2.4` from integrated `develop`; require current CI, CodeQL and independent approval before merging its PR into `main`.
- Run the 8 local deployment/workflow tests; these do not establish Azure functional acceptance.
- Synchronize `main` back into `develop` through a separate reviewed PR after release integration.
- Publish new matching `v0.2.4` tags on final main commits, frontend first; preserve existing tags and release assets.
- Keep protected environment approvals and self-review restrictions. An authorized collaborator must initiate protected runs so the designated reviewer can approve them.
- Branch publication does not deploy. The backend CD deploys the same-origin frontend with Java, followed by browser smoke validation.

---

# Release 0.2.3

## Coordinated Azure migration recovery release

- Set the frontend package version to 0.2.3 to pair with the backend OIDC and PostgreSQL migration firewall fixes.
- Preserve Angular application behavior, dependencies, the pnpm lockfile and existing protected deployment/smoke workflows.
- Produce a new frontend artifact under the matching release tag so the backend can verify its tag, main ancestry, manifest and checksum before packaging.

## Release preparation and integration

- Create `release/0.2.3` from integrated `develop` after its CI and CodeQL checks succeeded.
- Repeat the 8 deployment/workflow tests locally; this release does not change application code or claim Azure functional acceptance.
- Open the release PR into `main`; wait for checks and approval on its current SHA before merging, then synchronize `main` back into `develop`.
- Publish matching new `v0.2.3` tags on the final main commits, frontend first. Preserve `v0.2.2` and other existing tags and release assets.
- Keep environment approval before frontend artifact publication and backend deployment; automatic backend browser smoke follows successful deployment.
- Branch publication does not initiate cloud deployment. The same-origin frontend is deployed with Java by the backend CD, not as a separate Web App upload.

---

# Release 0.2.2

## Protected tag-driven Azure release

- Prepare the frontend package automatically on release tag pushes, using same-origin App Service hosting and the protected environment approval.
- Preserve manual recovery and keep optional Static Web Apps deployment restricted to explicit manual selection.
- Share the strict HTTPS same-origin smoke destination guard between manual frontend smoke and automatic post-deployment backend smoke.
- Add regression checks for tag events, approval gates, manual-only SWA, smoke ordering and credential-safe destination rejection.
- Keep standalone frontend smoke manual for diagnostics; the backend CD runs it automatically after successful deployment using the verified matching frontend commit.

## Release preparation and integration

- Set the frontend package version to 0.2.2 to pair with backend 0.2.2; dependencies and the pnpm lockfile remain unchanged.
- Create `release/0.2.2` from integrated `develop` after the tag-driven CD feature was merged.
- Open the release pull request into `main`; wait for CI, security checks and approval before merging, then synchronize `main` back into `develop`.
- The collaborator publishes the new `v0.2.2` tags on the final main commits, frontend first; the designated reviewer approves the protected environments without self-approval or bypass.
- Do not move `v0.2.1` or other existing tags. This branch publication does not initiate deployment or establish cloud functional acceptance.

---

# Release 0.2.1

## Coordinated Azure release

- Set the frontend package version to 0.2.1 to pair with backend 0.2.1 and its managed-identity deployment operations fix.
- Preserve the existing frontend application behavior, dependencies and deployment workflows; this release only changes version metadata and release notes.
- No lockfile update is required because the pnpm lockfile does not store the root package version.

## Release preparation and integration

- Create `release/0.2.1` from the integrated `develop` branch.
- Open the release pull request into `main`; wait for CI, security checks and approval before merging.
- Synchronize `main` back into `develop` after promotion and publish a new `v0.2.1` tag on the final main commit. Do not move existing tags.
- After both tags are available, run Frontend Azure release in app-service mode, then Backend Azure CD, then Azure browser smoke, using `v0.2.1` in sequence with protected environment approvals.
- Release preparation does not deploy the application or establish cloud functional acceptance.

---

# Release 0.2.0

## Azure deployment preparation

- Add public runtime configuration and Azure production packaging without embedding credentials in Angular.
- Support same-origin Angular/Java hosting on App Service; keep Static Web Apps optional and gated on a validated login/domain strategy.
- Add manual tagged frontend release packaging with checksum manifests and protected cloud smoke workflows.
- Expand browser smoke coverage for anonymous routes, authentication, secure cookies, guarded-route reload and logout.

## Security and reliability

- Bootstrap masked CSRF tokens and attach them only to configured API writes, including Sery streaming requests.
- Share concurrent CSRF bootstrap requests, invalidate cached tokens after authentication actions and fail closed without replaying forbidden writes.
- Generate administrative passwords with Web Crypto and unbiased selection instead of `Math.random()`.
- Preserve local development and prevent cloud traces from recording authentication credentials or document content.

## Release preparation and integration

- Set the frontend package version to 0.2.0 and pair it with backend 0.2.0; publish both together for the new CSRF contract.
- No dependency changes are required; the pnpm lockfile does not store the root package version.
- Create `release/0.2.0` from integrated `develop` and merge the current `main` history before promotion.
- The project owner confirmed functional validation from integrated develop before release preparation.
- Release preparation verification passed: 55 frontend unit tests, 3 deployment-configuration tests, dictionary validation and the production build. The existing initial-bundle size warning remains; the build succeeded.
- Merge the release PR into `main` only after current CI, security checks and review pass; then synchronize `main` back into `develop`.
- Create a new `v0.2.0` tag on each promoted main commit. Do not move existing tags.
- Azure provisioning and cloud acceptance remain a subsequent phase; keep CD disabled until the required infrastructure, OIDC and configuration are ready.

---

# Release 0.1.1

## Fixes

- Preserve Sery refresh and streaming state across navigation.
- Render mathematical fractions without overlapping numerator and denominator.
- Display neutral empty states in the coordinator repository and area metrics.
- Distinguish empty data from actual request failures.
- Hide the Sery bubble for administrators.

## Release preparation

- Set the frontend package version to 0.1.1.
- Create `release/0.1.1` from the integrated `develop` branch.
- Pair this release with backend 0.1.1.

## Validation and integration

- Functional validation was completed locally before release preparation.
- Frontend unit tests: 41 passed.
- Angular template and TypeScript compilation passed.
- Merge the release pull request into `main` after CI, security checks and review pass.
- Merge the release metadata back into `develop` after promotion to `main`.
