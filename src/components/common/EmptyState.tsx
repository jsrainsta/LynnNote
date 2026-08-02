import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/** 空状态 / 占位提示 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <Icon className="size-8 text-ink-tertiary" strokeWidth={1.5} />
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-ink-tertiary">{description}</p>
      )}
    </div>
  );
}
