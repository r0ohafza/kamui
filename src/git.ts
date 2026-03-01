import { execSync } from "node:child_process";

export interface Worktree {
  path: string;
  branch: string;
  commit: string;
  isBare: boolean;
}

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf-8" }).trim();
}

export function getWorktrees(): Worktree[] {
  const raw = git("worktree list --porcelain");
  if (!raw) return [];

  const entries: Worktree[] = [];
  let current: Partial<Worktree> = {};

  for (const line of raw.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) entries.push(current as Worktree);
      current = { path: line.slice("worktree ".length), isBare: false };
    } else if (line.startsWith("HEAD ")) {
      current.commit = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace("refs/heads/", "");
    } else if (line === "bare") {
      current.isBare = true;
    } else if (line === "detached") {
      current.branch = current.branch ?? `(detached ${current.commit?.slice(0, 7)})`;
    }
  }
  if (current.path) entries.push(current as Worktree);

  return entries.filter((w) => !w.isBare);
}

export function getCurrentBranch(): string {
  return git("rev-parse --abbrev-ref HEAD");
}

export function getMainBranch(): string {
  // Try common main branch names
  try {
    git("rev-parse --verify refs/heads/main");
    return "main";
  } catch {
    try {
      git("rev-parse --verify refs/heads/master");
      return "master";
    } catch {
      return getCurrentBranch();
    }
  }
}

export function getOriginMainCommit(mainBranch: string): string {
  return git(`rev-parse origin/${mainBranch}`);
}

export function getWorktreeCommit(worktree: Worktree): string {
  return git(`rev-parse ${worktree.commit}`);
}

export function resetToCommit(commit: string): void {
  git(`reset --hard ${commit}`);
  // Also update the working tree
  git("checkout .");
}

export function resetToOriginMain(mainBranch: string): void {
  const commit = getOriginMainCommit(mainBranch);
  resetToCommit(commit);
}

export function applyWorktreeState(worktree: Worktree): void {
  resetToCommit(worktree.commit);
}

export function fetch(): void {
  try {
    git("fetch origin");
  } catch {
    // Fetch can fail if offline; continue anyway
  }
}
