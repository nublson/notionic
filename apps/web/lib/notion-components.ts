import { NotionCallout } from "@/registry/notionic/notion-callout";
import { NotionCode } from "@/registry/notionic/notion-code";
import {
  NotionEquation,
  NotionInlineEquation,
} from "@/registry/notionic/notion-equation";
import { withMermaid } from "@/registry/notionic/notion-mermaid";
import { NotionTable } from "@/registry/notionic/notion-table";
import { NotionTabs } from "@/registry/notionic/notion-tabs";
import { NotionToggle } from "@/registry/notionic/notion-toggle";

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

/**
 * Files uploaded to Notion go through the file route, which re-signs their
 * URLs (Notion's expire after an hour, longer than pages are cached).
 */
export function notionFileUrl({ blockId }: { blockId: string }) {
  return `/api/notion/file/${blockId}`;
}
