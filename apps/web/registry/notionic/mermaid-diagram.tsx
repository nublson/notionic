"use client"

import * as React from "react"

function isDark() {
  return document.documentElement.classList.contains("dark")
}

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
          theme: dark ? "dark" : "neutral",
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
      className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
