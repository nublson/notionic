"use client"

import * as React from "react"

function isDark() {
  return document.documentElement.classList.contains("dark")
}

/**
 * A theme token (e.g. `--border`) as an opaque rgb() color, drawn over the
 * page background. Mermaid derives shades from its colors and only reads
 * hex or rgb, while shadcn/ui tokens are oklch and sometimes translucent.
 */
function tokenColors(names: string[]) {
  const style = getComputedStyle(document.documentElement)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  // biome-ignore lint/style/noNonNullAssertion: a fresh canvas always has a 2D context
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const read = (name: string) => style.getPropertyValue(name).trim()
  return Object.fromEntries(
    names.map((name) => {
      ctx.fillStyle = read("--background") || "#fff"
      ctx.fillRect(0, 0, 1, 1)
      ctx.fillStyle = read(name)
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return [name, `rgb(${r}, ${g}, ${b})`]
    })
  )
}

/** Mermaid's `base` theme, painted with the page's shadcn/ui tokens. */
function themeVariables(dark: boolean) {
  const c = tokenColors([
    "--background",
    "--foreground",
    "--muted",
    "--muted-foreground",
    "--input",
  ])
  const surface = c["--muted"]
  const text = c["--foreground"]
  const line = c["--muted-foreground"]
  // The code block card's border color, so nodes match it.
  const border = c["--input"]
  return {
    darkMode: dark,
    fontFamily: getComputedStyle(document.body).fontFamily,
    fontSize: "14px",
    background: c["--background"],
    textColor: text,
    lineColor: line,
    // Nodes
    primaryColor: surface,
    primaryTextColor: text,
    primaryBorderColor: border,
    secondaryColor: surface,
    secondaryTextColor: text,
    secondaryBorderColor: border,
    tertiaryColor: c["--background"],
    tertiaryTextColor: text,
    tertiaryBorderColor: border,
    mainBkg: surface,
    nodeBorder: border,
    // Subgraphs, edge labels, notes and sequence diagrams
    clusterBkg: c["--background"],
    clusterBorder: border,
    edgeLabelBackground: c["--background"],
    titleColor: text,
    noteBkgColor: c["--background"],
    noteTextColor: text,
    noteBorderColor: border,
    actorBkg: surface,
    actorBorder: border,
    actorTextColor: text,
    signalColor: line,
    signalTextColor: text,
  }
}

// Rounded nodes and thin lines, like the rest of the design system.
const THEME_CSS = `
  .node rect, rect.basic.label-container, .cluster rect, rect.actor, rect.note { rx: 8px; ry: 8px; }
  .node rect, .node polygon, .node circle, .node path { stroke-width: 1px; }
  .flowchart-link, .edgePath .path, .messageLine0, .messageLine1 { stroke-width: 1.25px; }
  .nodeLabel, .edgeLabel, .label { font-weight: 500; }
`

/**
 * A Mermaid diagram, drawn in the browser. Mermaid loads only when a diagram
 * is on the page. Until it draws, and if the source doesn't parse,
 * `fallback` (the code) shows instead.
 */
export function MermaidDiagram({
  code,
  label,
  fallback,
}: {
  code: string
  label: string
  fallback: React.ReactNode
}) {
  const id = `mermaid-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const [svg, setSvg] = React.useState<string | null>(null)
  const [dark, setDark] = React.useState<boolean | null>(null)

  // Follow the page's theme (the `dark` class on <html>).
  React.useEffect(() => {
    setDark(isDark())
    const observer = new MutationObserver(() => setDark(isDark()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (dark === null) return
    let cancelled = false
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          // Sanitizes labels and turns off click handlers in diagrams.
          securityLevel: "strict",
          // Throw on bad syntax instead of drawing an error diagram.
          suppressErrorRendering: true,
          // Mermaid 12's default "neo" look adds drop shadows.
          look: "classic",
          theme: "base",
          themeVariables: themeVariables(dark),
          themeCSS: THEME_CSS,
          flowchart: { curve: "basis", padding: 16 },
        })
        const { svg } = await mermaid.render(id, code)
        if (!cancelled) setSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setSvg(null)
      })
    return () => {
      cancelled = true
    }
  }, [code, dark, id])

  if (!svg) return fallback
  return (
    <div
      role="img"
      aria-label={label}
      // The same card as shadcn/ui's Code Block, so diagrams sit with code. It
      // fades in over the code fallback it replaces; a theme change reuses the
      // element, so it doesn't fade again.
      className="flex justify-center overflow-x-auto rounded-lg border border-input p-6 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:opacity-0 dark:bg-input/30 [&_svg]:h-auto [&_svg]:max-w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from mermaid.render with securityLevel "strict", which sanitizes it
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
