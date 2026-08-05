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
import { indentOnInput, indentUnit } from "@codemirror/language";
import { useEditorStore } from "../../stores/useEditorStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { editorTheme, sourceHighlighting } from "./editor-theme";
import { mathWidgetExtension } from "./math-widget";
import { markdownKeymap } from "./markdown-commands";
import { slashCommandsExtension } from "./slash-commands";
import { insertExtension, locateExtension } from "./editor-actions";

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
 * 阶段八：同步滚动需要 scrollHeight（预览侧按比例跟随）。
 */
function trackPositionExtension(
  onPosition: (pos: number, scrollTop: number, scrollHeight: number) => void,
): Extension {
  let scrollTop = 0;
  let scrollHeight = 0;
  return [
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        scrollHeight = update.view.scrollDOM.scrollHeight;
        onPosition(update.state.selection.main.head, scrollTop, scrollHeight);
      }
    }),
    EditorView.domEventHandlers({
      scroll: (_event: Event, view: EditorView) => {
        scrollTop = view.scrollDOM.scrollTop;
        scrollHeight = view.scrollDOM.scrollHeight;
        onPosition(view.state.selection.main.head, scrollTop, scrollHeight);
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
 * 设置驱动的扩展同步（阶段八，规范 §20 编辑器/Markdown 设置）。
 * AtomicEditor 的 extensions 只在挂载时捕获，LiveEditor 没有视图句柄，
 * 因此统一用 Compartment + ViewPlugin：设置变化后，下一次视图更新时重配。
 * 状态用 ref 快照（组件每次渲染更新），插件只比较快照避免重复 dispatch。
 */
export interface EditorSettingsSnapshot {
  enableMath: boolean;
  tabWidth: number;
  lineWrapping: boolean;
  enableCodeHighlight: boolean;
}

function settingsSyncExtension(
  refs: {
    math: Compartment;
    indent: Compartment;
    wrap: Compartment;
    highlight: Compartment;
  },
  snapshot: { current: EditorSettingsSnapshot },
): Extension {
  return ViewPlugin.fromClass(
    class {
      math = snapshot.current.enableMath;
      tabWidth = snapshot.current.tabWidth;
      wrap = snapshot.current.lineWrapping;
      highlight = snapshot.current.enableCodeHighlight;

      update(update: ViewUpdate) {
        const s = snapshot.current;
        const effects: ReturnType<Compartment["reconfigure"]>[] = [];
        if (this.math !== s.enableMath) {
          this.math = s.enableMath;
          effects.push(
            refs.math.reconfigure(s.enableMath ? mathWidgetExtension() : []),
          );
        }
        if (this.tabWidth !== s.tabWidth) {
          this.tabWidth = s.tabWidth;
          effects.push(
            refs.indent.reconfigure(indentUnit.of(" ".repeat(s.tabWidth))),
          );
        }
        if (this.wrap !== s.lineWrapping) {
          this.wrap = s.lineWrapping;
          effects.push(
            refs.wrap.reconfigure(s.lineWrapping ? EditorView.lineWrapping : []),
          );
        }
        if (this.highlight !== s.enableCodeHighlight) {
          this.highlight = s.enableCodeHighlight;
          effects.push(
            refs.highlight.reconfigure(
              s.enableCodeHighlight ? sourceHighlighting : [],
            ),
          );
        }
        if (effects.length > 0) {
          update.view.dispatch({ effects });
        }
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
  const setEditorScroll = useEditorStore((s) => s.setEditorScroll);
  const onPosition = useMemo(
    () => (pos: number, scrollTop: number, scrollHeight: number) => {
      setLastPosition(noteId, pos, scrollTop);
      setEditorScroll(noteId, scrollTop, scrollHeight);
    },
    [noteId, setLastPosition, setEditorScroll],
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
  onPosition: (pos: number, scrollTop: number, scrollHeight: number) => void;
}) {
  const showLineNumbersRef = useRef(showLineNumbers);
  showLineNumbersRef.current = showLineNumbers;
  const settingsRef = useRef<EditorSettingsSnapshot>({
    enableMath: useSettingsStore.getState().enableMath,
    tabWidth: useSettingsStore.getState().tabWidth,
    lineWrapping: false, // 实时预览始终换行（Obsidian 式），设置只影响源码侧
    enableCodeHighlight: false, // 代码高亮由 AtomicEditor 自带，设置只影响源码侧
  });
  // 注意：必须用标量选择器——对象选择器每次返回新引用会触发
  // useSyncExternalStore 无限循环（React "getSnapshot should be cached"）
  const enableMath = useSettingsStore((s) => s.enableMath);
  const tabWidth = useSettingsStore((s) => s.tabWidth);
  settingsRef.current.enableMath = enableMath;
  settingsRef.current.tabWidth = tabWidth;

  // 扩展在挂载时捕获（key={noteId} 决定生命周期），行号开关用 ref + ViewPlugin 动态重配置
  const extensions = useMemo<readonly Extension[]>(() => {
    const lineNumbersCompartment = new Compartment();
    const mathCompartment = new Compartment();
    const indentCompartment = new Compartment();
    const wrapCompartment = new Compartment();
    const highlightCompartment = new Compartment();
    const savedPos = () => useEditorStore.getState().lastPosition[noteId];
    return [
      lineNumbersCompartment.of([]),
      mathCompartment.of(
        settingsRef.current.enableMath ? mathWidgetExtension() : [],
      ),
      indentCompartment.of(indentUnit.of(" ".repeat(settingsRef.current.tabWidth))),
      wrapCompartment.of([]),
      highlightCompartment.of([]),
      Prec.high(keymap.of(markdownKeymap())),
      slashCommandsExtension(),
      trackPositionExtension(onPosition),
      restorePositionExtension(savedPos),
      locateExtension(noteId),
      insertExtension(noteId),
      settingsSyncExtension(
        {
          math: mathCompartment,
          indent: indentCompartment,
          wrap: wrapCompartment,
          highlight: highlightCompartment,
        },
        settingsRef,
      ),
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
  onPosition: (pos: number, scrollTop: number, scrollHeight: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lineNumbersCompartment = useMemo(() => new Compartment(), []);
  const settingsRef = useRef<EditorSettingsSnapshot>({
    enableMath: useSettingsStore.getState().enableMath,
    tabWidth: useSettingsStore.getState().tabWidth,
    lineWrapping: useSettingsStore.getState().lineWrapping,
    enableCodeHighlight: useSettingsStore.getState().enableCodeHighlight,
  });
  const enableMath = useSettingsStore((s) => s.enableMath);
  const tabWidth = useSettingsStore((s) => s.tabWidth);
  const lineWrappingSetting = useSettingsStore((s) => s.lineWrapping);
  const enableCodeHighlight = useSettingsStore((s) => s.enableCodeHighlight);
  settingsRef.current.enableMath = enableMath;
  settingsRef.current.tabWidth = tabWidth;
  settingsRef.current.lineWrapping = lineWrappingSetting;
  settingsRef.current.enableCodeHighlight = enableCodeHighlight;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mathCompartment = new Compartment();
    const indentCompartment = new Compartment();
    const wrapCompartment = new Compartment();
    const highlightCompartment = new Compartment();
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
          mathCompartment.of(
            settingsRef.current.enableMath ? mathWidgetExtension() : [],
          ),
          indentCompartment.of(indentUnit.of(" ".repeat(settingsRef.current.tabWidth))),
          wrapCompartment.of(
            settingsRef.current.lineWrapping ? EditorView.lineWrapping : [],
          ),
          highlightCompartment.of(
            settingsRef.current.enableCodeHighlight ? sourceHighlighting : [],
          ),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          search({ top: true }),
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
          locateExtension(noteId),
          insertExtension(noteId),
          settingsSyncExtension(
            {
              math: mathCompartment,
              indent: indentCompartment,
              wrap: wrapCompartment,
              highlight: highlightCompartment,
            },
            settingsRef,
          ),
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
