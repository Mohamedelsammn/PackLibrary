import { cn } from "@/lib/utils";

interface PackBadgeProps {
  format: string;
  className?: string;
}

export function PackBadge({ format, className }: PackBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-muted text-muted-foreground",
        className
      )}
    >
      {format}
    </span>
  );
}
