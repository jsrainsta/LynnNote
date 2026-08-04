import { useEffect, useRef } from "react";
import { useSlashStore } from "../../stores/useSlashStore";
import { cx } from "../../lib/utils/cx";

/**
 * 斜杠命令菜单（阶段五 §10.3）。
 * 由 CM6 插件（slash-commands.ts）检测行首 `/` 并同步状态到 useSlashStore，
 * 本组件只负责渲染与点击：fixed 定位在光标下方，↑/↓/Enter/Esc 由插件的 keymap 处理。
 */
export function SlashMenu() {
  const open = useSlashStore((s) => s.open);
  const items = useSlashStore((s) => s.items);
  const selected = useSlashStore((s) => s.selected);
  const x = useSlashStore((s) => s.x);
  const y = useSlashStore((s) => s.y);
  const selectAndInsert = useSlashStore((s) => s.selectAndInsert);
  const ref = useRef<HTMLDivElement>(null);

  // 菜单打开时点击外部关闭（编辑器外点击）
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        useSlashStore.getState().closeMenu();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!open || items.length === 0) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="斜杠命令"
      className="fixed z-50 flex max-h-60 w-44 flex-col overflow-y-auto rounded-lg border border-border bg-panel p-1 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => selectAndInsert(index)}
          className={cx(
            "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors",
            index === selected ? "bg-hover font-medium" : "hover:bg-hover",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
