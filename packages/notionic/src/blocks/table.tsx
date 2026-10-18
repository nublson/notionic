import type { ReactNode } from "react";
import { RichText } from "../rich-text";
import type { BlockProps, NotionBlock } from "../types";
import { plainText } from "../utils";

// Columns size to their content, up to 16rem before text wraps, and the table
// scrolls sideways when it's wider than the page, as Notion's tables do,
// rather than squeezing every column to its narrowest.
const CELL = "max-w-64 border border-border px-4 py-2 text-start align-top";
const HEADER_CELL = `${CELL} bg-muted font-semibold`;

function cells(row: NotionBlock) {
  return row.type === "table_row" ? row.table_row.cells : [];
}

/** Renders its rows itself, from `block.children`. */
export function Table({ block, context }: BlockProps<"table">) {
  const { has_column_header, has_row_header } = block.table;
  const rows = (block.children ?? []).filter((row) => row.type === "table_row");
  const [first, ...rest] = rows;
  if (!first) return null;

  const renderRow = (row: NotionBlock, head: boolean): ReactNode => (
    <tr key={row.id}>
      {cells(row).map((cell, i) =>
        head ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ID; a cell's index is its column
          <th key={i} scope="col" className={HEADER_CELL}>
            <RichText text={cell} context={context} />
          </th>
        ) : i === 0 && has_row_header ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ID; a cell's index is its column
          <th key={i} scope="row" className={HEADER_CELL}>
            <RichText text={cell} context={context} />
          </th>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ID; a cell's index is its column
          <td key={i} className={CELL}>
            <RichText text={cell} context={context} />
          </td>
        ),
      )}
    </tr>
  );

  // Named by its columns, so several tables on a page can be told apart.
  const columns = has_column_header
    ? cells(first)
        .map((cell) => plainText(cell).trim())
        .filter(Boolean)
    : [];
  return (
    // biome-ignore lint/a11y/useSemanticElements: kept a <div> so the rendered markup doesn't change; the role names the scroll container
    <div
      role="region"
      aria-label={columns.length > 0 ? `Table: ${columns.join(", ")}` : "Table"}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard-focusable to scroll (WCAG 2.1.1)
      tabIndex={0}
      className="overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table className="w-max min-w-full border-collapse text-sm tabular-nums">
        {has_column_header ? (
          <>
            <thead>{renderRow(first, true)}</thead>
            <tbody>{rest.map((row) => renderRow(row, false))}</tbody>
          </>
        ) : (
          <tbody>{rows.map((row) => renderRow(row, false))}</tbody>
        )}
      </table>
    </div>
  );
}
