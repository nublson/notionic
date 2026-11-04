import { type BlockComponents, type BlockProps, defaultComponents } from "notionic";
import { createElement } from "react";
import { NotionCallout } from "@/registry/notionic/notion-callout";
import { NotionCode } from "@/registry/notionic/notion-code";
import { NotionEquation, NotionInlineEquation } from "@/registry/notionic/notion-equation";
import { withMermaid } from "@/registry/notionic/notion-mermaid";
import { NotionTable } from "@/registry/notionic/notion-table";
import { NotionTabs } from "@/registry/notionic/notion-tabs";
import { NotionToggle } from "@/registry/notionic/notion-toggle";
import { toRecipe } from "./examples";

/** The shadcn/ui versions from notionic's registry, used across the site. */
export const notionComponents = {
  code: withMermaid(NotionCode),
  callout: NotionCallout,
  table: NotionTable,
  toggle: NotionToggle,
  tab: NotionTabs,
  equation: NotionEquation,
  inline_equation: NotionInlineEquation,
};

/** On Examples pages, recipes keep the site's highlighting, captioned; other code blocks render built-in. */
function ExampleCode(props: BlockProps<"code">) {
  const recipe = toRecipe(props.block);
  const Code = defaultComponents.code;
  if (recipe || !Code) return createElement(NotionCode, { ...props, block: recipe ?? props.block });
  return createElement(Code, props);
}

/** Examples pages show notionic's built-in components, except for recipes. */
export const examplesComponents: BlockComponents = { code: ExampleCode };

/**
 * Files uploaded to Notion go through the file route, which re-signs their
 * URLs (Notion's expire after an hour, longer than pages are cached).
 */
export function notionFileUrl({ blockId }: { blockId: string }) {
  return `/api/notion/file/${blockId}`;
}
