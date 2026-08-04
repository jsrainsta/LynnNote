import { useEffect, useRef, useState } from "react";
import { FilePlus2, Pencil, Plus, Trash2, X } from "lucide-react";
import { BUILTIN_TEMPLATES } from "../../lib/templates";
import { fs } from "../../lib/storage/fs";
import type { NoteTemplateJson } from "../../lib/storage/fs";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useToastStore } from "../../stores/useToastStore";

interface TemplatePickerDialogProps {
  open: boolean;
  /** 当前课程名（模板变量 {{course}} 用） */
  courseName: string;
  /** 选中模板：回调模板内容（未替换变量），父组件负责创建 */
  onPick: (content: string) => void;
  onCancel: () => void;
}

/**
 * 新建笔记时的模板选择弹窗（规范 §12）：
 * 内置 4 种 + 自定义模板（新增/编辑/删除，持久化在 templates.json）。
 * 点击模板条目立即创建；自定义条目右侧的编辑/删除按钮不创建。
 */
export function TemplatePickerDialog({
  open,
  courseName,
  onPick,
  onCancel,
}: TemplatePickerDialogProps) {
  const [custom, setCustom] = useState<NoteTemplateJson[]>([]);
  const [editing, setEditing] = useState<NoteTemplateJson | null | "new">(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const workspacePath = useWorkspaceStore((s) => s.path);
  const showToast = useToastStore((s) => s.show);
  const formNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEditing(null);
    setFormName("");
    setFormContent("");
    if (workspacePath) {
      void fs.listTemplates(workspacePath).then(setCustom).catch(() => setCustom([]));
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, workspacePath, onCancel]);

  if (!open) return null;

  const startCreate = () => {
    setEditing("new");
    setFormName("");
    setFormContent("");
    formNameRef.current?.focus();
  };

  const startEdit = (tpl: NoteTemplateJson) => {
    setEditing(tpl);
    setFormName(tpl.name);
    setFormContent(tpl.content);
    formNameRef.current?.focus();
  };

  const saveForm = async () => {
    if (!workspacePath) return;
    if (!formName.trim() || !formContent.trim()) {
      showToast("模板名称与内容不能为空", "error");
      return;
    }
    try {
      const saved = await fs.saveTemplate(workspacePath, {
        id: editing === "new" ? "" : (editing as NoteTemplateJson).id,
        name: formName.trim(),
        content: formContent.trim(),
        updatedAt: "",
      });
      setCustom((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
      setEditing(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "保存模板失败", "error");
    }
  };

  const removeTemplate = async (id: string) => {
    if (!workspacePath) return;
    try {
      await fs.deleteTemplate(workspacePath, id);
      setCustom((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "删除模板失败", "error");
    }
  };

  const inputClass =
    "h-8 w-full rounded-lg border border-border bg-panel px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="选择笔记模板"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-ink">选择笔记模板</h2>
        <p className="mt-1 text-[12px] text-ink-secondary">
          课程：{courseName} · 变量 {"{{date}}/{{course}}/{{title}}"} 将自动替换
        </p>

        <div className="mt-3 flex flex-col gap-1.5 overflow-y-auto">
          {[...BUILTIN_TEMPLATES, ...custom].map((tpl) => (
            <div
              key={tpl.id}
              className="group flex items-center rounded-lg border border-border bg-surface px-3 py-2"
            >
              <button
                type="button"
                onClick={() => onPick(tpl.content)}
                className="min-w-0 flex-1 truncate text-left text-[13px] text-ink transition-colors hover:text-accent"
                title={`使用模板「${tpl.name}」创建`}
              >
                {tpl.name}
              </button>
              {tpl.id.startsWith("builtin:") ? (
                <span className="shrink-0 text-[11px] text-ink-tertiary">内置</span>
              ) : (
                <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`编辑模板 ${tpl.name}`}
                    onClick={() => startEdit(tpl)}
                    className="rounded-md p-1 text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除模板 ${tpl.name}`}
                    onClick={() => void removeTemplate(tpl.id)}
                    className="rounded-md p-1 text-ink-secondary transition-colors hover:bg-hover hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 自定义模板表单 */}
        {editing && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-secondary">
                {editing === "new" ? "新增自定义模板" : "编辑模板"}
              </span>
              <button
                type="button"
                aria-label="关闭模板表单"
                onClick={() => setEditing(null)}
                className="rounded-md p-0.5 text-ink-tertiary hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <input
              ref={formNameRef}
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="模板名称"
              aria-label="模板名称"
              className={inputClass}
            />
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={"模板内容（支持 {{title}}/{{date}}/{{course}}）"}
              aria-label="模板内容"
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-panel p-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="button"
              onClick={() => void saveForm()}
              className="self-end rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
            >
              保存模板
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
          >
            {editing ? <FilePlus2 className="size-3.5" /> : <Plus className="size-3.5" />}
            新增自定义模板
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
