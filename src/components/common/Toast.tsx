import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "../../stores/useToastStore";
import type { ToastKind } from "../../stores/useToastStore";
import { cx } from "../../lib/utils/cx";

const KIND_STYLES: Record<ToastKind, { icon: typeof Info; borderClass: string; iconClass: string }> = {
  info: { icon: Info, borderClass: "border-border", iconClass: "text-ink-secondary" },
  success: { icon: CheckCircle2, borderClass: "border-success/40", iconClass: "text-success" },
  error: { icon: AlertTriangle, borderClass: "border-red-400/50", iconClass: "text-red-500" },
};

/** 右上角通知容器（保存失败 / 文件冲突 / 操作结果），3 秒自动消失 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="通知"
    >
      {toasts.map((toast) => {
        const style = KIND_STYLES[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={cx(
              "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-panel p-3 shadow-lg",
              "animate-[toast-in_0.2s_ease-out]",
              style.borderClass,
            )}
          >
            <Icon className={cx("mt-0.5 size-4 shrink-0", style.iconClass)} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="关闭提示"
              className="shrink-0 rounded p-0.5 text-ink-tertiary transition-colors hover:bg-hover hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
