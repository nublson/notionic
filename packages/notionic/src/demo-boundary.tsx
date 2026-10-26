"use client";

import { Component, Suspense, type ReactNode } from "react";

type State = { failed: boolean };

class Catch extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Renders nothing in place of a demo that throws, so the page and the demo's
 * frame stay. Suspense lets an error during server rendering retry on the
 * client, where the boundary catches it.
 */
export function DemoBoundary({ children }: { children: ReactNode }) {
  return (
    <Catch>
      <Suspense fallback={null}>{children}</Suspense>
    </Catch>
  );
}
