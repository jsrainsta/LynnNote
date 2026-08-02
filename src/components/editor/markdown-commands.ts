import { EditorView, keymap } from "@codemirror/view";
import type { KeyBinding } from "@codemirror/view";

/**
 * 编辑快捷键命令（Ctrl+B / Ctrl+I / Ctrl+K）。
 * 纯函数操作 view，不依赖 React 状态，可直接放进 CM6 keymap。
 */

/** 切换行内标记：选区已带标记则去除，否则包裹；无选区时插入一对标记并把光标放中间 */
function toggleInlineMark(view: EditorView, marker: string): boolean {
  const { from, to } = view.state.selection.main;
  const markerLen = marker.length;

  if (from === to) {
    view.dispatch({
      changes: { from, insert: marker + marker },
      selection: { anchor: from + markerLen },
    });
    return true;
  }

  const text = view.state.sliceDoc(from, to);
  if (text.startsWith(marker) && text.endsWith(marker) && text.length >= markerLen * 2) {
    view.dispatch({
      changes: {
        from,
        to,
        insert: text.slice(markerLen, text.length - markerLen),
      },
      selection: { anchor: from, head: to - markerLen * 2 },
    });
  } else {
    view.dispatch({
      changes: [
        { from, insert: marker },
        { from: to, insert: marker },
      ],
      selection: { anchor: from + markerLen, head: to + markerLen },
    });
  }
  return true;
}

/** 插入链接：选中文字作为链接文本，否则用占位文字，光标落在链接文本末尾 */
function insertLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const linkText = view.state.sliceDoc(from, to) || "链接";
  const insert = `[${linkText}](https://)`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  });
  return true;
}

/** 常用格式快捷键（与 CM6 内置键位不冲突） */
export function markdownKeymap(): KeyBinding[] {
  return [
    { key: "Mod-b", run: (view) => toggleInlineMark(view, "**") },
    { key: "Mod-i", run: (view) => toggleInlineMark(view, "*") },
    { key: "Mod-k", run: insertLink },
  ];
}

/** 供其他模块引用的 keymap 扩展 */
export const markdownKeymapExtension = keymap.of(markdownKeymap());
