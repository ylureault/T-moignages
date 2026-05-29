const LABELS: Record<string, string> = {
  google: "Google",
  trustpilot: "Trustpilot",
  linkedin: "LinkedIn",
  site: "Site",
  autre: "Avis",
};

export function SourceBadge({
  source,
  verifie,
}: {
  source: string;
  verifie?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      {verifie && (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-accent">
          <path
            d="M10 1.8l1.9 1.4 2.35-.1.75 2.2 1.9 1.4-.75 2.2.75 2.2-1.9 1.4-.75 2.2-2.35-.1L10 18.2l-1.9-1.4-2.35.1-.75-2.2-1.9-1.4.75-2.2-.75-2.2 1.9-1.4.75-2.2 2.35.1L10 1.8z"
            fill="currentColor"
          />
          <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span>
        {verifie ? "Vérifié · " : ""}
        {LABELS[source] ?? source}
      </span>
    </span>
  );
}
