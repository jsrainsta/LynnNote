import { memo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import { useEditorStore } from "../../stores/useEditorStore";

/**
 * Markdown 渲染（纯预览 / 分栏右侧共用）。
 * 安全要求（规范 §24）：rehype-sanitize 防 XSS——默认 GitHub 规则基础上，
 * 放行 KaTeX 输出的 MathML 标签与 highlight.js 的 hljs-* 类名。
 * 阶段八：公式/代码高亮开关（规范 §20 Markdown 组）、源码→预览同步滚动。
 */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "math",
    "semantics",
    "mrow",
    "mfrac",
    "msqrt",
    "mroot",
    "msub",
    "msup",
    "msubsup",
    "munder",
    "mover",
    "munderover",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "mspace",
    "mpadded",
    "mphantom",
    "menclose",
    "merror",
    "mstyle",
    "mtable",
    "mtr",
    "mtd",
    "mmultiscripts",
    "mprescripts",
    "annotation",
    "annotation-xml",
  ],
  attributes: {
    ...defaultSchema.attributes,
    math: [["className", /^katex/], ["xmlns"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", /^(katex|hljs)/]],
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-|^hljs/]],
    pre: [...(defaultSchema.attributes?.pre ?? []), ["className", /^hljs/]],
  },
};

interface MarkdownPreviewProps {
  content: string;
  /** 阶段八：是否启用公式渲染（remark-math + rehype-katex） */
  enableMath?: boolean;
  /** 阶段八：是否启用代码高亮（rehype-highlight） */
  enableCodeHighlight?: boolean;
  /** 阶段八：源码→预览同步滚动（分栏模式） */
  syncScroll?: boolean;
}

/** Markdown 渲染组件：内容变化时只重算该组件，memo 避免多余渲染 */
export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  enableMath = true,
  enableCodeHighlight = true,
  syncScroll = false,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 同步滚动：订阅源码侧滚动信息（editorScroll），按滚动比例移动预览容器。
  // 用 store 订阅 + rAF，避免每次滚动触发 React 重渲染。
  useEffect(() => {
    if (!syncScroll) return;
    let raf = 0;
    const unsub = useEditorStore.subscribe((s, prev) => {
      const t = s.editorScroll;
      const p = prev.editorScroll;
      if (!t || !p || t.noteId !== p.noteId) return;
      if (t.scrollTop === p.scrollTop && t.scrollHeight === p.scrollHeight) return;
      const el = containerRef.current;
      if (!el) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ratio = t.scrollHeight > 0 ? t.scrollTop / t.scrollHeight : 0;
        el.scrollTop = ratio * el.scrollHeight;
      });
    });
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [syncScroll]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-panel"
      aria-label="Markdown 预览"
    >
      <article className="ln-prose mx-auto min-h-full max-w-[72ch] px-6 py-5">
        <ReactMarkdown
          remarkPlugins={enableMath ? [remarkGfm, remarkMath] : [remarkGfm]}
          rehypePlugins={[
            ...(enableMath ? [rehypeKatex] : []),
            ...(enableCodeHighlight ? [rehypeHighlight] : []),
            // sanitize 必须最后执行（清理前面插件产生的 HTML）
            [rehypeSanitize, sanitizeSchema],
          ]}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
});
