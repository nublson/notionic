import type { ReactNode } from "react";
import { externalLinkHost, resolveLink } from "../links";
import { BlockList } from "../renderer";
import { NotionLink, RichText } from "../rich-text";
import type {
  RenderContext,
  ResourceItem,
  ResourcesProps,
  RichText as RichTextArray,
} from "../types";
import { cx } from "../utils";
import { BROKEN_IMAGE, IMAGE_EDGE } from "./icon";

// At least 40px tall, so each row is easy to tap.
const ROW = "flex min-h-10 min-w-0 items-center gap-3";
const FOCUS =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ICON = "size-4 shrink-0";

/** The text without its links, so it can sit inside the row's link. */
function unlinked(text: RichTextArray): RichTextArray {
  return text.map(
    (item) =>
      ({
        ...item,
        href: null,
        ...(item.type === "text" ? { text: { ...item.text, link: null } } : {}),
      }) as RichTextArray[number],
  );
}

/** The site's favicon: the one `linkFavicons` fetched, the preview's, or a muted globe. */
function Favicon({ item, context }: { item: ResourceItem; context: RenderContext }) {
  const host = externalLinkHost(item.href);
  const fetched = host ? context.linkFavicons?.get(host) : undefined;
  const src = fetched ?? item.preview?.favicon;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        decoding="async"
        className={cx(ICON, "rounded-[2px] object-contain", IMAGE_EDGE, BROKEN_IMAGE)}
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(ICON, "text-muted-foreground")}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function Description({ item, context }: { item: ResourceItem; context: RenderContext }) {
  const content = item.description ? (
    <RichText text={item.description} context={context} />
  ) : (
    item.preview?.description
  );
  if (!content) return null;
  return <span className="text-muted-foreground"> - {content}</span>;
}

/** The row's link: your `components.link` when you replaced it, else notionic's anchor. */
function RowLink({
  item,
  className,
  context,
  children,
}: {
  item: ResourceItem;
  className: string;
  context: RenderContext;
  children: ReactNode;
}) {
  const link = resolveLink(item.href, context);
  if (!link) return <span className={className}>{children}</span>;
  const Link = context.components.link;
  if (Link && Link !== NotionLink) {
    return (
      <Link link={link} context={context}>
        <span className={className}>{children}</span>
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cx(className, FOCUS)}
    >
      {children}
      {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

const TITLE =
  "text-foreground underline-offset-4 decoration-muted-foreground/50 group-hover:underline";

function Row({ item, context }: { item: ResourceItem; context: RenderContext }) {
  const title = <RichText text={unlinked(item.title)} context={context} />;
  // A description with its own links can't sit inside the row's link, so
  // only the favicon and title link, still a full-height row, and outside
  // the description's clipping so the focus ring shows.
  if (item.description?.some((part) => part.href)) {
    return (
      <span className="flex min-w-0 items-center">
        <RowLink item={item} className={cx("group", ROW)} context={context}>
          <Favicon item={item} context={context} />
          <span className={cx("min-w-0 truncate", TITLE)}>{title}</span>
        </RowLink>
        <span className="min-w-0 truncate ps-[0.25em]">
          <Description item={item} context={context} />
        </span>
      </span>
    );
  }
  return (
    <RowLink item={item} className={cx("group", ROW)} context={context}>
      <Favicon item={item} context={context} />
      <span className="min-w-0 truncate">
        <span className={TITLE}>{title}</span>
        <Description item={item} context={context} />
      </span>
    </RowLink>
  );
}

/**
 * A run of resource items: one row each, linking to the resource, with the
 * site's favicon, the title and a muted description on one line.
 */
export function Resources({ items, context }: ResourcesProps) {
  return (
    <ul data-resources="" className="flex flex-col">
      {items.map((item) => (
        <li key={item.block.id} className="min-w-0">
          <Row item={item} context={context} />
          {item.block.children?.length ? (
            // Indented past the favicon, under the title.
            <div className="flex flex-col gap-2 ps-7 pb-2">
              <BlockList blocks={item.block.children} context={context} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
