/**
 * Wraps text segments that match any word in `query` with a subtle highlight.
 * Pure rendering utility — no state, no effects.
 */
export function HighlightText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim() || !text) return <>{text}</>;

  // Build a regex from each whitespace-separated term
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape regex chars

  if (terms.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const parts   = text.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark
            key={i}
            style={{
              backgroundColor: "#fef08a",
              color: "inherit",
              borderRadius: 2,
              padding: "0 1px",
              fontWeight: 600,
            }}
          >
            {part}
          </mark>
        ) : (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
