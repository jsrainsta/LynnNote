import { useCallback, useEffect, useRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EmptyState } from "../common/EmptyState";
import { FileText, Loader2 } from "lucide-react";
import { useNoteStore } from "../../stores/useNoteStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useFocusStore } from "../../stores/useFocusStore";
import { useToastStore } from "../../stores/useToastStore";
import { fs } from "../../lib/storage/fs";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { EditorToolbar } from "./EditorToolbar";
import { SlashMenu } from "./SlashMenu";

const SPLIT_SEPARATOR_CLASS =
  "w-px shrink-0 bg-border transition-colors duration-150 hover:bg-border-strong";

/**
 * 主编辑区（规范 §8.3）：
 * - edit（实时预览）：所见即所得行内实时渲染
 * - split（分栏）：左侧源码 + 右侧渲染，宽度可拖动
 * - preview（纯预览）：只渲染
 *
 * 阶段三：内容从磁盘读取（readNote → loadNoteContent），
 * 编辑停止 800ms 后真实写入（saveNow），切换笔记前立即保存。
 */
export function EditorArea() {
  const focusActive = useFocusStore((s) => s.active);
  const mode = useEditorStore((s) => s.mode);
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers);
  const enableMath = useSettingsStore((s) => s.enableMath);
  const enableCodeHighlight = useSettingsStore((s) => s.enableCodeHighlight);
  const syncScroll = useSettingsStore((s) => s.syncScroll);
  const noteId = useNoteStore((s) => s.selectedNoteId);
  const noteRelativePath = useNoteStore((s) => {
    const note = s.notes.find((n) => n.id === s.selectedNoteId);
    return note?.relativePath;
  });
  const noteContents = useEditorStore((s) => s.noteContents);
  const loadNoteContent = useEditorStore((s) => s.loadNoteContent);
  const setNoteContent = useEditorStore((s) => s.setNoteContent);
  const setNoteHash = useEditorStore((s) => s.setNoteHash);
  const saveNow = useEditorStore((s) => s.saveNow);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const workspacePath = useWorkspaceStore((s) => s.path);
  const showToast = useToastStore((s) => s.show);

  const prevNoteIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // 笔记切换：先立即保存旧笔记（若有未保存改动），再异步读取新笔记
  useEffect(() => {
    const prev = prevNoteIdRef.current;
    prevNoteIdRef.current = noteId;

    if (!noteId || !workspacePath || !noteRelativePath) return;

    // 清掉旧笔记的防抖定时器（切走即保存，无需再等）
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (prev && prev !== noteId) {
      void saveNow(prev);
    }

    let cancelled = false;
    setSaveStatus("saving");
    fs.readNote(workspacePath, noteRelativePath)
      .then((result) => {
        if (cancelled) return;
        loadNoteContent(noteId, result.content);
        setNoteHash(noteId, result.hash);
        setSaveStatus("saved");
      })
      .catch((error) => {
        if (cancelled) return;
        setSaveStatus("error");
        showToast(
          `读取笔记失败：${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [
    noteId,
    workspacePath,
    noteRelativePath,
    saveNow,
    loadNoteContent,
    setNoteHash,
    setSaveStatus,
    showToast,
  ]);

  // 编辑内容：写入缓存并调度防抖保存（规范 §18；延迟可在设置调整，阶段八）
  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!noteId) return;
      setNoteContent(noteId, newContent);
      const delay = useSettingsStore.getState().autosaveDelay;
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void saveNow(noteId);
      }, delay);
    },
    [noteId, setNoteContent, saveNow],
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
        {!focusActive && <EditorToolbar />}
        <EmptyState icon={FileText} title="未选择笔记" description="从左侧选择一篇笔记开始记录" />
      </main>
    );
  }

  // 编辑器只在内容就绪后挂载（AtomicEditor 的 markdownSource 仅挂载时生效）
  const content = noteContents[noteId];
  if (content === undefined) {
    return (
      <main className="flex h-full min-w-0 flex-col bg-panel" aria-label="编辑区域">
        {!focusActive && <EditorToolbar />}
        <EmptyState icon={Loader2} title="正在加载笔记…" description="" />
      </main>
    );
  }

  return (
    <main className="flex h-full min-w-0 flex-col bg-panel" aria-label="编辑区域">
      {!focusActive && <EditorToolbar />}
      <div className="min-h-0 flex-1">
        {mode === "preview" ? (
          <MarkdownPreview
            content={content}
            enableMath={enableMath}
            enableCodeHighlight={enableCodeHighlight}
          />
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
              <MarkdownPreview
                content={content}
                enableMath={enableMath}
                enableCodeHighlight={enableCodeHighlight}
                syncScroll={syncScroll}
              />
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
      <SlashMenu />
    </main>
  );
}
