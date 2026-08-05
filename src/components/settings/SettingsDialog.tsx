import { useEffect, useRef } from "react";
import { Database, FolderOpen, RefreshCw, X } from "lucide-react";
import { ACCENT_PRESETS, EDITOR_FONTS, UI_SCALES, useSettingsStore } from "../../stores/useSettingsStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useIndexStore } from "../../stores/useIndexStore";
import { useToastStore } from "../../stores/useToastStore";
import { fs } from "../../lib/storage/fs";
import { IconButton } from "../common/IconButton";
import { cx } from "../../lib/utils/cx";
import type { EditorMode, Theme } from "../../types";

/**
 * 设置弹窗（阶段八，规范 §20）：外观 / 编辑器 / Markdown / 数据 四组。
 * 所有值写入 useSettingsStore（persist 到 localStorage），
 * 编辑器相关值通过 CSS 变量 / Compartment 实时生效（App.tsx 与 MarkdownEditor 消费）。
 */

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

const MODES: Array<{ value: EditorMode; label: string }> = [
  { value: "edit", label: "实时预览" },
  { value: "split", label: "编辑分栏" },
  { value: "preview", label: "纯预览" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border px-5 py-4 first:border-t-0">
      <h3 className="mb-3 text-[12px] font-medium tracking-wider text-ink-tertiary">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[13px] text-ink">
      <span className="shrink-0">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">{children}</span>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-border-strong",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-0.5",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

const INPUT_CLASS =
  "h-8 min-w-0 rounded-lg border border-border bg-panel px-2.5 text-[13px] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25";

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const settings = useSettingsStore();
  const setSettings = useSettingsStore((s) => s.set);
  const workspacePath = useWorkspaceStore((s) => s.path);
  const showToast = useToastStore((s) => s.show);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  const handleRebuildIndex = async () => {
    try {
      await useIndexStore.getState().build();
      showToast("索引已重建", "success");
    } catch (error) {
      showToast(errorMessage(error, "重建索引失败"), "error");
    }
  };

  const handleExportSettings = async () => {
    if (!workspacePath) return;
    // 导出除动作外的全部设置字段
    const rest = Object.fromEntries(
      Object.entries(settings).filter(([key]) => key !== "set"),
    );
    const json = JSON.stringify(rest, null, 2);
    try {
      await fs.exportSettings(workspacePath, json);
      showToast("设置已导出到工作区（lynnnote-settings.json）", "success");
    } catch (error) {
      showToast(errorMessage(error, "导出设置失败"), "error");
    }
  };

  const handleRevealWorkspace = async () => {
    if (!workspacePath) return;
    try {
      await fs.revealWorkspace(workspacePath);
      showToast("已打开工作区文件夹", "success");
    } catch (error) {
      showToast(errorMessage(error, "打开文件夹失败"), "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onClick={onClose}
    >
      <div
        className="flex max-h-[82vh] w-full max-w-lg flex-col rounded-xl border border-border bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
          <h2 className="flex-1 text-[15px] font-semibold text-ink">设置</h2>
          <IconButton label="关闭设置" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* 外观 */}
          <Section title="外观">
            <Row label="主题">
              <div role="radiogroup" aria-label="主题" className="flex gap-1">
                {THEMES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === value}
                    onClick={() => setSettings({ theme: value })}
                    className={cx(
                      "rounded-lg px-2.5 py-1 text-[12px] transition-colors",
                      settings.theme === value
                        ? "bg-accent-soft font-medium text-accent-strong"
                        : "text-ink-secondary hover:bg-hover hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="强调色">
              <div role="radiogroup" aria-label="强调色" className="flex gap-1.5">
                {ACCENT_PRESETS.map(({ name, color }) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-label={name}
                    aria-checked={settings.accent === color}
                    title={name}
                    onClick={() => setSettings({ accent: color })}
                    className={cx(
                      "size-5 rounded-full transition-transform hover:scale-110",
                      settings.accent === color && "ring-2 ring-ink ring-offset-2 ring-offset-panel",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Row>
            <Row label="界面缩放">
              <select
                value={settings.uiScale}
                onChange={(e) => setSettings({ uiScale: Number(e.target.value) })}
                aria-label="界面缩放"
                className={INPUT_CLASS}
              >
                {UI_SCALES.map((s) => (
                  <option key={s} value={s}>
                    {Math.round(s * 100)}%
                  </option>
                ))}
              </select>
            </Row>
          </Section>

          {/* 编辑器 */}
          <Section title="编辑器">
            <Row label="字号">
              <input
                type="number"
                min={12}
                max={24}
                value={settings.editorFontSize}
                onChange={(e) => setSettings({ editorFontSize: Number(e.target.value) || 15 })}
                aria-label="字号"
                className={cx(INPUT_CLASS, "w-20")}
              />
              <span className="text-[12px] text-ink-tertiary">px</span>
            </Row>
            <Row label="行高">
              <input
                type="number"
                min={1.2}
                max={2.6}
                step={0.1}
                value={settings.editorLineHeight}
                onChange={(e) =>
                  setSettings({ editorLineHeight: Number(e.target.value) || 1.8 })
                }
                aria-label="行高"
                className={cx(INPUT_CLASS, "w-20")}
              />
            </Row>
            <Row label="字体">
              <select
                value={settings.editorFont}
                onChange={(e) => setSettings({ editorFont: e.target.value })}
                aria-label="编辑器字体"
                className={INPUT_CLASS}
              >
                {EDITOR_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="显示行号">
              <Toggle
                checked={settings.showLineNumbers}
                onChange={(v) => setSettings({ showLineNumbers: v })}
                label="显示行号"
              />
            </Row>
            <Row label="自动换行（分栏源码）">
              <Toggle
                checked={settings.lineWrapping}
                onChange={(v) => setSettings({ lineWrapping: v })}
                label="自动换行"
              />
            </Row>
            <Row label="Tab 宽度">
              <select
                value={settings.tabWidth}
                onChange={(e) => setSettings({ tabWidth: Number(e.target.value) })}
                aria-label="Tab 宽度"
                className={INPUT_CLASS}
              >
                {[2, 4, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} 空格
                  </option>
                ))}
              </select>
            </Row>
            <Row label="自动保存延迟">
              <input
                type="number"
                min={300}
                max={3000}
                step={100}
                value={settings.autosaveDelay}
                onChange={(e) => setSettings({ autosaveDelay: Number(e.target.value) || 800 })}
                aria-label="自动保存延迟"
                className={cx(INPUT_CLASS, "w-24")}
              />
              <span className="text-[12px] text-ink-tertiary">ms</span>
            </Row>
          </Section>

          {/* Markdown */}
          <Section title="Markdown">
            <Row label="启用公式渲染">
              <Toggle
                checked={settings.enableMath}
                onChange={(v) => setSettings({ enableMath: v })}
                label="启用公式渲染"
              />
            </Row>
            <Row label="启用代码高亮">
              <Toggle
                checked={settings.enableCodeHighlight}
                onChange={(v) => setSettings({ enableCodeHighlight: v })}
                label="启用代码高亮"
              />
            </Row>
            <Row label="同步滚动（分栏）">
              <Toggle
                checked={settings.syncScroll}
                onChange={(v) => setSettings({ syncScroll: v })}
                label="同步滚动"
              />
            </Row>
            <Row label="默认编辑模式">
              <select
                value={settings.defaultMode}
                onChange={(e) =>
                  setSettings({ defaultMode: e.target.value as EditorMode })
                }
                aria-label="默认编辑模式"
                className={INPUT_CLASS}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Row>
          </Section>

          {/* 数据 */}
          <Section title="数据">
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-ink-tertiary">当前工作区</p>
              <p
                className="break-all rounded-lg bg-surface px-3 py-2 text-[12px] text-ink-secondary"
                aria-label="当前工作区路径"
              >
                {workspacePath ?? "（未选择）"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRevealWorkspace()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
              >
                <FolderOpen className="size-3.5" aria-hidden="true" />
                打开工作区文件夹
              </button>
              <button
                type="button"
                onClick={() => void handleExportSettings()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
              >
                <Database className="size-3.5" aria-hidden="true" />
                导出设置
              </button>
              <button
                type="button"
                onClick={() => void handleRebuildIndex()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                重建笔记索引
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
