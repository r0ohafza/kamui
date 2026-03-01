import { execSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface Worktree {
  path: string;
  branch: string;
  commit: string;
  isBare: boolean;
}

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function gitInDir(dir: string, args: string): string {
  return execSync(`git ${args}`, { cwd: dir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function gitInDirRaw(dir: string, args: string): string {
  return execSync(`git ${args}`, { cwd: dir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
}

function gitWithInput(args: string, input: string): void {
  execSync(`git ${args}`, { input, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
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
  try {
    return git(`rev-parse origin/${mainBranch}`);
  } catch {
    // Fallback to local branch if remote ref doesn't exist
    return git(`rev-parse ${mainBranch}`);
  }
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
  git("clean -fd");
}

function captureWorktreeStagedDiff(worktreePath: string): string {
  return gitInDirRaw(worktreePath, "diff --cached --binary");
}

function captureWorktreeUnstagedDiff(worktreePath: string): string {
  return gitInDirRaw(worktreePath, "diff --binary");
}

function getWorktreeUntrackedFiles(worktreePath: string): string[] {
  const raw = gitInDir(worktreePath, "ls-files --others --exclude-standard");
  if (!raw) return [];
  return raw.split("\n");
}

function applyDiff(diff: string, cached: boolean): void {
  if (!diff) return;
  const flag = cached ? " --cached" : "";
  gitWithInput(`apply --binary${flag}`, diff);
}

function copyUntrackedFilesToMain(worktreePath: string, files: string[]): void {
  const mainDir = process.cwd();
  for (const file of files) {
    const src = join(worktreePath, file);
    const dest = join(mainDir, file);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
}

export function applyWorktreeState(worktree: Worktree): void {
  // Read the worktree's current HEAD (may have advanced since selection)
  const currentHead = gitInDir(worktree.path, "rev-parse HEAD");

  // Capture uncommitted state from the worktree before resetting
  const stagedDiff = captureWorktreeStagedDiff(worktree.path);
  const unstagedDiff = captureWorktreeUnstagedDiff(worktree.path);
  const untrackedFiles = getWorktreeUntrackedFiles(worktree.path);

  // Reset main to the worktree's current HEAD
  resetToCommit(currentHead);

  // Re-apply staged changes to the index
  applyDiff(stagedDiff, true);

  // Re-apply unstaged changes to the working tree
  applyDiff(unstagedDiff, false);

  // Copy untracked files from worktree to main
  if (untrackedFiles.length > 0) {
    copyUntrackedFilesToMain(worktree.path, untrackedFiles);
  }
}

export function fetch(): void {
  try {
    git("fetch origin");
  } catch {
    // Fetch can fail if offline; continue anyway
  }
}
