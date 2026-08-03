import { useEffect, useRef } from "react";
import { cx } from "../../lib/utils/cx";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** 确认按钮文案，默认"确认" */
  confirmLabel?: string;
  /** 危险操作（删除等）使用红色确认按钮 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 轻量模态确认框（删除笔记等二次确认），Esc / 点击遮罩关闭 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 打开时聚焦确认按钮，Esc 关闭
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-panel px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
          >
            取消
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className={cx(
              "rounded-lg px-3 py-1.5 text-[13px] font-medium text-white transition-colors",
              danger ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:bg-accent/90",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
