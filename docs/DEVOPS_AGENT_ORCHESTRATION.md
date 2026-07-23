# DevOps and agent orchestration

## Purpose

Accelerate Football 2027 development with reproducible CI, bounded issue automation and Linear-assisted orchestration without giving agents destructive repository authority.

## Sources of truth

| Surface | Owns |
|---|---|
| GitHub Issues | Executable engineering scope, acceptance criteria, blockers and closure |
| GitHub pull requests | Code review, checks, implementation evidence and merge history |
| GitHub Actions | Reproducible validation and non-destructive automation |
| Linear | Priority, milestones, dependencies, agent delegation and delivery status |
| Repository docs | Architecture rules and durable operating policy |

Do not maintain two full independent issue backlogs. Linear orchestration issues link to canonical GitHub issues and add sequencing/delegation context rather than copying and drifting from the engineering specification.

## Current coordination links

- Repository: https://github.com/sp80808/football-2027
- DevOps epic: https://github.com/sp80808/football-2027/issues/74
- Mobile/iOS epic: https://github.com/sp80808/football-2027/issues/66
- Linear project: https://linear.app/echochain/project/football-2027-mobile-and-devops-delivery-afb1601fc41f

## Agent execution contract

An issue is eligible for agent execution only when one of these explicit markers is present:

- its title starts with `[agent]`; or
- its body contains `Agent execution: allowed`.

The triage workflow then applies `agent:ready` and `agent:human-review`. Ordinary issues remain `needs-triage` and are not silently delegated.

### Agents may

- inspect code and documentation;
- refine a bounded implementation plan;
- create a branch following the Linear/GitHub naming convention;
- implement code, tests, workflows and documentation within issue scope;
- run validation;
- open or update a draft pull request;
- report failures and create follow-up proposals;
- update Linear status and comments.

### Agents may not

- merge a pull request;
- publish a release or deploy production;
- close the canonical GitHub issue;
- weaken, skip or delete required checks;
- approve their own architecture exception;
- adopt a major dependency upgrade without explicit review;
- change deterministic simulation authority without human review and targeted tests;
- add secrets, credentials, signing files or personal data to artifacts.

## Branch and pull-request traceability

Prefer the Linear-generated branch format when a Linear issue exists:

```text
itsharryspeight/haw-<number>-<short-description>
```

Every agent-authored pull request should include:

```text
GitHub: #<canonical issue>
Linear: HAW-<number>
Agent execution: allowed
Human merge required: yes
```

Commits or PR descriptions should use GitHub closing keywords only when the human reviewer intends the merge to close the canonical issue. Planning and partial implementation PRs should use `Relates to` instead of `Closes`.

## Linear workflow

| Linear state | Meaning |
|---|---|
| Backlog | Not admitted to the current delivery sequence |
| Todo | Scoped and ready, but not actively being changed |
| In Progress | Agent or human has started a branch or concrete implementation |
| In Review | Draft/ready PR exists and validation evidence is available |
| Done | GitHub implementation is merged and the canonical issue outcome is verified |

If states disagree, GitHub is authoritative for implementation reality:

- open PR means Linear cannot be `Done`;
- failed required checks means Linear should remain `In Progress` or `In Review`;
- closed GitHub issue without a merged implementation should be investigated before marking Linear `Done`;
- a Linear agent completion message is not equivalent to a merged or verified change.

## CI quality gate

The baseline workflow runs on pull requests to `main`, pushes to `main` and manual dispatch:

1. frozen pnpm install;
2. TypeScript checking through `pnpm run lint`;
3. Vitest through `pnpm run test`;
4. production Vite build;
5. Chromium Playwright smoke tests;
6. production build artifact upload;
7. Playwright report/trace upload when generated.

Concurrency cancellation stops superseded runs for the same PR/ref. Workflow permissions default to read-only contents.

Recommended branch protection after the first green baseline:

- require `Typecheck, unit tests and build`;
- require `Chromium smoke tests`;
- require `Review dependency changes` when applicable;
- require the branch to be current before merge;
- require at least one human approval for agent-authored work;
- do not enable auto-merge until the project has a stable green history and explicit policy.

## Safe triage behaviour

The triage workflow is intentionally metadata-only. It may:

- create known labels when absent;
- add `needs-triage`;
- classify clear mobile, DevOps, bug and research issues;
- mark explicitly opted-in agent work;
- mark agent/Linear-prefixed pull requests for human review.

It must not comment repeatedly, edit issue bodies, change milestones, assign humans, close issues, merge PRs, update branches or publish releases.

## Dependency automation

Dependabot runs weekly for:

- JavaScript/pnpm dependencies;
- GitHub Actions dependencies.

Minor and patch upgrades are grouped by production/development role. Major JavaScript upgrades are ignored by the automated schedule and must be proposed separately. Automated dependency PRs run the same CI as human PRs and never auto-merge.

Particular review attention is required for upgrades affecting:

- React and React DOM;
- Three.js and rendering packages;
- Vite and TypeScript;
- Playwright/Vitest;
- Colyseus;
- input, physics, audio or persistence behaviour.

## Artifact policy

Allowed CI artifacts:

- production `dist/` output;
- Playwright reports, screenshots and traces;
- generated test or bundle summaries containing no secrets.

Prohibited artifact content:

- `.env` files;
- API keys or tokens;
- certificates or provisioning profiles;
- private user data;
- local browser profiles;
- dependency caches containing credentials.

Retention is deliberately short. Artifacts provide review evidence and do not replace required checks.

## Failure and rollback rules

### CI workflow failure

1. Read the first failing job rather than rerunning blindly.
2. Preserve test traces and logs.
3. Create or update a GitHub issue if the failure is reproducible on `main`.
4. Do not weaken the command, timeout or assertion merely to turn the check green.

### Triage workflow misclassification

1. Remove the incorrect label manually.
2. Tighten the keyword or explicit-marker rule in a reviewed PR.
3. Do not add destructive compensation logic.

### Dependabot noise or unsafe grouping

1. Pause or narrow the relevant update block.
2. Separate sensitive packages from routine groups.
3. Close unwanted update PRs with a reason; do not disable all dependency visibility unless necessary.

## Current official references

- GitHub Actions security and workflow documentation: https://docs.github.com/en/actions
- Node.js CI with GitHub Actions: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs
- GitHub Actions concurrency: https://docs.github.com/en/actions/using-jobs/using-concurrency
- GitHub dependency review: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review
- Dependabot configuration: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
- Linear GitHub integration: https://linear.app/docs/github
- Linear automations: https://linear.app/docs/making-the-most-of-linear

## Next automation candidates

Add only after the baseline is green and reviewed:

1. PR size/risk labelling based on changed paths.
2. Deterministic-engine path ownership requiring explicit review.
3. Bundle-size regression thresholds.
4. Scheduled offline/PWA smoke runs.
5. Real-device test checklist generation.
6. Draft release notes from merged, linked issues.
7. Agent status reconciliation comments between Linear and GitHub.

Do not add autonomous merging, release publication or product-issue closure until each action has a separate policy, rollback path and explicit human approval.
