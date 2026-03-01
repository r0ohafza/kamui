# kamui

Preview any git worktree on your main branch — with live sync.

Pick a worktree and main instantly reflects its full state: commits, staged changes, unstaged changes, and untracked files. Edit files in your worktree and watch main update in real time. When you exit, main resets to `origin/main` automatically.

## Prerequisites

- Node.js 18+
- git with at least one worktree set up (`git worktree add <path> <branch>`)

## Install

```bash
npm install -g @roohafza/kamui
```

Then run `kamui` from any repo with worktrees.

## Usage

Run `kamui` from any git repository that has worktrees:

```bash
kamui
```

Use arrow keys to select a worktree, then press Enter.

```
kamui — switch main to any worktree's state

Main branch: main
? Select a worktree to kamui:
❯ feature-auth      ~/projects/myapp-auth      a1b2c3d
  fix-header         ~/projects/myapp-header    e4f5g6h
  Exit
```

Once a worktree is active, the menu updates to let you switch or reset:

```
? Kamui active on feature-auth. Switch or reset?
❯ feature-auth (active)  ~/projects/myapp-auth      a1b2c3d
  fix-header              ~/projects/myapp-header    e4f5g6h
  Reset to origin/main
  Exit
```

After selection, kamui enters live sync mode. Any file change in the worktree is automatically re-applied to main:

```
  Watching feature-auth for changes... (Enter = back to menu, q = quit)
  3:42:15 PM Synced
  3:42:18 PM Synced
```

| Key     | Action              |
|---------|---------------------|
| Enter   | Back to worktree menu |
| q       | Quit and reset main |
| Ctrl+C  | Quit and reset main |

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
