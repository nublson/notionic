import { plainText, RichText, type BlockProps, languageName } from "notionic"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlighter"

// Not code to highlight: Notion draws mermaid as a diagram.
const PLAIN = new Set(["plain text", "mermaid"])

/**
 * A Notion code block, highlighted on the server with shadcn/ui's Code
 * Block. Add languages in lib/highlighter.tsx; unlisted ones render plain.
 */
export async function NotionCode({ block, context }: BlockProps<"code">) {
  const { language, rich_text, caption } = block.code
  // A trailing newline would render as an extra empty line.
  const code = plainText(rich_text).replace(/\n$/, "")
  const lines = PLAIN.has(language)
    ? null
    : await highlightCode(code, language).catch(() => null)

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{languageName(language)}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent aria-label={`Code, ${languageName(language)}`}>
        {lines
          ? lines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity beyond their position
              <CodeBlockLine key={index}>{line}</CodeBlockLine>
            ))
          : code}
      </CodeBlockContent>
      {caption.length > 0 ? (
        <CodeBlockFooter>
          <RichText text={caption} context={context} />
        </CodeBlockFooter>
      ) : null}
    </CodeBlock>
  )
}
