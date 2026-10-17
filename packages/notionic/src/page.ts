import type { PageObjectResponse } from "@notionhq/client";
import type { LinkedPage, NotionPage } from "./types";
import { plainText } from "./utils";

/** A page's title: the text of its `title` property. */
export function pageTitle(page: PageObjectResponse): string {
  for (const property of Object.values(page.properties)) {
    if (property.type === "title") return plainText(property.title);
  }
  return "";
}

export function toNotionPage(page: PageObjectResponse): NotionPage {
  return {
    id: page.id,
    url: page.url,
    title: pageTitle(page),
    icon: page.icon,
    cover: page.cover,
    lastEditedTime: page.last_edited_time,
    properties: page.properties,
  };
}

export function toLinkedPage(page: PageObjectResponse): LinkedPage {
  return { id: page.id, title: pageTitle(page), icon: page.icon };
}
