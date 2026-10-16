import type { ReactNode } from "react";
import { RichText } from "../rich-text";
import type { BlockProps, NotionBlock } from "../types";
import { plainText } from "../utils";

const CELL = "border border-border px-4 py-2 text-left align-top";
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
          <th key={i} scope="col" className={HEADER_CELL}>
            <RichText text={cell} context={context} />
          </th>
        ) : i === 0 && has_row_header ? (
          <th key={i} scope="row" className={HEADER_CELL}>
            <RichText text={cell} context={context} />
          </th>
        ) : (
          <td key={i} className={CELL}>
            <RichText text={cell} context={context} />
          </td>
        ),
      )}
    </tr>
  );

  // Named by its columns, so several tables on a page can be told apart.
  const columns = has_column_header
    ? cells(first).map((cell) => plainText(cell).trim()).filter(Boolean)
    : [];
  return (
    <div
      role="region"
      aria-label={columns.length > 0 ? `Table: ${columns.join(", ")}` : "Table"}
      tabIndex={0}
      className="overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table className="w-full border-collapse text-sm">
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
