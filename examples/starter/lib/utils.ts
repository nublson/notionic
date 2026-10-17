export { cn } from "cn"

/** "2026-10-17" as "October 17, 2026", the same on the server and in any time zone. */
export function formatDate(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }
  )
}
