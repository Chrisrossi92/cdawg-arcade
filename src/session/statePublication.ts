export function shouldPublishPlayerState(lastPublishedAt: number, now: number, intervalMs = 250): boolean {
  return now - lastPublishedAt >= intervalMs;
}
