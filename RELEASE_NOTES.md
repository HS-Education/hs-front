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
