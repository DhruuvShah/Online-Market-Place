// Ordered from likely-quick to clearly-taking-a-while.
export const OPENING = [
  "Reading your message",
  "Searching the catalog",
  "Checking what is in stock",
  "Comparing a few options",
  "Putting an answer together",
] as const;

// The tail repeats, so however long the reply takes the reader is never left
// staring at a line that stopped changing.
export const WAITING = [
  "Still looking",
  "Digging a little deeper",
  "Almost there",
  "Checking one more thing",
  "Nearly done",
] as const;

export const PHRASE_INTERVAL = 1700;

export function thinkingPhrase(step: number): string {
  const index = Math.max(0, Math.floor(step));

  if (index < OPENING.length) return OPENING[index];
  return WAITING[(index - OPENING.length) % WAITING.length];
}
