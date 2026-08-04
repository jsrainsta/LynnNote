/**
 * 专注模式统计（规范 §13："只统计本次模式开启期间的变化"）。
 * 轻量解析器：问题标记 [!QUESTION] 与复习卡片 Q: 的计数，
 * 阶段七会把解析扩展为正式索引（疑问列表 / 复习卡片）。
 */

/** 非空白字符数（与 Rust word_count 口径一致） */
export function countNonWhitespace(content: string): number {
  return content.replace(/\s/g, "").length;
}

/** 问题标记数：`> [!QUESTION]`（大小写不敏感） */
export function countQuestions(content: string): number {
  const m = content.match(/!question/gi);
  return m?.length ?? 0;
}

/** 复习卡片数：行首 `Q:`（连续 Q:/A: 行中的 Q 行） */
export function countCards(content: string): number {
  const m = content.match(/^\s*Q:\s?/gm);
  return m?.length ?? 0;
}
