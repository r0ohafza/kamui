# spotlight

Switch your main branch to any git worktree's state.

Spotlight is a long-running CLI that lets you preview worktrees on your main branch. Pick a worktree, and main instantly reflects its state. Switch between worktrees freely. When you exit, main resets back to `origin/main` automatically.

## Install

```bash
pnpm install -g .
```

## Usage

Run `spotlight` from any git repository that has worktrees:

```bash
spotlight
```

Use arrow keys to select a worktree, then press Enter.

```
spotlight — switch main to any worktree's state

Main branch: main
? Select a worktree to spotlight:
❯ feature-auth      ~/projects/myapp-auth      a1b2c3d
  fix-header         ~/projects/myapp-header    e4f5g6h
  Exit
```

Once a worktree is active, the menu updates to let you switch or reset:

```
? Spotlight active on feature-auth. Switch or reset?
❯ feature-auth (active)  ~/projects/myapp-auth      a1b2c3d
  fix-header              ~/projects/myapp-header    e4f5g6h
  Reset to origin/main
  Exit
```

## What it does

1. Lists all git worktrees in the current repo
2. Resets the main branch to the selected worktree's commit (`git reset --hard`)
3. Keeps running so you can switch between worktrees at any time
4. Automatically resets main to `origin/main` when you exit (Ctrl+C or select Exit)

## Development

```bash
pnpm install
pnpm dev          # run directly with tsx
pnpm build        # compile to dist/
pnpm start        # run compiled output
pnpm lint         # eslint
pnpm format       # prettier --write
pnpm format:check # prettier --check
```
