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
