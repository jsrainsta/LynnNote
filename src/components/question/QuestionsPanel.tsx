import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { useIndexStore } from "../../stores/useIndexStore";
import type { IndexedQuestion } from "../../stores/useIndexStore";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { useEditorActionStore } from "../../stores/useEditorActionStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useToastStore } from "../../stores/useToastStore";
import { findNearestQuestionOffset, parseQuestions, toggleQuestionSolved } from "../../lib/parser";
import { fs } from "../../lib/storage/fs";

/**
 * 疑问面板（阶段七，规范 §14）：课程级待解决问题列表。
 * 点击条目 → 打开对应笔记并把光标定位到问题位置（含短暂高亮）；
 * 可标记已解决（写回 `> [!QUESTION] solved`，不破坏 Markdown 可读性）。
 */
export function QuestionsPanel() {
  const questions = useIndexStore((s) => s.questions);
  const courses = useCourseStore((s) => s.courses);
  const notes = useNoteStore((s) => s.notes);
  const showToast = useToastStore((s) => s.show);
  const [showSolved, setShowSolved] = useState(false);

  const open = questions.filter((q) => !q.solved);
  const solved = questions.filter((q) => q.solved);

  const noteTitle = (noteId: string) =>
    notes.find((n) => n.id === noteId)?.title ?? noteId;

  /** 待解决问题按课程分组，课程顺序与课程列表一致（未知 slug 排最后） */
  const grouped = useMemo(() => {
    const map = new Map<string, IndexedQuestion[]>();
    for (const q of open) {
      const list = map.get(q.courseSlug) ?? [];
      list.push(q);
      map.set(q.courseSlug, list);
    }
    const courseIds = new Set(courses.map((c) => c.id));
    const unknown: string[] = [];
    const known: Array<{ slug: string; items: IndexedQuestion[] }> = [];
    for (const [slug, items] of map) {
      const group = { slug, items };
      if (courseIds.has(slug)) known.push(group);
      else unknown.push(slug);
    }
    known.sort((a, b) => {
      const ia = courses.findIndex((c) => c.id === a.slug);
      const ib = courses.findIndex((c) => c.id === b.slug);
      return ia - ib;
    });
    for (const slug of unknown) {
      const items = map.get(slug)!;
      known.push({ slug, items });
    }
    return known;
  }, [open, courses]);

  const courseName = (slug: string) => courses.find((c) => c.id === slug)?.name ?? slug;
  const courseColor = (slug: string) => courses.find((c) => c.id === slug)?.color ?? "#999";

  /** 点击条目：选中课程与笔记，请求编辑器定位（视图挂载后自动消费） */
  const handleOpen = (q: IndexedQuestion) => {
    useCourseStore.getState().selectCourse(q.courseSlug);
    useNoteStore.getState().selectNote(q.noteId);
    if (useEditorStore.getState().mode === "preview") {
      useEditorStore.getState().setMode("edit");
    }
    useEditorActionStore.getState().requestLocate(q.noteId, q.offset, q.offset + 60);
  };

  /** 标记已解决/取消：写回 `[!QUESTION] solved`；内容可能已编辑，先就近重定位 */
  const handleToggle = async (q: IndexedQuestion) => {
    const workspace = useWorkspaceStore.getState().path;
    const note = useNoteStore.getState().notes.find((n) => n.id === q.noteId);
    if (!workspace || !note) return;
    const editor = useEditorStore.getState();
    let content = editor.noteContents[q.noteId];
    let hash = editor.noteHashes[q.noteId];
    if (content === undefined) {
      try {
        const r = await fs.readNote(workspace, note.relativePath);
        content = r.content;
        hash = r.hash;
      } catch (error) {
        showToast(`读取笔记失败：${error instanceof Error ? error.message : String(error)}`, "error");
        return;
      }
    }
    const parsed = parseQuestions(content).find((p) => p.text === q.text);
    const offset = parsed ? parsed.offset : findNearestQuestionOffset(content, q.offset);
    if (offset === null) {
      showToast("未找到问题标记，请检查笔记内容", "error");
      return;
    }
    const next = toggleQuestionSolved(content, offset, !q.solved);
    if (next === content) return;
    if (editor.noteContents[q.noteId] !== undefined) {
      // 笔记已打开：走编辑器缓存与保存链路（保存成功时索引自动增量更新）
      editor.setNoteContent(q.noteId, next);
      try {
        await editor.saveNow(q.noteId);
      } catch (error) {
        showToast(`保存失败：${error instanceof Error ? error.message : String(error)}`, "error");
      }
    } else {
      try {
        await fs.writeNote(workspace, note.relativePath, next, hash);
        useIndexStore.getState().reparse(q.noteId, next);
      } catch (error) {
        showToast(`保存失败：${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
  };

  const renderItem = (q: IndexedQuestion) => (
    <li key={`${q.noteId}:${q.offset}`} className="group flex items-start gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-hover">
      <button
        type="button"
        onClick={() => handleOpen(q)}
        className="min-w-0 flex-1 text-left"
        title={`${noteTitle(q.noteId)} — 点击定位`}
      >
        <p className="line-clamp-2 text-[13px] leading-snug text-ink">{q.text}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-tertiary">{noteTitle(q.noteId)}</p>
      </button>
      <button
        type="button"
        aria-label={q.solved ? "取消已解决" : "标记已解决"}
        title={q.solved ? "取消已解决" : "标记已解决"}
        onClick={() => void handleToggle(q)}
        className="mt-0.5 shrink-0 rounded p-0.5 text-ink-tertiary transition-colors hover:text-success"
      >
        <CheckCircle2 className="size-4" />
      </button>
    </li>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <p className="px-2 pb-1 pt-2 text-[11px] font-medium tracking-wider text-ink-tertiary">
        待解决问题
      </p>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <HelpCircle className="size-8 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-[13px] text-ink-secondary">没有待解决问题</p>
          <p className="text-[12px] leading-relaxed text-ink-tertiary">
            在笔记中用「&gt; [!QUESTION]」标记疑问，<br />
            或使用斜杠命令 /问题 快速插入
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {grouped.map((group) => (
            <li key={group.slug}>
              <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-2.5 text-[12px] font-medium text-ink-secondary">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: courseColor(group.slug) }}
                  aria-hidden="true"
                />
                <span className="truncate">{courseName(group.slug)}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-ink-tertiary">
                  {group.items.length}
                </span>
              </p>
              <ul className="mt-0.5 flex flex-col gap-0.5">{group.items.map(renderItem)}</ul>
            </li>
          ))}
        </ul>
      )}

      {/* 已解决（默认折叠） */}
      {solved.length > 0 && (
        <div className="mt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowSolved((v) => !v)}
            className="flex w-full items-center gap-1 px-2 pb-1 pt-2.5 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary"
            aria-expanded={showSolved}
          >
            {showSolved ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            )}
            已解决（{solved.length}）
          </button>
          {showSolved && (
            <ul className="flex flex-col gap-0.5 opacity-70">{solved.map(renderItem)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
