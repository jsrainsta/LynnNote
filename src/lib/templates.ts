/**
 * 笔记模板（规范 §12）：内置 4 种 + 自定义模板变量替换。
 * 自定义模板的增删改持久化在 Rust 侧（工作区 templates.json），前端只负责
 * 渲染与变量替换；内置模板为前端常量。
 */

import type { NoteTemplateJson as NoteTemplate } from "./storage/fs";

export type { NoteTemplateJson as NoteTemplate } from "./storage/fs";

/** 内置模板 id 前缀（自定义模板 id 由后端时间戳生成，不会冲突） */
const BUILTIN_PREFIX = "builtin:";

const builtin = (id: string, name: string, content: string): NoteTemplate => ({
  id: `${BUILTIN_PREFIX}${id}`,
  name,
  content,
  updatedAt: "",
});

export const BUILTIN_TEMPLATES: NoteTemplate[] = [
  builtin("blank", "空白笔记", "# {{title}}"),
  builtin(
    "lecture",
    "课堂笔记",
    `# {{title}}

> 日期：{{date}}
> 课程：{{course}}

## 本节重点

-

## 课堂内容

###

## 没听懂的问题

> [!QUESTION]
>

## 课后复习

- [ ] 整理本节笔记
- [ ] 完成相关作业`,
  ),
  builtin(
    "lab",
    "实验记录",
    `# {{title}}

## 实验目的

## 实验环境

## 实验步骤

## 核心代码

\`\`\`text

\`\`\`

## 实验结果

## 遇到的问题

## 总结`,
  ),
  builtin(
    "mistake",
    "错题笔记",
    `# {{title}}

## 原题

## 我的答案

## 正确思路

## 错误原因

## 相关知识点

## 再做一次

- [ ] 已独立重新完成`,
  ),
];

/** 是否为内置模板（内置模板不可编辑/删除） */
export function isBuiltinTemplate(id: string): boolean {
  return id.startsWith(BUILTIN_PREFIX);
}

/** 模板变量替换：{{title}}/{{course}}/{{date}}；无 {{title}} 时把首个一级标题替换为标题 */
export function applyTemplate(
  content: string,
  vars: { title: string; courseName: string; date: string },
): string {
  let result = content.replaceAll("{{title}}", vars.title);
  result = result.replaceAll("{{course}}", vars.courseName);
  result = result.replaceAll("{{date}}", vars.date);

  // 模板没有 {{title}} 变量时（如"课堂笔记"占位 "# 课程主题"），
  // 将首个一级标题替换为实际标题，保证列表标题与文件一致
  if (!content.includes("{{title}}")) {
    result = result.replace(/^# .*$/m, `# ${vars.title}`);
  }
  return result;
}

/** 今天日期 YYYY-MM-DD（本地时区） */
export function todayDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
