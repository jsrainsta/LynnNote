import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import katex from "katex";

/**
 * 数学公式实时渲染（补充 @atomic-editor/editor 不支持的部分）。
 *
 * 用正则找出 $...$（行内）与 $$...$$（块级），替换为 KaTeX widget；
 * 光标位于公式内（含紧邻边界）或公式位于代码块中时不渲染，保留原始文本。
 * 渲染失败时回退为原始文本，绝不丢失内容。
 */

/** 数学公式匹配：块级优先；行内要求首尾都不是空白，降低货币符号误匹配 */
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$(?!\s)([^\n$]+?)(?<!\s)\$/g;

class MathWidget extends WidgetType {
  constructor(
    private readonly latex: string,
    private readonly display: boolean,
  ) {
    super();
  }

  eq(other: MathWidget): boolean {
    return other.latex === this.latex && other.display === this.display;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.display ? "ln-math ln-math-display" : "ln-math ln-math-inline";
    try {
      span.innerHTML = katex.renderToString(this.latex, {
        displayMode: this.display,
        throwOnError: false,
      });
    } catch {
      span.textContent = this.display ? `$$${this.latex}$$` : `$${this.latex}$`;
    }
    return span;
  }

  /** 点击穿透给编辑器，让光标能落在公式两侧进入编辑态 */
  ignoreEvent(): boolean {
    return false;
  }
}

/** 位置是否处于代码块/行内代码内（其中的 $ 不应渲染为公式） */
function isInsideCode(view: EditorView, pos: number): boolean {
  const tree = syntaxTree(view.state);
  let node: SyntaxNode | null = tree.resolveInner(pos, 1);
  while (node) {
    const name = node.name;
    if (name === "FencedCode" || name === "InlineCode" || name === "CodeText") {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function computeMathDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  const head = view.state.selection.main.head;

  MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RE.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    if (isInsideCode(view, from)) continue;

    const display = m[1] !== undefined;
    const latex = (display ? m[1] : m[2]) ?? "";
    // 光标在公式范围内（或紧贴边界）时揭示原始文本以便编辑
    if (head >= from && head <= to) continue;

    builder.add(from, to, Decoration.replace({ widget: new MathWidget(latex, display) }));
  }
  return builder.finish();
}

const mathDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = computeMathDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = computeMathDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

/** 数学公式渲染扩展（仅用于实时预览模式） */
export function mathWidgetExtension(): Extension {
  return mathDecorationPlugin;
}
