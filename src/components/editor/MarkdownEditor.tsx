import { useEffect, useMemo, useRef } from "react";
import { AtomicCodeMirrorEditor } from "@atomic-editor/editor";
import { ATOMIC_CODE_LANGUAGES } from "@atomic-editor/editor/code-languages";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  lineNumbers,
  keymap,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { search, searchKeymap } from "@codemirror/search";
import { languages } from "@codemirror/language-data";
import { indentOnInput } from "@codemirror/language";
import { useEditorStore } from "../../stores/useEditorStore";
import { editorTheme, sourceHighlighting } from "./editor-theme";
import { mathWidgetExtension } from "./math-widget";
import { markdownKeymap } from "./markdown-commands";
import { slashCommandsExtension } from "./slash-commands";

export type EditorVariant = "live" | "source";

interface MarkdownEditorProps {
  /** live：所见即所得实时预览；source：分栏模式的纯源码侧 */
  variant: EditorVariant;
  /** 笔记 id：作为 React key 重挂载，切换笔记即重新加载内容 */
  noteId: string;
  /** 初始内容，仅在挂载时使用 */
  content: string;
  /** 内容变化回调（防抖由父组件负责） */
  onChange: (content: string) => void;
  showLineNumbers: boolean;
}

/**
 * 记录光标与滚动位置（跨笔记切换保留），实时写入 store。
 * 两种模式共用：通过 CM6 的 updateListener + 滚动事件捕获。
 */
function trackPositionExtension(
  onPosition: (pos: number, scrollTop: number) => void,
): Extension {
  let scrollTop = 0;
  return [
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        onPosition(update.state.selection.main.head, scrollTop);
      }
    }),
    EditorView.domEventHandlers({
      scroll: (_event: Event, view: EditorView) => {
        scrollTop = view.scrollDOM.scrollTop;
        onPosition(view.state.selection.main.head, scrollTop);
      },
    }),
  ];
}

/**
 * 挂载后恢复上次的光标与滚动位置。
 * 用 setTimeout 延后到视图挂载完成后再 dispatch，避免在插件构造期间发送事务。
 */
function restorePositionExtension(
  getSaved: () => { pos: number; scrollTop: number } | undefined,
): Extension {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        const saved = getSaved();
        if (!saved) return;
        setTimeout(() => {
          if (!view.scrollDOM.isConnected) return;
          const pos = Math.min(saved.pos, view.state.doc.length);
          view.dispatch({
            selection: { anchor: pos },
            effects: EditorView.scrollIntoView(pos),
          });
          view.scrollDOM.scrollTop = saved.scrollTop;
        }, 0);
      }
    },
  );
}

/**
 * 编辑区核心：根据 variant 选择编辑器实现。
 * - live：@atomic-editor/editor（Obsidian 式实时预览）+ 数学公式 widget + 快捷键
 * - source：原生 CodeMirror 6（源码 + 语法高亮），供分栏模式使用
 */
export function MarkdownEditor({ variant, noteId, content, onChange, showLineNumbers }: MarkdownEditorProps) {
  const setLastPosition = useEditorStore((s) => s.setLastPosition);
  const onPosition = useMemo(
    () => (pos: number, scrollTop: number) => setLastPosition(noteId, pos, scrollTop),
    [noteId, setLastPosition],
  );

  if (variant === "live") {
    return (
      <LiveEditor
        noteId={noteId}
        content={content}
        showLineNumbers={showLineNumbers}
        onChange={onChange}
        onPosition={onPosition}
      />
    );
  }
  return (
    <SourceEditor
      noteId={noteId}
      content={content}
      showLineNumbers={showLineNumbers}
      onChange={onChange}
      onPosition={onPosition}
    />
  );
}

/** 实时预览模式：@atomic-editor/editor + 自定义扩展 */
function LiveEditor({
  noteId,
  content,
  showLineNumbers,
  onChange,
  onPosition,
}: {
  noteId: string;
  content: string;
  showLineNumbers: boolean;
  onChange: (content: string) => void;
  onPosition: (pos: number, scrollTop: number) => void;
}) {
  const showLineNumbersRef = useRef(showLineNumbers);
  showLineNumbersRef.current = showLineNumbers;

  // 扩展在挂载时捕获（key={noteId} 决定生命周期），行号开关用 ref + ViewPlugin 动态重配置
  const extensions = useMemo<readonly Extension[]>(() => {
    const lineNumbersCompartment = new Compartment();
    const savedPos = () => useEditorStore.getState().lastPosition[noteId];
    return [
      lineNumbersCompartment.of([]),
      Prec.high(keymap.of(markdownKeymap())),
      slashCommandsExtension(),
      mathWidgetExtension(),
      trackPositionExtension(onPosition),
      restorePositionExtension(savedPos),
      ViewPlugin.fromClass(
        class LineNumbersSync {
          enabled = showLineNumbersRef.current;
          update(update: ViewUpdate) {
            if (this.enabled === showLineNumbersRef.current) return;
            this.enabled = showLineNumbersRef.current;
            update.view.dispatch({
              effects: lineNumbersCompartment.reconfigure(
                this.enabled ? lineNumbers() : [],
              ),
            });
          }
        },
      ),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return (
    <div className="h-full min-w-0">
      <AtomicCodeMirrorEditor
        documentId={noteId}
        markdownSource={content}
        codeLanguages={ATOMIC_CODE_LANGUAGES}
        extensions={extensions}
        onMarkdownChange={onChange}
      />
    </div>
  );
}

/** 分栏模式源码侧：原生 CodeMirror 6 */
function SourceEditor({
  noteId,
  content,
  showLineNumbers,
  onChange,
  onPosition,
}: {
  noteId: string;
  content: string;
  showLineNumbers: boolean;
  onChange: (content: string) => void;
  onPosition: (pos: number, scrollTop: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lineNumbersCompartment = useMemo(() => new Compartment(), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const savedPos = () => useEditorStore.getState().lastPosition[noteId];
    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          history(),
          drawSelection(),
          highlightActiveLine(),
          closeBrackets(),
          indentOnInput(),
          EditorState.allowMultipleSelections.of(true),
          lineNumbersCompartment.of(showLineNumbers ? lineNumbers() : []),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          search({ top: true }),
          sourceHighlighting,
          editorTheme,
          slashCommandsExtension(),
          keymap.of([
            ...markdownKeymap(),
            ...closeBracketsKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange(update.state.doc.toString());
          }),
          trackPositionExtension(onPosition),
          restorePositionExtension(savedPos),
        ],
      }),
      parent: container,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 组件由父级以 key={noteId} 重挂载，内容只在挂载时载入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 行号开关：重配置 compartment，不重建编辑器
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: lineNumbersCompartment.reconfigure(showLineNumbers ? lineNumbers() : []),
    });
  }, [showLineNumbers, lineNumbersCompartment]);

  return <div ref={containerRef} className="h-full min-w-0" />;
}
