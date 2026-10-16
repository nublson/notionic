// Full class strings, so Tailwind's scanner finds them. The variables are
// defined in styles.css, with light and dark values.
const TEXT: Record<string, string> = {
  gray: "text-(--notionic-gray)",
  brown: "text-(--notionic-brown)",
  orange: "text-(--notionic-orange)",
  yellow: "text-(--notionic-yellow)",
  green: "text-(--notionic-green)",
  blue: "text-(--notionic-blue)",
  purple: "text-(--notionic-purple)",
  pink: "text-(--notionic-pink)",
  red: "text-(--notionic-red)",
};

const BACKGROUND: Record<string, string> = {
  gray_background: "bg-(--notionic-gray-bg)",
  brown_background: "bg-(--notionic-brown-bg)",
  orange_background: "bg-(--notionic-orange-bg)",
  yellow_background: "bg-(--notionic-yellow-bg)",
  green_background: "bg-(--notionic-green-bg)",
  blue_background: "bg-(--notionic-blue-bg)",
  purple_background: "bg-(--notionic-purple-bg)",
  pink_background: "bg-(--notionic-pink-bg)",
  red_background: "bg-(--notionic-red-bg)",
};

/** The class for a Notion color (`red`, `red_background`…), or undefined for `default`. */
export function colorClass(color: string | undefined): string | undefined {
  if (!color) return undefined;
  return TEXT[color] ?? BACKGROUND[color];
}

export function isBackgroundColor(color: string | undefined): boolean {
  return Boolean(color && color in BACKGROUND);
}

/** A block's color: text color, or a padded background. */
export function blockColorClass(color: string | undefined): string | undefined {
  const cls = colorClass(color);
  if (!cls) return undefined;
  return isBackgroundColor(color) ? `${cls} rounded-md px-3 py-1` : cls;
}
