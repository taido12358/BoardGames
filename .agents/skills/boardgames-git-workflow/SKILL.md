---
name: boardgames-git-workflow
description: Sync BoardGames with origin/master at session start and publish verified AI changes to master. Applies only to this repository.
---

# BoardGames Git workflow

## Start of session

1. Run `git status -sb` and `git fetch origin master`. Compare local `master` with `origin/master` before editing.
2. On `master`, if behind and safe to update, run `git pull --ff-only origin master`. Preserve pre-existing edits and commits. If the checked-out branch or local work would interfere, use an isolated task worktree from `origin/master` when practical. Report any divergence or sync failure that cannot be resolved safely.

## After verification passes

1. At each tested checkpoint with completed changes, stage only task files, review the staged diff, and commit with a descriptive message. Use relevant tests for code or diff and link checks for documentation. Skip empty commits and keep failed or unverified changes local.
2. Fetch `origin/master` again. If new remote commits need integrating, integrate them safely and rerun affected checks. Inspect the commits that will be published and exclude unrelated local work.
3. Push to `origin/master` with `git push origin master` from the verified local master, or `git push origin HEAD:master` from the isolated task worktree. Verify that the remote contains the commit. If another push races yours, fetch, integrate, and retest before retrying.

Never force-push or bypass branch protection. If GitHub requires a pull request, follow that requirement and report whether the change reached master. Task-specific user instructions override these defaults.
