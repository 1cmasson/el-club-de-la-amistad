/** The tiny US / Spanish flag chips the language switch uses. */
export function Flag({ country }: { country: "us" | "es" }) {
  const base: React.CSSProperties = {
    position: "relative",
    display: "block",
    width: 22,
    height: 15,
    flex: "none",
    borderRadius: 1,
    overflow: "hidden",
    boxShadow: "0 0 0 1px rgba(0,0,0,.3)",
  };

  if (country === "us") {
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background:
            "repeating-linear-gradient(180deg, #b22234 0 2px, #f7f3ea 2px 4px)",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "44%",
            height: "54%",
            background: "#3c3b6e",
            display: "block",
          }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...base,
        background:
          "linear-gradient(180deg, #aa151b 0 25%, #f1bf00 25% 75%, #aa151b 75% 100%)",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 5,
          top: 4.5,
          width: 5,
          height: 6,
          borderRadius: 1,
          background: "#ad1519",
          display: "block",
        }}
      />
      <span style={{ position: "absolute", left: 6, top: 5.5, width: 1, height: 4, background: "#f1bf00", display: "block" }} />
      <span style={{ position: "absolute", left: 8, top: 5.5, width: 1, height: 4, background: "#f1bf00", display: "block" }} />
    </span>
  );
}
