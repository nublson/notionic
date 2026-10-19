import { ChevronRightIcon } from "lucide-react"
import { blockColorClass, plainText, RichText, type BlockProps } from "notionic"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const CHEVRON =
  "size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/toggle:rotate-90"

const PANEL =
  "h-(--collapsible-panel-height) overflow-x-visible overflow-y-clip transition-[height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-opacity"

/** A Notion toggle, as shadcn/ui's Collapsible. */
export function NotionToggle({
  block,
  context,
  children,
}: BlockProps<"toggle">) {
  const { rich_text, color } = block.toggle
  const title = <RichText text={rich_text} context={context} />
  // Links can't sit inside the trigger button, so a title with links goes
  // beside a chevron-only trigger.
  const hasLinks = rich_text.some((item) => item.href)

  return (
    <Collapsible className={cn("flex flex-col", blockColorClass(color))}>
      <div className="flex items-center gap-1.5">
        {hasLinks ? (
          <>
            <CollapsibleTrigger
              aria-label={plainText(rich_text)}
              className="group/toggle rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronRightIcon className={CHEVRON} />
            </CollapsibleTrigger>
            <span>{title}</span>
          </>
        ) : (
          <CollapsibleTrigger className="group/toggle flex items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <ChevronRightIcon className={CHEVRON} />
            <span>{title}</span>
          </CollapsibleTrigger>
        )}
      </div>
      {children ? (
        // Stays in the HTML while closed, so search engines and find-in-page see it.
        // Grows open and shrinks closed with a fade; the gap above grows with it.
        // Only the height clips, so colored children still bleed sideways.
        <CollapsibleContent hiddenUntilFound className={PANEL}>
          <div className="flex flex-col gap-4 pt-2 pl-5.5">{children}</div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}
