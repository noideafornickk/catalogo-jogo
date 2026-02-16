type StarRatingProps = {
  value: number;
  size?: "sm" | "md";
  className?: string;
};

const STAR_PATH =
  "M10 1.5 12.94 7.26 19.3 8.18 14.65 12.67 15.75 19 10 16.08 4.25 19 5.35 12.67.7 8.18 7.06 7.26 10 1.5Z";

function getSizeClass(size: "sm" | "md"): string {
  return size === "md" ? "h-5 w-5" : "h-4 w-4";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function StarRating({ value, size = "sm", className }: StarRatingProps) {
  const normalized = clamp(value, 0, 5);
  const sizeClass = getSizeClass(size);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fillPercent = clamp((normalized - index) * 100, 0, 100);

        return (
          <span key={index} className={`relative inline-block ${sizeClass}`}>
            <svg viewBox="0 0 20 20" className={`${sizeClass} text-slate-300 dark:text-slate-600`}>
              <path d={STAR_PATH} fill="currentColor" />
            </svg>

            <span
              className="absolute left-0 top-0 overflow-hidden transition-[width] duration-150 ease-out"
              style={{ width: `${fillPercent}%` }}
            >
              <svg viewBox="0 0 20 20" className={`${sizeClass} text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]`}>
                <path d={STAR_PATH} fill="currentColor" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
