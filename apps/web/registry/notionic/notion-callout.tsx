import {
  blockColorClass,
  resolveFileUrl,
  RichText,
  type BlockProps,
} from "notionic"

import { Alert } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

/** A Notion callout, as shadcn/ui's Alert with the callout's icon. */
export function NotionCallout({
  block,
  context,
  children,
}: BlockProps<"callout">) {
  const { icon, rich_text, color } = block.callout
  const iconUrl =
    icon?.type === "emoji" ? null : resolveFileUrl(icon, block.id, context)

  return (
    // A note, not an alert: it is page content, not something that just happened.
    <Alert
      role="note"
      className={cn("flex gap-3 px-4 py-3 text-base", blockColorClass(color))}
    >
      {icon?.type === "emoji" ? (
        <span aria-hidden="true" className="shrink-0">
          {icon.emoji}
        </span>
      ) : iconUrl ? (
        // biome-ignore lint/performance/noImgElement: registry blocks must work outside Next.js, and Notion icon URLs come from arbitrary hosts
        <img src={iconUrl} alt="" className="mt-0.5 size-5 shrink-0" />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {rich_text.length > 0 ? (
          <p>
            <RichText text={rich_text} context={context} />
          </p>
        ) : null}
        {children}
      </div>
    </Alert>
  )
}
