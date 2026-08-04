import { useEffect, useRef } from "react";
import type { FocusSummary } from "../../stores/useFocusStore";

interface FocusSummaryDialogProps {
  summary: FocusSummary | null;
  onClose: () => void;
}

/** 专注模式退出总结弹窗（规范 §13） */
export function FocusSummaryDialog({ summary, onClose }: FocusSummaryDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!summary) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [summary, onClose]);

  if (!summary) return null;

  const minutes = Math.floor(summary.durationSeconds / 60);
  const seconds = summary.durationSeconds % 60;
  const durationText =
    minutes > 0 ? `${minutes} 分钟 ${seconds} 秒` : `${seconds} 秒`;

  const rows: Array<[string, string]> = [
    ["学习时长", durationText],
    ["新增字数", String(summary.addedWords)],
    ["新增问题", String(summary.addedQuestions)],
    ["新增复习卡片", String(summary.addedCards)],
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="本次记录完成"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-ink">本次记录完成</h2>
        <dl className="mt-4 flex flex-col gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <dt className="text-[13px] text-ink-secondary">{label}</dt>
              <dd className="text-[13px] font-medium tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
          >
            好的
          </button>
        </div>
      </div>
    </div>
  );
}
