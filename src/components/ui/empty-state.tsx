import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ""
}: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 animate-pulse">
        <Icon className="w-12 h-12 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
