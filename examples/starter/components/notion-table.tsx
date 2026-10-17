import {
  plainText,
  RichText,
  type BlockProps,
  type NotionBlock,
} from "notionic"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function cells(row: NotionBlock) {
  return row.type === "table_row" ? row.table_row.cells : []
}

/** A Notion table, as shadcn/ui's Table. Renders its rows from `block.children`. */
export function NotionTable({ block, context }: BlockProps<"table">) {
  const { has_column_header, has_row_header } = block.table
  const rows = (block.children ?? []).filter((row) => row.type === "table_row")
  const [first, ...rest] = rows
  if (!first) return null

  const renderRow = (row: NotionBlock, head: boolean) => (
    <TableRow key={row.id}>
      {cells(row).map((cell, index) =>
        head || (index === 0 && has_row_header) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ID; a cell's index is its column
          <TableHead key={index} scope={head ? "col" : "row"}>
            <RichText text={cell} context={context} />
          </TableHead>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ID; a cell's index is its column
          <TableCell key={index} className="whitespace-normal">
            <RichText text={cell} context={context} />
          </TableCell>
        )
      )}
    </TableRow>
  )

  // Named by its columns, so several tables on a page can be told apart.
  const columns = has_column_header
    ? cells(first)
        .map((cell) => plainText(cell).trim())
        .filter(Boolean)
    : []

  return (
    <Table
      aria-label={columns.length > 0 ? `Table: ${columns.join(", ")}` : "Table"}
    >
      {has_column_header ? (
        <>
          <TableHeader>{renderRow(first, true)}</TableHeader>
          <TableBody>{rest.map((row) => renderRow(row, false))}</TableBody>
        </>
      ) : (
        <TableBody>{rows.map((row) => renderRow(row, false))}</TableBody>
      )}
    </Table>
  )
}
