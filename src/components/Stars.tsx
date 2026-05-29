export function Stars({ note, size = 18 }: { note: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i <= note ? "var(--color-accent)" : "none"}
          stroke={i <= note ? "var(--color-accent)" : "var(--color-line)"}
          strokeWidth={1.5}
        >
          <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}
