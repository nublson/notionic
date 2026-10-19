import { BlockList, plainText, resolveFileUrl, type BlockProps } from "notionic"

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
                // biome-ignore lint/performance/noImgElement: registry blocks must work outside Next.js, and Notion icon URLs come from arbitrary hosts
                <img src={iconUrl} alt="" className="size-4" />
              ) : null}
              {plainText(rich_text)}
            </TabsTrigger>
          )
        })}
      </TabsList>
      {tabs.map((tab) => (
        // Hidden panels stay in the HTML, so search engines see them. A panel
        // fades in when shown (@starting-style), so switching tabs doesn't snap;
        // only with focus inside the tabs, so the first panel doesn't fade in on load.
        <TabsContent
          key={tab.id}
          value={tab.id}
          keepMounted
          className="flex flex-col gap-4 pt-2 text-base transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/tabs:starting:opacity-0 data-hidden:hidden"
        >
          <BlockList blocks={tab.children} context={context} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
