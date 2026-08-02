import { useCallback, useEffect, useRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EmptyState } from "../common/EmptyState";
import { FileText } from "lucide-react";
import { useNoteStore } from "../../stores/useNoteStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { contentFor } from "../../data/mock";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { EditorToolbar } from "./EditorToolbar";

const SPLIT_SEPARATOR_CLASS =
  "w-px shrink-0 bg-border transition-colors duration-150 hover:bg-border-strong";

/**
 * 主编辑区（规范 §8.3）：
 * - edit（实时预览）：所见即所得行内实时渲染
 * - split（分栏）：左侧源码 + 右侧渲染，宽度可拖动
 * - preview（纯预览）：只渲染
 * 编辑内容实时写入 store；自动保存为状态模拟（阶段三接真实文件系统）。
 */
export function EditorArea() {
  const mode = useEditorStore((s) => s.mode);
  const showLineNumbers = useEditorStore((s) => s.showLineNumbers);
  const noteId = useNoteStore((s) => s.selectedNoteId);
  const noteTitle = useNoteStore((s) => {
    const note = s.notes.find((n) => n.id === s.selectedNoteId);
    return note?.title ?? "未命名笔记";
  });

  // 内容从 store 读取；切换笔记时 noteContents 未缓存则回退到 mock 初始内容
  // 选择器只取 noteContents 引用（稳定），避免 contentFor 每次新建字符串导致多余重渲染
  const noteContents = useEditorStore((s) => s.noteContents);
  const content = noteContents[noteId] ?? contentFor(noteId, noteTitle);

  const setNoteContent = useEditorStore((s) => s.setNoteContent);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const saveTimerRef = useRef<number | null>(null);

  // 自动保存状态模拟：停止输入 800ms 后标记"正在保存"，随后"已保存"
  const handleContentChange = useCallback(
    (newContent: string) => {
      setNoteContent(noteId, newContent);
      setSaveStatus("unsaved");
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        setSaveStatus("saving");
        window.setTimeout(() => setSaveStatus("saved"), 300);
      }, 800);
    },
    [noteId, setNoteContent, setSaveStatus],
  );

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!noteId) {
    return (
      <main className="flex h-full min-w-0 flex-col bg-panel" aria-label="编辑区域">
        <EditorToolbar />
        <EmptyState icon={FileText} title="未选择笔记" description="从左侧选择一篇笔记开始记录" />
      </main>
    );
  }

  return (
    <main className="flex h-full min-w-0 flex-col bg-panel" aria-label="编辑区域">
      <EditorToolbar />
      <div className="min-h-0 flex-1">
        {mode === "preview" ? (
          <MarkdownPreview content={content} />
        ) : mode === "split" ? (
          <Group orientation="horizontal" className="h-full w-full">
            <Panel defaultSize="50" minSize="30" className="min-w-0">
              <MarkdownEditor
                key={noteId}
                variant="source"
                noteId={noteId}
                content={content}
                onChange={handleContentChange}
                showLineNumbers={showLineNumbers}
              />
            </Panel>
            <Separator className={SPLIT_SEPARATOR_CLASS} />
            <Panel defaultSize="50" minSize="30" className="min-w-0">
              <MarkdownPreview content={content} />
            </Panel>
          </Group>
        ) : (
          <MarkdownEditor
            key={noteId}
            variant="live"
            noteId={noteId}
            content={content}
            onChange={handleContentChange}
            showLineNumbers={showLineNumbers}
          />
        )}
      </div>
    </main>
  );
}
