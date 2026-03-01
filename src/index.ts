import { select } from "@inquirer/prompts";
import {
  getWorktrees,
  getMainBranch,
  resetToOriginMain,
  applyWorktreeState,
  fetch,
  type Worktree,
} from "./git";

const RESET_CHOICE = "__reset__";
const EXIT_CHOICE = "__exit__";

let mainBranch: string;
let activeWorktree: Worktree | null = null;

function cleanup(): void {
  if (activeWorktree) {
    console.log(`\nResetting ${mainBranch} back to origin/${mainBranch}...`);
    try {
      resetToOriginMain(mainBranch);
      console.log("Reset complete.");
    } catch (err) {
      console.error("Failed to reset:", err);
    }
    activeWorktree = null;
  }
}

async function promptWorktreeSelection(): Promise<string> {
  const worktrees = getWorktrees();

  if (worktrees.length === 0) {
    console.log("No worktrees found. Create one with: git worktree add <path> <branch>");
    return EXIT_CHOICE;
  }

  const choices = worktrees.map((wt) => {
    const active = activeWorktree?.path === wt.path ? " (active)" : "";
    return {
      name: `${wt.branch}${active}  ${dim(wt.path)}  ${dim(wt.commit.slice(0, 7))}`,
      value: wt.path,
    };
  });

  if (activeWorktree) {
    choices.push({
      name: `Reset to origin/${mainBranch}`,
      value: RESET_CHOICE,
    });
  }

  choices.push({
    name: "Exit",
    value: EXIT_CHOICE,
  });

  return select({
    message: activeWorktree
      ? `Spotlight active on ${bold(activeWorktree.branch)}. Switch or reset?`
      : "Select a worktree to spotlight:",
    choices,
  });
}

async function run(): Promise<void> {
  console.log(bold("spotlight") + " — switch main to any worktree's state\n");

  mainBranch = getMainBranch();
  console.log(`Main branch: ${mainBranch}`);

  try {
    fetch();
  } catch {
    // continue without fetch
  }

  // Main loop
  while (true) {
    const answer = await promptWorktreeSelection();

    if (answer === EXIT_CHOICE) {
      cleanup();
      break;
    }

    if (answer === RESET_CHOICE) {
      console.log(`\nResetting to origin/${mainBranch}...`);
      resetToOriginMain(mainBranch);
      activeWorktree = null;
      console.log("Reset complete.\n");
      continue;
    }

    // Find the selected worktree
    const worktrees = getWorktrees();
    const selected = worktrees.find((wt) => wt.path === answer);
    if (!selected) {
      console.log("Worktree not found, try again.\n");
      continue;
    }

    console.log(`\nApplying ${bold(selected.branch)} to ${mainBranch}...`);
    applyWorktreeState(selected);
    activeWorktree = selected;
    console.log(
      `Done. ${mainBranch} now reflects ${bold(selected.branch)} (${selected.commit.slice(0, 7)}) including uncommitted changes\n`,
    );
  }
}

// ANSI helpers
function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}
function dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}

// Auto-reset on exit signals
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

process.on("exit", () => {
  // Last-resort cleanup (synchronous only)
  if (activeWorktree) {
    try {
      resetToOriginMain(mainBranch);
    } catch {
      // best effort
    }
  }
});

run().catch((err) => {
  // ExitPromptError is thrown when the user Ctrl+C's out of a prompt
  if (err?.name === "ExitPromptError") {
    cleanup();
    process.exit(0);
  }
  console.error(err);
  cleanup();
  process.exit(1);
});
