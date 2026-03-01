export function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}

export function dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}
