/**
 * 全文搜索工具（阶段八，规范 §17）。
 * 搜索结果定位复用阶段七的 locate 机制（useEditorActionStore.requestLocate）。
 */

/** 从内容中提取匹配位置附近的一段文本（含省略号），供结果列表展示 */
export function makeSnippet(content: string, offset: number, radius = 42): string {
  const start = Math.max(0, offset - radius);
  const end = Math.min(content.length, offset + radius);
  let text = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) text = `…${text}`;
  if (end < content.length) text = `${text}…`;
  return text;
}

/** 大小写不敏感查找子串，返回偏移；找不到返回 -1 */
export function indexOfIgnoreCase(content: string, query: string): number {
  return content.toLowerCase().indexOf(query.toLowerCase());
}
