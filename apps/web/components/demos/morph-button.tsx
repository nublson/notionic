"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";

/** A Feedback button that morphs into a small form, with Motion's layout animations. */
export function MorphButton() {
  const [open, setOpen] = useState(false);
  return (
    <MotionConfig
      transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
      reducedMotion="user"
    >
      <div className="grid h-56 w-full place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <motion.form
              key="form"
              layoutId="feedback"
              style={{ borderRadius: 16 }}
              className="flex w-full max-w-80 flex-col overflow-hidden border border-border bg-background shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
            >
              <motion.span layoutId="feedback-label" className="px-4 pt-3 text-sm font-medium">
                Feedback
              </motion.span>
              <textarea
                // biome-ignore lint/a11y/noAutofocus: the form opens because the user asked for it
                autoFocus
                aria-label="Your feedback"
                placeholder="What's on your mind?"
                className="h-24 resize-none bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Cancel
                </button>
                <button type="submit" className={buttonVariants({ size: "sm" })}>
                  Send
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              key="button"
              layoutId="feedback"
              type="button"
              onClick={() => setOpen(true)}
              style={{ borderRadius: 12 }}
              className="border border-border bg-background px-4 py-2 text-sm font-medium shadow-xs"
            >
              <motion.span layoutId="feedback-label" className="block">
                Feedback
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
