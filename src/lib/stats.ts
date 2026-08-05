/**
 * 专注模式统计（规范 §13："只统计本次模式开启期间的变化"）。
 * 计数口径复用阶段七的正式解析器（parseQuestions / parseCards），
 * 保证专注总结与疑问/卡片索引一致。
 */
import { parseCards, parseQuestions } from "./parser";

/** 非空白字符数（与 Rust word_count 口径一致） */
export function countNonWhitespace(content: string): number {
  return content.replace(/\s/g, "").length;
}

/** 问题标记数：`> [!QUESTION]` 解析结果数（含已解决） */
export function countQuestions(content: string): number {
  return parseQuestions(content).length;
}

/** 复习卡片数：`Q:`/`A:` 解析结果数 */
export function countCards(content: string): number {
  return parseCards(content).length;
}
