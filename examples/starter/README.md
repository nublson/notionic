# notionic starter

A small site built from a Notion database: a home page that lists your published posts, and one page per post. Pages are rendered on the server with [notionic](https://notionic.dev), styled with Tailwind CSS and shadcn/ui, and refreshed from Notion every hour (or right away, with a webhook).

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and shadcn/ui (Base UI, nova). Code blocks, callouts, tables, toggles, tabs, equations and Mermaid diagrams use the shadcn/ui components from notionic's registry.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnublson%2Fnotionic%2Ftree%2Fmain%2Fexamples%2Fstarter&project-name=notion-site&repository-name=notion-site&env=NOTION_TOKEN,NOTION_DATABASE_ID&envDescription=Your%20Notion%20integration%20secret%20and%20the%20ID%20of%20your%20database&envLink=https%3A%2F%2Fgithub.com%2Fnublson%2Fnotionic%2Ftree%2Fmain%2Fexamples%2Fstarter%23readme)

## 1. Create the Notion integration

1. Open [notion.so/profile/integrations](https://www.notion.so/profile/integrations) and select **New integration**.
2. Give it a name, pick your workspace, and keep the type **Internal**.
3. Under **Capabilities**, **Read content** is all the site needs. Save.
4. Copy the **Internal Integration Secret** (it starts with `ntn_`). This is `NOTION_TOKEN`.

## 2. Create the database

Create a full-page database in Notion (type `/database` on an empty page, or **New page → Database**). Give it these properties. The names must match exactly, including capitals:

| Property      | Type     | Used for                                                      |
| ------------- | -------- | ------------------------------------------------------------- |
| `Name`        | Title    | The post's title (every database already has it)              |
| `Slug`        | Text     | The post's URL: `my-first-post` becomes `/my-first-post`      |
| `Published`   | Checkbox | Only checked posts appear on the site                         |
| `Description` | Text     | Shown under the title in the list and as the meta description |
| `Date`        | Date     | Shown on the post; the list is sorted newest first            |

Add a page, write something in it, fill in `Slug` and check `Published`. Posts without a slug are skipped.

Then share the database with your integration: on the database page, open the **•••** menu → **Connections** → find your integration and confirm. (Or, from the integration's settings, open the **Access** tab and add the page.) Pages the integration can't read don't show up, and links to them render as plain text.

### Find the database ID

Open the database as a full page and copy its link (**Share → Copy link**, or the address bar). The ID is the 32 characters before `?v=`:

```
https://www.notion.so/myworkspace/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=…
                                  └──────── NOTION_DATABASE_ID ────────┘
```

This is the _database_ ID, not the _data source_ ID. The site looks up the database's data source itself (a database made in Notion has exactly one). If your link has no `?v=`, the database is inline on another page: open it with **Open as full page** first.

## 3. Run it locally

Create the app from this template (or copy the `examples/starter` folder):

```bash
npx create-next-app@latest --example https://github.com/nublson/notionic/tree/main/examples/starter my-site
```

Then add your environment variables:

```bash
cd my-site
cp .env.example .env.local
```

Fill in `NOTION_TOKEN` and `NOTION_DATABASE_ID` in `.env.local`, then start the dev server:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Without the two variables the site still runs, with an empty list.

To change the site's name and description, edit `lib/site.ts`.

## 4. Deploy

### Vercel

Select **Deploy with Vercel** above: it copies this template into a new GitHub repository, asks for `NOTION_TOKEN` and `NOTION_DATABASE_ID`, and deploys it.

To deploy your own copy instead, push it to GitHub, import it at [vercel.com/new](https://vercel.com/new), and add the two variables under **Environment Variables**. If the app isn't at the root of your repository, set **Root Directory** to its folder.

### Elsewhere

It's a standard Next.js app: `npm run build` and `npm start` on any Node.js host, with the same two environment variables.

## How it stays up to date

Pages are built ahead of time and rebuilt in the background at most once an hour (`revalidate = 3600` in `app/page.tsx` and `app/[slug]/page.tsx`). Change it to refresh more or less often. Notion's API is rate-limited, so very short intervals can hit its limit on a busy site.

### Refresh right away (optional)

`app/api/notion/revalidate` refreshes every page as soon as something changes in Notion:

1. Deploy the site first: Notion needs a public URL.
2. In your integration's settings, open **Webhooks** → **Create a subscription**, set the URL to `https://<your-site>/api/notion/revalidate`, and pick the page events (created, content updated, properties updated, deleted…).
3. Notion sends a verification token to the route, which prints it in your deployment's logs (`[notion] Webhook verification token: …`). Paste it into the subscription's **Verify** dialog, and set it as `NOTION_WEBHOOK_SECRET` in your environment variables. Redeploy so the variable takes effect.

Events are checked against that secret, so only Notion can trigger a refresh. To refresh by hand (from a script or a deploy hook), set `NOTION_REVALIDATION_SECRET` and send:

```bash
curl -X POST https://<your-site>/api/notion/revalidate -H "Authorization: Bearer $NOTION_REVALIDATION_SECRET"
```

## Images and files

Files uploaded to Notion have links that expire after an hour, sooner than cached pages are rebuilt. So images, videos and files point to `app/api/notion/file/[blockId]`, which asks Notion for a fresh link each time and redirects to it. Files hosted elsewhere (external links) are used directly.

## What's where

| Path                                       | What it does                                                       |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `lib/notion.ts`                            | The Notion client, the database query, and the post lookup by slug |
| `lib/notion-components.ts`                 | Which blocks render with shadcn/ui components                      |
| `lib/site.ts`                              | The site's name and description                                    |
| `app/page.tsx`                             | The list of published posts                                        |
| `app/[slug]/page.tsx`                      | One post, with an outline of its headings on wide screens          |
| `app/api/notion/file/[blockId]`            | Fresh links for files uploaded to Notion                           |
| `app/api/notion/revalidate`                | The webhook that refreshes pages                                   |
| `components/notion-*.tsx`, `components/ui` | shadcn/ui components, installed from notionic's registry           |

### Add or change block components

`components.json` includes notionic's registry, so you can add its components, or re-install them to get updates:

```bash
npx shadcn@latest add @notionic/notion-code
```

They're your files after that: edit them freely. See [notionic.dev/docs](https://notionic.dev/docs) for every block, the `NotionRenderer` props, and the registry.
