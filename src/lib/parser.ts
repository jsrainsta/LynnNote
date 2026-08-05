/**
 * 疑问与复习卡片解析器（阶段七，规范 §14/§15）。
 * 纯函数、行级扫描：偏移量均为内容中的字符位置（行首），
 * 供"点击定位"时把光标移到标记行。
 *
 * 解析规则（刻意保守，避免误识别普通文本）：
 * - 疑问：行首 `> [!QUESTION]`（可带 `solved` 后缀），随后连续的 `> ` 引用行合并为问题文本
 * - 卡片：行首 `Q: 文本`，随后**连续**的 `A: 文本` 行为答案（空行或非 A: 行即结束）
 */

export interface ParsedQuestion {
  /** 问题文本（合并引用行，已去 `> ` 前缀） */
  text: string;
  /** `> [!QUESTION] solved` 视为已解决 */
  solved: boolean;
  /** 标记行在内容中的起始偏移 */
  offset: number;
}

export interface ParsedCard {
  question: string;
  /** 多个 A: 行以换行连接；无 A: 行为空字符串 */
  answer: string;
  /** `Q:` 行起始偏移 */
  offset: number;
}

const QUESTION_MARKER = /^>\s*\[!QUESTION\](\s+solved)?\s*$/i;
const QUOTE_BODY = /^>\s?(.*)$/;
const CARD_Q = /^Q:\s*(.+)$/;
const CARD_A = /^A:\s*(.*)$/;

/**
 * 归一化换行：CRLF → LF。
 * 磁盘文件可能是 \r\n（外部编辑器/早期版本写入），而 JS 正则的 `.` 不匹配 \r，
 * 会导致 `Q:` 卡片行匹配失败；编辑器内容则统一为 \n。归一化后
 * 解析、偏移、定位全部处于同一坐标系。
 */
export function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

/** 解析疑问标记：`> [!QUESTION]` + 连续引用行 */
export function parseQuestions(raw: string): ParsedQuestion[] {
  const content = normalizeNewlines(raw);
  const lines = content.split("\n");
  const out: ParsedQuestion[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(QUESTION_MARKER);
    if (m) {
      // 收集后续连续的引用行作为问题文本
      let j = i + 1;
      const parts: string[] = [];
      // 连续引用行是问题文本；遇到下一个标记或非引用行即停止
      while (j < lines.length && !QUESTION_MARKER.test(lines[j]) && QUOTE_BODY.test(lines[j])) {
        const body = lines[j].match(QUOTE_BODY)?.[1].trim() ?? "";
        if (body) parts.push(body);
        j++;
      }
      const text = parts.join(" ").trim();
      if (text) {
        out.push({ text, solved: Boolean(m[1]), offset });
      }
      i = j - 1;
    }
    offset += line.length + 1;
  }
  return out;
}

/** 解析复习卡片：`Q:` 行 + 连续 `A:` 行 */
export function parseCards(raw: string): ParsedCard[] {
  const content = normalizeNewlines(raw);
  const lines = content.split("\n");
  const out: ParsedCard[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(CARD_Q);
    if (m) {
      let j = i + 1;
      const parts: string[] = [];
      while (j < lines.length) {
        const am = lines[j].match(CARD_A);
        if (!am) break;
        if (am[1].trim()) parts.push(am[1].trim());
        j++;
      }
      const question = m[1].trim();
      if (question) {
        out.push({ question, answer: parts.join("\n"), offset });
      }
      i = j - 1;
    }
    offset += lines[i].length + 1;
  }
  return out;
}

/** 切换标记行的解决状态：`[!QUESTION]` ↔ `[!QUESTION] solved` */
export function toggleQuestionSolved(
  content: string,
  offset: number,
  solved: boolean,
): string {
  const lineEnd = content.indexOf("\n", offset);
  const end = lineEnd === -1 ? content.length : lineEnd;
  const line = content.slice(offset, end);
  const next = solved
    ? line.replace(/\[!QUESTION\]/i, "[!QUESTION] solved")
    : line.replace(/\[!QUESTION\]\s+solved/i, "[!QUESTION]");
  if (next === line) return content;
  return content.slice(0, offset) + next + content.slice(end);
}

/**
 * 从 offset 向前找最近的疑问标记行首。
 * 内容被编辑后索引里的 offset 可能漂移，用该函数就近重定位，
 * 找不到返回 null（调用方中止操作，避免改错行）。
 */
export function findNearestQuestionOffset(
  content: string,
  offset: number,
): number | null {
  const idx = content.lastIndexOf("[!QUESTION]", Math.min(offset, content.length));
  if (idx === -1) return null;
  const lineStart = content.lastIndexOf("\n", idx) + 1;
  const lineEnd = content.indexOf("\n", lineStart);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
  if (!/^>\s*\[!QUESTION\]/i.test(line)) return null;
  return lineStart;
}
