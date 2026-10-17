import {
  BlockList,
  plainText,
  resolveFileUrl,
  type BlockProps,
} from "notionic"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Notion tabs, as shadcn/ui's Tabs. Each tab is a paragraph (its title and
 * icon) whose children are the tab's content.
 */
export function NotionTabs({ block, context }: BlockProps<"tab">) {
  const tabs = (block.children ?? []).flatMap((child) =>
    child.type === "paragraph" ? [child] : []
  )
  const [first] = tabs
  if (!first) return null

  return (
    <Tabs defaultValue={first.id}>
      <TabsList className="max-w-full overflow-x-auto">
        {tabs.map((tab) => {
          const { rich_text, icon } = tab.paragraph
          const iconUrl =
            icon?.type === "emoji"
              ? null
              : resolveFileUrl(icon, tab.id, context)
          return (
            // The title is plain text: links can't sit inside the tab button.
            <TabsTrigger key={tab.id} value={tab.id}>
              {icon?.type === "emoji" ? (
                <span aria-hidden="true">{icon.emoji}</span>
              ) : iconUrl ? (
                <img src={iconUrl} alt="" className="size-4" />
              ) : null}
              {plainText(rich_text)}
            </TabsTrigger>
          )
        })}
      </TabsList>
      {tabs.map((tab) => (
        // Hidden panels stay in the HTML, so search engines see them.
        <TabsContent
          key={tab.id}
          value={tab.id}
          keepMounted
          className="flex flex-col gap-4 pt-2 text-base data-hidden:hidden"
        >
          <BlockList blocks={tab.children} context={context} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
