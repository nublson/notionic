import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** The site's Open Graph image: brand, eyebrow, title, description and URL. */
export function ogImage({
  eyebrow,
  title,
  description,
  path,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  path: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#ffffff",
        color: "#0a0a0a",
      }}
    >
      <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
        notionic
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {eyebrow ? (
          <div style={{ display: "flex", fontSize: 28, color: "#737373" }}>{eyebrow}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {description ? (
          <div style={{ display: "flex", fontSize: 32, color: "#525252", lineHeight: 1.4 }}>
            {description}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "#737373",
          borderTop: "2px solid #e5e5e5",
          paddingTop: 28,
        }}
      >
        {`notionic.dev${path}`}
      </div>
    </div>,
    OG_SIZE,
  );
}
