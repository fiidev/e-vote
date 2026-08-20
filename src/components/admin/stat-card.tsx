import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}

/** Kartu statistik sederhana untuk dashboard admin. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border-line bg-card shadow-otp", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-peach text-primary">
            <Icon className="size-5" aria-hidden />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
