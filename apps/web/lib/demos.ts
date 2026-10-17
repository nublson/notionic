import type { Demos } from "notionic";
import { MorphButton } from "@/components/demos/morph-button";

/**
 * Demos by name. In Notion, an embed of https://notionic.dev/demos/<name>
 * renders the demo in place; /demos/<name> shows it alone, for Notion's
 * preview of the embed.
 */
export const demos: Demos = {
  "morph-button": MorphButton,
};
