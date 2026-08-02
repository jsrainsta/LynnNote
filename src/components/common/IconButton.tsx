import type { ReactNode } from "react";
import { cx } from "../../lib/utils/cx";

interface IconButtonProps {
  /** 按钮的可访问名称，同时用作 tooltip */
  label: string;
  onClick?: () => void;
  active?: boolean;
  /** 后续阶段的占位按钮：置灰但不屏蔽 hover 提示 */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function IconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  className,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cx(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
        "text-ink-secondary transition-colors duration-150",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-hover hover:text-ink",
        active && !disabled && "bg-accent-soft text-accent-strong hover:text-accent-strong",
        className,
      )}
    >
      {children}
    </button>
  );
}
