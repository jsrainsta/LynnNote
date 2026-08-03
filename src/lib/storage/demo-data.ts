import type { CourseMetaJson, NoteEntryJson, ScanResult } from "./fs";

/**
 * 浏览器 dev 模式（非 Tauri）的演示工作区数据。
 * 等价于阶段一 mock 的用途：让 npm run dev 里能看到内容并完整走通流程。
 * Tauri 桌面模式不经过这里，数据来自真实文件系统。
 */

const COURSES: Array<{
  slug: string;
  name: string;
  color: string;
  teacher?: string;
}> = [
  { slug: "operating-system", name: "操作系统", color: "#6d7cf6", teacher: "陈老师" },
  { slug: "data-structures", name: "数据结构", color: "#7fb069", teacher: "刘老师" },
  { slug: "computer-network", name: "计算机网络", color: "#5aa9a6", teacher: "周老师" },
  { slug: "embedded-system", name: "嵌入式系统", color: "#d9a05b", teacher: "吴老师" },
];

/** 每个笔记：slug、文件名（决定 relativePath）、标题、摘要、置顶 */
const NOTES: Array<{
  course: string;
  file: string;
  title: string;
  summary: string;
  pinned?: boolean;
}> = [
  {
    course: "operating-system",
    file: "process-and-thread.md",
    title: "进程与线程",
    summary: "进程与线程的区别、上下文切换开销、线程共享的地址空间",
    pinned: true,
  },
  {
    course: "operating-system",
    file: "process-synchronization.md",
    title: "进程同步与互斥",
    summary: "临界区、信号量、管程、生产者消费者问题",
  },
  {
    course: "operating-system",
    file: "deadlock.md",
    title: "死锁",
    summary: "四个必要条件、银行家算法、死锁检测与解除",
  },
  {
    course: "data-structures",
    file: "binary-tree-traversal.md",
    title: "二叉树遍历",
    summary: "前中后序遍历、层序遍历、递归与迭代实现",
    pinned: true,
  },
  {
    course: "data-structures",
    file: "quick-sort.md",
    title: "快速排序",
    summary: "划分过程、平均与最坏复杂度、退化与优化",
  },
  {
    course: "computer-network",
    file: "tcp-three-way-handshake.md",
    title: "TCP 三次握手",
    summary: "状态变迁、SYN 洪泛攻击、半连接队列",
  },
  {
    course: "computer-network",
    file: "subnetting.md",
    title: "子网划分",
    summary: "CIDR 记法、VLSM、子网掩码计算",
  },
  {
    course: "embedded-system",
    file: "i2c.md",
    title: "I2C 通信",
    summary: "起始/停止条件、寻址、应答、仲裁与时钟同步",
  },
];

/** 完整内容仅保留两篇示例（覆盖公式、代码、表格），其余用通用模板 */
const FULL_CONTENTS: Record<string, string> = {
  "notes/operating-system/process-and-thread.md": `# 进程与线程

> 日期：2026-08-02
> 课程：操作系统

## 本节重点

- 进程是**资源分配**的基本单位
- 线程是 **CPU 调度**的基本单位
- 同一进程的线程共享地址空间，切换开销更小

## 课堂内容

### 进程的定义

进程是程序的一次执行过程，包含代码、数据、堆、栈以及内核中的 **PCB**（进程控制块）。

### 进程与线程的区别

| 维度 | 进程 | 线程 |
| ---- | ---- | ---- |
| 资源 | 独立地址空间 | 共享进程资源 |
| 切换 | 开销大 | 开销小 |
| 通信 | 需要 IPC 机制 | 共享内存即可 |

### 代码示例

\`\`\`c
void *worker(void *arg) {
    printf("hello from thread\\n");
    return NULL;
}
\`\`\`

## 没听懂的问题

> [!QUESTION]
> 为什么上下文切换的代价这么大？线程切换真的不需要进入内核吗？

## 公式

$$ T_{total} = n \\times (t_{switch} + t_{run}) $$

## 课后复习

- [ ] 整理本节笔记
- [ ] 完成课后作业第 3、4 题
`,
  "notes/operating-system/process-synchronization.md": `# 进程同步与互斥

> 日期：2026-08-01
> 课程：操作系统

## 本节重点

- 临界区：一次只允许一个进程进入的代码区域
- 信号量的初值表示可用资源数量
- 管程把同步原语封装在对象内部

## 课堂内容

### 信号量

P 操作（wait）将信号量减一，S < 0 时阻塞；V 操作（signal）将信号量加一，并唤醒一个等待进程。

> [!QUESTION]
> 信号量初值为什么可以大于 1？大于 1 时它表示什么？

## 课后复习

- [ ] 手写生产者消费者问题
- [ ] 复习经典同步问题
`,
};

function genericContent(title: string): string {
  return `# ${title}

## 本节重点

-

## 课堂内容

###

## 没听懂的问题

> [!QUESTION]
>

## 课后复习

- [ ] 整理本节笔记
`;
}

/** 构造演示工作区的扫描结果（时间戳取固定值，保证刷新后显示稳定） */
export function buildDemoScan(): ScanResult {
  const now = new Date("2026-08-02T12:00:00Z").toISOString();
  const courses: CourseMetaJson[] = COURSES.map((c) => ({
    id: c.slug,
    name: c.name,
    slug: c.slug,
    color: c.color,
    teacher: c.teacher ?? null,
    location: null,
    schedule: null,
    semester: null,
    examDate: null,
    createdAt: now,
    updatedAt: now,
  }));
  const notes: NoteEntryJson[] = NOTES.map((n) => {
    const rel = `notes/${n.course}/${n.file}`;
    const content = FULL_CONTENTS[rel] ?? genericContent(n.title);
    return {
      id: rel,
      courseSlug: n.course,
      title: n.title,
      fileName: n.file,
      relativePath: rel,
      head: content.slice(0, 200),
      wordCount: content.replace(/\s/g, "").length,
      createdAt: now,
      updatedAt: now,
      pinned: n.pinned ?? false,
    };
  });
  return { courses, notes };
}

/** 按 relativePath 返回演示内容（供浏览器 fallback 的 readNote 使用） */
export function demoContent(relativePath: string, title: string): string {
  return FULL_CONTENTS[relativePath] ?? genericContent(title);
}
