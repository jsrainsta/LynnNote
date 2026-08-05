import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * 裸 CodeMirror 6 主题（分栏模式的源码侧）。
 * 所有颜色通过 CSS 变量引用设计 token，浅色/深色主题自动跟随。
 * （实时预览模式由 @atomic-editor/editor 自带主题 + CSS 变量覆盖控制。）
 */
export const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--color-panel)",
      color: "var(--color-ink)",
    },
    ".cm-scroller": {
      /* 阶段八：字号/行高/字体由设置驱动（--ln-editor-*，App.tsx 设置） */
      fontFamily: "var(--ln-editor-font, var(--font-mono))",
      fontSize: "var(--ln-editor-font-size, 15px)",
      lineHeight: "var(--ln-editor-line-height, 1.8)",
      overflow: "auto",
    },
    ".cm-content": {
      padding: "16px 20px",
      caretColor: "var(--color-ink)",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-ink)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--color-accent-soft) !important",
    },
    ".cm-activeLine": { backgroundColor: "var(--color-hover)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--color-hover)" },
    ".cm-gutters": {
      backgroundColor: "var(--color-panel)",
      color: "var(--color-ink-tertiary)",
      borderRight: "1px solid var(--color-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 4px" },
    /* 查找替换面板 */
    ".cm-panels": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-ink)",
      borderBottom: "1px solid var(--color-border)",
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      zIndex: "10",
    },
    ".cm-panels input": {
      backgroundColor: "var(--color-panel)",
      border: "1px solid var(--color-border)",
      borderRadius: "4px",
      color: "var(--color-ink)",
      padding: "2px 6px",
    },
    ".cm-panels button": {
      color: "var(--color-ink-secondary)",
      border: "none",
      background: "none",
      cursor: "pointer",
    },
    ".cm-panels button:hover": { color: "var(--color-ink)" },
    ".cm-panels-toggle": { margin: "0 2px" },
    ".cm-searchMatch": {
      backgroundColor: "var(--color-accent-soft)",
      outline: "1px solid var(--color-accent)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "var(--color-accent)",
      outline: "none",
    },
    ".cm-textfield": { fontFamily: "var(--font-sans)" },
  },
  { dark: false },
);

/**
 * Markdown + 代码块语法着色。
 * 只声明关心的 tag，其余保持默认文字色；颜色全部走 CSS 变量。
 * 源码侧保持扁平样式（不放大标题），渲染效果由实时预览/预览区负责。
 */
export const markdownHighlightStyle = HighlightStyle.define([
  /* Markdown 结构记号：淡化但不隐藏，方便定位 */
  { tag: tags.processingInstruction, color: "var(--color-ink-tertiary)" },
  { tag: tags.meta, color: "var(--color-ink-tertiary)" },
  { tag: tags.link, color: "var(--color-accent)" },
  { tag: tags.url, color: "var(--color-accent)", textDecoration: "underline" },
  { tag: tags.heading, fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--color-ink-tertiary)" },
  { tag: tags.monospace, backgroundColor: "var(--color-surface)", borderRadius: "3px" },
  { tag: tags.quote, color: "var(--color-ink-secondary)" },
  { tag: tags.contentSeparator, color: "var(--color-ink-tertiary)" },
  { tag: tags.list, color: "var(--color-ink-tertiary)" },

  /* 代码块内语言高亮 */
  { tag: tags.keyword, color: "var(--color-accent)" },
  { tag: tags.string, color: "var(--color-success)" },
  { tag: tags.comment, color: "var(--color-ink-tertiary)", fontStyle: "italic" },
  { tag: tags.number, color: "var(--color-ink-secondary)" },
  { tag: tags.bool, color: "var(--color-accent)" },
  { tag: tags.operator, color: "var(--color-ink-secondary)" },
  { tag: tags.function(tags.variableName), color: "var(--color-accent-strong)" },
  { tag: tags.function(tags.propertyName), color: "var(--color-accent-strong)" },
  { tag: tags.typeName, color: "var(--color-accent)" },
  { tag: tags.className, color: "var(--color-accent)" },
  { tag: tags.propertyName, color: "var(--color-ink)" },
  { tag: tags.definitionKeyword, color: "var(--color-accent)" },
  { tag: tags.tagName, color: "var(--color-accent)" },
  { tag: tags.attributeName, color: "var(--color-ink-secondary)" },
  { tag: tags.escape, color: "var(--color-accent)" },
  { tag: tags.regexp, color: "var(--color-success)" },
  { tag: tags.variableName, color: "var(--color-ink)" },
  { tag: tags.invalid, color: "#e5484d" },
]);

/** 分栏源码侧的完整样式扩展 */
export const sourceHighlighting = syntaxHighlighting(markdownHighlightStyle);
