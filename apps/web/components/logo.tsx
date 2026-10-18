import { cn } from "@/lib/utils";

// The n: a 3x3 grid of rounded blocks without the two lower middle ones, as in
// app/icon.svg.
const CELLS: [column: number, row: number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [2, 1],
  [0, 2],
  [2, 2],
];

/** notionic's mark, in the current text color. Decorative: label its link. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="18 18 60 60"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      {CELLS.map(([column, row]) => (
        <rect
          key={`${column}-${row}`}
          x={20.5 + 19 * column}
          y={20.5 + 19 * row}
          width="17"
          height="17"
          rx="4"
        />
      ))}
    </svg>
  );
}
