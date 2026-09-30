# Contributing

This document describes the development workflow, branch strategy, commit convention, pull requests, and contribution guidelines used in this repository.

## Development Workflow

The general flow is:

```text
Issue
  │
  │ Create a dedicated working branch
  ▼
Working branch: feature/*  fix/*  research/*  refactor/*  docs/*
  │
  │ Pull Request
  │ merge or squash
  ▼
develop
  │
  ├── Working branch automatically deleted
  │
  │ Pull Request
  │ squash only
  ▼
main
```

The `main` branch represents the release/production state of the project, while `develop` is the integration branch for ongoing development.

`main` and `develop` are protected branches. Changes must go through Pull Requests.

All completed work must pass through `develop` before reaching `main`.

Working branches must not open pull requests directly against `main`.

After a `working branch` is merged into `develop`, the branch is automatically deleted.


## Issues

As we have seen in the previous section, the work begins with an issue.

Before starting work:

1. Check whether an Issue already exists for the task.
2. If it doesn't, create an appropriate Issue ([See the issues conventions](https://github.com/SW-Wanted/git-references/blob/main/docs/convention_issue.md)).
3. Assign the Issue to someone else, as appropriate.
4. Create a dedicated work branch for the Issue.

### Creating a branch from an Issue

GitHub provides a **Create a branch** action directly in the Issue under:

```text
Development
└── Create a branch
```

When using this option, make sure that the branch is created from `develop`.

For example, for Issue `#25`:

```text
Issue #25
📝 docs: adicionar um guia de contribuição do projecto
```

The working branch can be:

```text
Branch name:
docs/contributing-guide

Repository destination:
Grupo-IV/junior-astronaut

Branch source:
develop
```

Do not use `main` as the source for a new development branch unless there is a specific reason to do so.

## Branches

| Branch       | Purpose                          | Direct push | Merge strategy  |
| ------------ | -------------------------------- | ----------: | --------------- |
| `main`       | Release / production             |          No | Squash only     |
| `develop`    | Integration / active development |          No | Merge or squash |
| `feature/*`  | New functionality                |         Yes | PR → `develop`  |
| `fix/*`      | Bug fixes                        |         Yes | PR → `develop`  |
| `research/*` | Scientific or technical research |         Yes | PR → `develop`  |
| `refactor/*` | Internal code improvements       |         Yes | PR → `develop`  |
| `docs/*`     | Documentation changes            |         Yes | PR → `develop`  |

### Branch Naming

Branches should follow:

```text
<type>/<short-description>
```
Use lowercase and hyphens for the description.

Examples:

- `feature/solar-storm`

- `fix/mission-result`

- `research/lunar-radiation`

- `refactor/simulation-state`

- `docs/contributing-guide`


The branch type should describe the nature of the work, not merely the Issue title.

### Creating a branch from Terminal

If a branch is not created directly from a GitHub Issue, it must be created manually from the latest `develop` branch:

```bash
git switch develop
git pull origin develop
git switch -c feature/resource-system
```

## Commits

Commits follow the repository's Conventional Commit style.

[See Conventional commits](https://github.com/SW-Wanted/git-references/blob/main/docs/convention_commit.md)

## Pull Requests

Every change intended for `develop` must be submitted through a Pull Request.

The PR title should follow the same commit convention:

```text
<emoji> <type>(<scope>): <description>
```

For example:

```text
✨ feat(simulation): add resource management
```

### Pull Request template

Use the following structure when appropriate:

```markdown
## Summary

Briefly describe the change.

## Changes

- Change 1
- Change 2
- Change 3

## Testing

- `npm run build`
- `npm run test`
- Manual verification

## Issues

Refs #12
```

Use GitHub keywords such as `Closes #12` when the PR completely resolves an Issue.

Use `Refs #12` when the PR is related to the Issue but does not completely resolve it.

### Pull Request Targets

Work branches target `develop`:

```text
feature/*  ---►  develop
fix/*  -------►  develop
research/*  --►  develop
refactor/*  --►  develop
docs/*  ------►  develop
```

Only `develop` targets `main`:

```text
develop  -----►  main
```

## Merge Strategy

Pull Requests from `work branches` into `develop` may use either:

* **Merge commit**
* **Squash and merge**

Pull Requests from `develop` into `main` use:

* **Squash and merge**



For example, several commits in `develop`:

```text
🔧 chore(config): add Vite project foundation
✨ feat(simulation): add mission engine
🐛 fix(test): allow balance suite to finish
✨ feat(gameplay): integrate lunar outpost
📝 docs(readme): update setup guide
```

may become one release-oriented commit in `main`:

```text
✨ feat(mvp): integrate junior astronaut trainer foundation
```

The individual commits remain part of the development history. Squashing does not remove them from `develop`.

Do not merge `main` back into `develop` merely to synchronize their histories. `main` intentionally maintains a condensed release history through squash merges.
