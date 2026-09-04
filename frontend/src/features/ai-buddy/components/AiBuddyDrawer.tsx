import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useAiBuddy } from "../hooks/useAiBuddy";
import { BuddyMessage } from "./BuddyMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { spring } from "@/components/motion/springs";

const suggestions = [
  "Find me something under ₹2000",
  "What is in stock right now?",
  "Add the cheapest item to my cart",
];

const connectionCopy = {
  idle: "",
  connecting: "Waking the assistant…",
  ready: "",
  error: "Could not reach the assistant. It may still be starting up.",
};

export function AiBuddyDrawer() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const reduced = useReducedMotion();
  const { messages, connection, isThinking, send } = useAiBuddy(open);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = (text: string) => {
    send(text);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open shopping assistant"
        className="bg-ink text-canvas fixed right-5 bottom-5 z-40 inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14px] font-medium shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.97]"
      >
        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden sm:inline">Ask</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              aria-label="Close assistant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            />

            <motion.aside
              role="dialog"
              aria-label="Shopping assistant"
              initial={reduced ? { opacity: 0 } : { x: "100%" }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "100%" }}
              transition={spring.sheet}
              className="bg-canvas border-line fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l"
            >
              <header className="border-line flex items-center justify-between gap-4 border-b px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="text-accent h-4 w-4" strokeWidth={1.75} />
                  <h2 className="text-title font-medium">Shopping assistant</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="text-ink-muted hover:bg-raised hover:text-ink inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
                {messages.length === 0 ? (
                  <div>
                    <p className="text-ink-muted text-[14px] leading-relaxed">
                      Describe what you are looking for in plain language. The
                      assistant searches the catalog and can add things to your
                      cart.
                    </p>
                    <div className="mt-5 flex flex-col items-start gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => submit(suggestion)}
                          className="border-line-strong hover:border-ink rounded-full border px-3.5 py-1.5 text-left text-[13px] transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {messages.map((message, index) => (
                      <li
                        key={message.id}
                        className={
                          message.from === "you"
                            ? "flex justify-end"
                            : "flex justify-start"
                        }
                      >
                        {message.from === "you" ? (
                          <motion.span
                            initial={
                              reduced
                                ? { opacity: 0 }
                                : { opacity: 0, y: 8, scale: 0.985 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                            className="bg-ink text-canvas max-w-[85%] rounded-md px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap"
                          >
                            {message.text}
                          </motion.span>
                        ) : (
                          <BuddyMessage
                            text={message.text}
                            animate={index === messages.length - 1}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <AnimatePresence>
                  {isThinking && <ThinkingIndicator />}
                </AnimatePresence>

                {connectionCopy[connection] && (
                  <p className="text-ink-subtle mt-4 text-[13px]">
                    {connectionCopy[connection]}
                  </p>
                )}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(draft);
                }}
                className="border-line flex items-center gap-2 border-t px-5 py-4"
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Find me red sneakers under ₹2000"
                  aria-label="Message the assistant"
                  className="border-line-strong bg-raised placeholder:text-ink-subtle focus-visible:border-ink h-11 w-full rounded-full border px-4 text-[15px] transition-colors focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isThinking}
                  aria-label="Send"
                  className="bg-accent text-accent-contrast grid h-11 w-11 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
