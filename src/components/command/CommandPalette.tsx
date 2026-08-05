import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CheckSquare,
  FilePlus2,
  FolderPlus,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  Moon,
  Settings,
  Target,
} from "lucide-react";
import { useEditorStore } from "../../stores/useEditorStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useCourseStore } from "../../stores/useCourseStore";
import { useFocusStore } from "../../stores/useFocusStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useToastStore } from "../../stores/useToastStore";
import { useEditorActionStore } from "../../stores/useEditorActionStore";
import { UI_EVENTS, useUiEventStore } from "../../stores/useUiEventStore";
import { cx } from "../../lib/utils/cx";
import type { EditorMode } from "../../types";

/**
 * 命令面板（阶段八，规范 §21）：Ctrl/Cmd+Shift+P 打开，
 * 键盘搜索 + 上下键选择 + 回车执行。不做成插件系统。
 * 面板内状态在各自组件里的命令，通过 UI_EVENTS 事件桥接。
 */
interface PaletteCommand {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  /** 打开快速打开（Ctrl+P 的 titles 模式）——由"打开最近笔记"命令触发 */
  onOpenQuickOpen: () => void;
  onClose: () => void;
}

/** 插入问题/卡片共用：检查当前笔记可用性 */
function editorForInsert(): boolean {
  const noteId = useNoteStore.getState().selectedNoteId;
  const editor = useEditorStore.getState();
  if (!noteId) {
    useToastStore.getState().show("请先选择一篇笔记", "error");
    return false;
  }
  if (editor.mode === "preview") editor.setMode("edit");
  return true;
}

const MODE_CYCLE: EditorMode[] = ["edit", "split", "preview"];

export function CommandPalette({ open, onOpenQuickOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // 命令在每次打开时构建（读取最新 store 状态执行）
  const commands = useMemo<PaletteCommand[]>(() => {
    const fire = useUiEventStore.getState().fire;
    const toast = useToastStore.getState().show;
    return [
      {
        id: "new-note",
        label: "新建笔记",
        hint: "输入标题并选择模板",
        icon: FilePlus2,
        run: () => {
          if (!useCourseStore.getState().selectedCourseId) {
            toast("请先选择一门课程", "error");
            return;
          }
          fire(UI_EVENTS.NEW_NOTE);
        },
      },
      {
        id: "new-course",
        label: "新建课程",
        hint: "创建课程目录",
        icon: FolderPlus,
        run: () => fire(UI_EVENTS.NEW_COURSE),
      },
      {
        id: "open-recent",
        label: "打开最近笔记",
        hint: "按标题快速切换（Ctrl+P）",
        icon: History,
        run: onOpenQuickOpen,
      },
      {
        id: "toggle-theme",
        label: "切换主题",
        hint: "浅色 / 深色",
        icon: Moon,
        run: () => useSettingsStore.getState().toggleTheme(),
      },
      {
        id: "toggle-preview",
        label: "切换预览",
        hint: "实时预览 / 分栏 / 纯预览",
        icon: Layers,
        run: () => {
          const s = useEditorStore.getState();
          const next = MODE_CYCLE[(MODE_CYCLE.indexOf(s.mode) + 1) % MODE_CYCLE.length];
          s.setMode(next);
        },
      },
      {
        id: "focus",
        label: "进入专注模式",
        hint: "F11",
        icon: Target,
        run: () => {
          const focus = useFocusStore.getState();
          if (focus.active) return;
          if (!useNoteStore.getState().selectedNoteId) {
            toast("请先选择一篇笔记", "error");
            return;
          }
          focus.enter();
        },
      },
      {
        id: "insert-question",
        label: "插入问题",
        hint: "> [!QUESTION]",
        icon: HelpCircle,
        run: () => {
          if (!editorForInsert()) return;
          useEditorActionStore
            .getState()
            .requestInsert(useNoteStore.getState().selectedNoteId!, "\n> [!QUESTION]\n> ");
        },
      },
      {
        id: "insert-card",
        label: "插入复习卡片",
        hint: "Q: / A:",
        icon: CheckSquare,
        run: () => {
          if (!editorForInsert()) return;
          useEditorActionStore
            .getState()
            .requestInsert(useNoteStore.getState().selectedNoteId!, "\nQ: \nA: ");
        },
      },
      {
        id: "open-questions",
        label: "打开疑问列表",
        hint: "待解决问题面板",
        icon: ListChecks,
        run: () => fire(UI_EVENTS.OPEN_QUESTIONS),
      },
      {
        id: "start-review",
        label: "开始复习",
        hint: "当前课程卡片",
        icon: BookOpen,
        run: () => {
          if (!useCourseStore.getState().selectedCourseId) {
            toast("请先选择一门课程", "error");
            return;
          }
          fire(UI_EVENTS.START_REVIEW);
        },
      },
      {
        id: "open-settings",
        label: "打开设置",
        hint: "外观 / 编辑器 / Markdown / 数据",
        icon: Settings,
        run: () => fire(UI_EVENTS.OPEN_SETTINGS),
      },
    ];
  }, [onOpenQuickOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === ""
      ? commands
      : commands.filter(
          (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
        );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const runCommand = (cmd: PaletteCommand) => {
    onClose();
    cmd.run();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-ink/25 p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      onClick={onClose}
    >
      <div
        className="flex max-h-[60vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Command className="size-4 shrink-0 text-ink-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[selected]) {
                e.preventDefault();
                runCommand(filtered[selected]);
              }
            }}
            placeholder="输入命令…"
            aria-label="命令关键词"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-tertiary"
          />
          <span className="shrink-0 text-[11px] text-ink-tertiary">Esc 关闭</span>
        </div>

        <ul role="listbox" aria-label="命令列表" className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[12px] text-ink-secondary">
              没有匹配的命令
            </li>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <li key={cmd.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    onClick={() => runCommand(cmd)}
                    onMouseEnter={() => setSelected(i)}
                    className={cx(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      i === selected ? "bg-active" : "hover:bg-hover",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-ink-secondary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      {cmd.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-tertiary">{cmd.hint}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
