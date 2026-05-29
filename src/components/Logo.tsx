export function Logo() {
  return (
    <a href="/" className="inline-flex items-center gap-2.5 group">
      <span className="relative flex h-9 w-9 items-center justify-center">
        <span className="absolute inset-0 rounded-[10px] bg-accent transition-transform duration-300 group-hover:rotate-6" />
        <span className="relative font-display text-lg font-bold text-white">
          I
        </span>
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-ink">
        Insuffle
      </span>
    </a>
  );
}
