# Contributing to portguard

## Local Setup
1. Install bash and [shellcheck](https://www.shellcheck.net/) (or run it from its Docker image).
2. Clone the repository.

## Install Git Hooks
```
./scripts/install-hooks.sh
```

`core.hooksPath` is per-checkout config and is not committed, so run the installer after every clone. `git push --no-verify` bypasses the hooks by design; they stop accidents, not malice. The pre-push hook only allows pushes to `github.com/cocodedk` and blocks force-push and deletion of `main`.

## Build and Test Commands
```
tests/run.sh
shellcheck -x portguard tests/run.sh scripts/install-hooks.sh .githooks/*
```

The script is sourceable: it only runs `main` when executed, so tests load it and call its functions. Add a test for any change to the parsing or decision logic, using documentation addresses (192.0.2.x, 198.51.100.x, 2001:db8::) in fixtures.

## Coding Style
- Bash, kept small and focused; named constants at the top, no magic values.
- Shellcheck clean. A `disable` needs a reason in the comment.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:` ...); the commit-msg hook checks it.

## Local Git Setup
```bash
git config pull.rebase true
git config core.autocrlf input       # Windows: true
git config push.autoSetupRemote true
git config init.defaultBranch main
```

## Branch Naming
The branch prefix matches the Conventional Commit type, in kebab-case: `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, `ci/`. Never commit directly to `main`; open a PR.

## PR Checklist
- [ ] `tests/run.sh` and shellcheck pass.
- [ ] Manual test done for changed probe or firewall behaviour (see "Try it" in the README).
- [ ] Docs updated if behaviour changed.
