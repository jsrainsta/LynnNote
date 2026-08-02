import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";

/**
 * Markdown 渲染（纯预览 / 分栏右侧共用）。
 * 安全要求（规范 §24）：rehype-sanitize 防 XSS——默认 GitHub 规则基础上，
 * 放行 KaTeX 输出的 MathML 标签与 highlight.js 的 hljs-* 类名。
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
}

/** Markdown 渲染组件：内容变化时只重算该组件，memo 避免多余渲染 */
export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-panel" aria-label="Markdown 预览">
      <article className="ln-prose mx-auto min-h-full max-w-[72ch] px-6 py-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeKatex,
            rehypeHighlight,
            [rehypeSanitize, sanitizeSchema],
          ]}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
});
