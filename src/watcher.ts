import { watch } from "node:fs/promises";
import { applyWorktreeState, type Worktree } from "./git";
import { bold, dim } from "./format";

function timestamp(): string {
  return dim(new Date().toLocaleTimeString());
}

function createDebouncedSync(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let syncing = false;
  let pendingRerun = false;

  const run = async () => {
    syncing = true;
    try {
      fn();
      console.log(`  ${timestamp()} Synced`);
    } catch (err) {
      console.error(`  ${timestamp()} Sync failed:`, err);
    }
    syncing = false;
    if (pendingRerun) {
      pendingRerun = false;
      run();
    }
  };

  return () => {
    if (syncing) {
      pendingRerun = true;
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
}

function waitForKey(signal: AbortSignal): Promise<"back" | "quit"> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason as Error);
      return;
    }

    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");

    const cleanup = () => {
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      signal.removeEventListener("abort", onAbort);
    };

    const onData = (key: string) => {
      cleanup();
      // Enter / Return
      if (key === "\r" || key === "\n") {
        resolve("back");
        return;
      }
      // q or Ctrl+C
      if (key === "q" || key === "\x03") {
        resolve("quit");
        return;
      }
    };

    const onAbort = () => {
      cleanup();
      reject(signal.reason as Error);
    };

    process.stdin.on("data", onData);
    signal.addEventListener("abort", onAbort);
  });
}

export async function watchAndSync(worktree: Worktree): Promise<"back" | "quit"> {
  const ac = new AbortController();

  console.log(
    `\n  Watching ${bold(worktree.branch)} for changes... ${dim("(Enter = back to menu, q = quit)")}`,
  );

  const debouncedSync = createDebouncedSync(() => {
    applyWorktreeState(worktree);
  }, 300);

  const watcher = watch(worktree.path, { recursive: true, signal: ac.signal });

  // Start consuming fs events in background
  const watchLoop = (async () => {
    try {
      for await (const event of watcher) {
        if (event.filename?.startsWith(".git")) continue;
        debouncedSync();
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).name === "AbortError") return;
      console.error(`  ${timestamp()} Watcher error:`, err);
    }
  })();

  // Wait for user keypress
  let result: "back" | "quit";
  try {
    result = await waitForKey(ac.signal);
  } catch {
    result = "quit";
  }

  // Tear down watcher
  ac.abort();
  await watchLoop;

  console.log();
  return result;
}
