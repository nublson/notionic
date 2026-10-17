import { NotionCallout } from "@/components/notion-callout"
import { NotionCode } from "@/components/notion-code"
import {
  NotionEquation,
  NotionInlineEquation,
} from "@/components/notion-equation"
import { withMermaid } from "@/components/notion-mermaid"
import { NotionTable } from "@/components/notion-table"
import { NotionTabs } from "@/components/notion-tabs"
import { NotionToggle } from "@/components/notion-toggle"

/**
 * Blocks rendered with shadcn/ui, from notionic's registry. Other blocks use
 * notionic's defaults. Add more with `npx shadcn@latest add @notionic/<name>`.
 */
export const notionComponents = {
  code: withMermaid(NotionCode),
  callout: NotionCallout,
  table: NotionTable,
  toggle: NotionToggle,
  tab: NotionTabs,
  equation: NotionEquation,
  inline_equation: NotionInlineEquation,
}
