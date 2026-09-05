import { describe, expect, it } from "vitest";
import {
  OPENING,
  PHRASE_INTERVAL,
  WAITING,
  thinkingPhrase,
} from "./thinkingPhrases";

describe("thinkingPhrase", () => {
  it("opens by acknowledging the message", () => {
    expect(thinkingPhrase(0)).toBe("Reading your message");
  });

  it("walks the opening stages in order", () => {
    OPENING.forEach((phrase, index) => {
      expect(thinkingPhrase(index)).toBe(phrase);
    });
  });

  it("moves into the waiting lines once the opening runs out", () => {
    expect(thinkingPhrase(OPENING.length)).toBe(WAITING[0]);
    expect(thinkingPhrase(OPENING.length + 1)).toBe(WAITING[1]);
  });

  it("cycles the waiting lines forever rather than running off the end", () => {
    const wrapped = OPENING.length + WAITING.length;

    expect(thinkingPhrase(wrapped)).toBe(WAITING[0]);
    expect(thinkingPhrase(wrapped + WAITING.length * 40)).toBe(WAITING[0]);
  });

  it("always returns something, however long the reply takes", () => {
    for (let step = 0; step < 500; step += 1) {
      expect(thinkingPhrase(step)).toBeTruthy();
    }
  });

  it("never repeats itself two steps running", () => {
    for (let step = 0; step < 200; step += 1) {
      expect(thinkingPhrase(step)).not.toBe(thinkingPhrase(step + 1));
    }
  });

  it("shrugs off a nonsense step rather than returning undefined", () => {
    expect(thinkingPhrase(-4)).toBe(OPENING[0]);
    expect(thinkingPhrase(2.7)).toBe(OPENING[2]);
  });

  it("changes often enough to read as progress, slowly enough to read", () => {
    expect(PHRASE_INTERVAL).toBeGreaterThanOrEqual(1200);
    expect(PHRASE_INTERVAL).toBeLessThanOrEqual(2500);
  });

  it("has no duplicate lines within a rotation", () => {
    expect(new Set(OPENING).size).toBe(OPENING.length);
    expect(new Set(WAITING).size).toBe(WAITING.length);
  });
});
