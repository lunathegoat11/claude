import { ImageResponse } from "next/og";

/** The picture shown when someone shares a Kosha link (WhatsApp, X, LinkedIn, Slack…). */
export const alt = "Kosha: every lab report, read and kept for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#f5f5f7",
        color: "#1d1d1f",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#0066cc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 34, height: 6, borderRadius: 3, background: "#ffffff" }} />
        </div>
        <div style={{ fontSize: 44, fontWeight: 700 }}>Kosha</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          Every lab report, read and kept for you.
        </div>
        <div style={{ fontSize: 34, color: "#6e6e73" }}>
          Photograph a report. See how your numbers change. Made for India.
        </div>
      </div>
    </div>,
    size,
  );
}
