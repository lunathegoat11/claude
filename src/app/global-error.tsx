"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#f8f9fb",
          color: "#1f2430",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#667085", fontSize: 14 }}>
            Please reload the page. Your data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 10,
              border: 0,
              background: "#1d6f78",
              color: "white",
              fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
