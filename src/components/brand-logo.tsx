import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { mark: "h-8 w-8", text: "text-sm" },
  md: { mark: "h-9 w-9", text: "text-lg" },
  lg: { mark: "h-12 w-12", text: "text-2xl" },
};

export function BrandLogo({ className, compact = false, size = "md" }: BrandLogoProps) {
  const styles = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="Aiwork">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
          styles.mark,
        )}
      >
        <svg viewBox="0 0 32 32" fill="none" className="h-[68%] w-[68%]" aria-hidden="true">
          <path
            d="M7 24 14.1 7.8c.7-1.6 3-1.6 3.7 0L25 24M10.1 17.2h11.8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="24" r="2" fill="currentColor" />
          <circle cx="16" cy="6.5" r="2" fill="currentColor" />
          <circle cx="25" cy="24" r="2" fill="currentColor" />
        </svg>
      </span>
      {!compact && <span className={cn("font-semibold tracking-tight", styles.text)}>Aiwork</span>}
    </div>
  );
}
