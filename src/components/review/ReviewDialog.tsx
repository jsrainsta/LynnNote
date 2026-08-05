import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Course } from "../../types";
import { useIndexStore } from "../../stores/useIndexStore";
import type { IndexedCard } from "../../stores/useIndexStore";
import { cardKey, useReviewStore } from "../../stores/useReviewStore";
import type { ReviewRating } from "../../stores/useReviewStore";
import { IconButton } from "../common/IconButton";

interface ReviewDialogProps {
  open: boolean;
  /** 复习范围 = 当前课程（规范 §15："从当前课程笔记中提取卡片"） */
  course: Course | null | undefined;
  onClose: () => void;
}

const RATING_BUTTONS: Array<{ rating: ReviewRating; label: string; className: string }> = [
  { rating: "unknown", label: "不会", className: "bg-red-500/90 hover:bg-red-500" },
  { rating: "fuzzy", label: "模糊", className: "bg-amber-500/90 hover:bg-amber-500" },
  { rating: "mastered", label: "掌握", className: "bg-success hover:bg-success/90" },
];

/** Fisher–Yates 洗牌（复习随机顺序，规范 §15） */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 复习页面：随机顺序浏览卡片，默认隐藏答案，点击显示后标记不会/模糊/掌握 */
export function ReviewDialog({ open, course, onClose }: ReviewDialogProps) {
  const cards = useIndexStore((s) => s.cards);
  const ratings = useReviewStore((s) => s.ratings);
  const rate = useReviewStore((s) => s.rate);

  const [order, setOrder] = useState<IndexedCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  // 打开时载入该课程卡片并洗牌
  useEffect(() => {
    if (!open || !course) return;
    setOrder(shuffle(cards.filter((c) => c.courseSlug === course.id)));
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  }, [open, course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = () => {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, order.length - 1));
  };
  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  };
  const mark = (rating: ReviewRating) => {
    const card = order[index];
    if (!card) return;
    rate(cardKey(card.noteId, card.question), rating);
    // 最后一张标记后进入完成状态
    if (index >= order.length - 1) {
      setFinished(true);
    } else {
      goNext();
    }
  };
  const restart = () => {
    setOrder(shuffle(cards.filter((c) => c.courseSlug === course?.id)));
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  };

  // 统计：该课程卡片的熟悉度分布（规范 §15"简单熟悉度统计"）
  const stats = useMemo(() => {
    const courseKeys = cards
      .filter((c) => c.courseSlug === course?.id)
      .map((c) => cardKey(c.noteId, c.question));
    let mastered = 0;
    let fuzzy = 0;
    let unknown = 0;
    for (const k of courseKeys) {
      const r = ratings[k];
      if (r === "mastered") mastered++;
      else if (r === "fuzzy") fuzzy++;
      else unknown++;
    }
    return { mastered, fuzzy, unknown, total: courseKeys.length };
  }, [cards, ratings, course?.id]);

  // 键盘：Esc 关闭、←/→ 翻卡、空格显示答案
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, order.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const current = order[index];
  const done = order.length > 0 && finished;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="复习卡片"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部：课程 · 掌握数 / 总数 */}
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
            {course?.name ?? "复习"}
          </h2>
          <span className="shrink-0 text-[12px] text-ink-secondary">
            掌握 {stats.mastered} / {stats.total}
          </span>
          <IconButton label="关闭复习" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <p className="mt-1 text-[11px] text-ink-tertiary">
          不会 {stats.unknown} · 模糊 {stats.fuzzy} · 掌握 {stats.mastered}
        </p>

        {order.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-ink-secondary">
            该课程还没有复习卡片
            <p className="mt-1 text-[12px] text-ink-tertiary">
              在笔记中用「Q: 问题 / A: 答案」创建
            </p>
          </div>
        ) : done ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-medium text-ink">复习完成</p>
            <p className="mt-1 text-[12px] text-ink-secondary">
              掌握 {stats.mastered} / {stats.total} 张
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-4 rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
            >
              重新开始
            </button>
          </div>
        ) : (
          <>
            {/* 卡片主体 */}
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-border bg-surface p-4">
              <p className="text-[14px] font-medium leading-relaxed text-ink">
                {current.question}
              </p>
              {flipped ? (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-panel p-3 text-[13px] leading-relaxed text-ink-secondary">
                  {current.answer || "（该卡片没有答案）"}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="mt-4 self-start rounded-lg border border-border bg-panel px-3 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
                >
                  显示答案
                </button>
              )}
            </div>

            {/* 熟悉度标记（显示答案后出现） */}
            {flipped && (
              <div className="mt-3 flex gap-2">
                {RATING_BUTTONS.map(({ rating, label, className }) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => mark(rating)}
                    className={`flex-1 rounded-lg py-2 text-[13px] font-medium text-white transition-colors ${className}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* 底部：进度与翻卡 */}
            <div className="mt-4 flex items-center justify-between">
              <IconButton label="上一张" onClick={goPrev} disabled={index === 0}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <span className="text-[12px] tabular-nums text-ink-tertiary">
                第 {index + 1} / {order.length} 张
              </span>
              <IconButton label="下一张" onClick={goNext} disabled={index >= order.length - 1}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
