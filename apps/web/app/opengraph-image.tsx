import { OG_SIZE, ogImage } from "@/lib/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "notionic: Notion pages, rendered as React Server Components";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Notion pages, rendered as React Server Components",
    description: SITE_DESCRIPTION,
    path: "",
  });
}
