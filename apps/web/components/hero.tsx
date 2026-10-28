import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** The landing page hero: the name, one sentence, two actions. */
export function Hero() {
  return (
    <section className="flex flex-col items-center py-24 text-center sm:py-32">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">notionic</h1>
      <p className="mt-3 max-w-sm text-lg text-pretty text-muted-foreground">
        Write in Notion. Ship it as React Server Components, styled with your shadcn/ui theme.
      </p>
      <div className="mt-8 flex gap-2">
        <Link href="/docs" className={buttonVariants({ size: "lg", className: "min-w-32" })}>
          Get started
        </Link>
        <a
          href="https://github.com/nublson/notionic"
          className={buttonVariants({ variant: "outline", size: "lg", className: "min-w-32" })}
        >
          GitHub
        </a>
      </div>
    </section>
  );
}
