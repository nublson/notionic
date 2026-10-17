import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { WebMcp } from "@/components/webmcp";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "notionic: A Notion renderer for React Server Components",
    template: "%s · notionic",
  },
  description: SITE_DESCRIPTION,
  applicationName: "notionic",
  ...(SITE_AUTHOR
    ? { authors: [{ name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }], creator: SITE_AUTHOR.name }
    : {}),
  alternates: { canonical: "/" },
  openGraph: { siteName: "notionic", type: "website", url: "/" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
        <WebMcp />
      </body>
    </html>
  );
}
