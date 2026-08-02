import type { Course, NoteMeta } from "../types";

/* 阶段一的模拟数据，阶段三接入真实文件系统后移除 */

/** 生成相对当前时间的时间戳，保证示例数据看起来「新鲜」 */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60);
}

export const mockCourses: Course[] = [
  {
    id: "course-os",
    name: "操作系统",
    slug: "operating-system",
    color: "#6d7cf6",
    teacher: "陈老师",
    location: "教三 201",
    schedule: "周二 3-4 节 / 周五 1-2 节",
    semester: "2026 春",
    examDate: "2026-08-15",
    createdAt: minutesAgo(60 * 24 * 60),
    updatedAt: hoursAgo(2),
  },
  {
    id: "course-ds",
    name: "数据结构",
    slug: "data-structures",
    color: "#7fb069",
    teacher: "刘老师",
    semester: "2026 春",
    createdAt: minutesAgo(60 * 24 * 60),
    updatedAt: hoursAgo(3),
  },
  {
    id: "course-cn",
    name: "计算机网络",
    slug: "computer-network",
    color: "#5aa9a6",
    teacher: "周老师",
    location: "教一 305",
    semester: "2026 春",
    createdAt: minutesAgo(60 * 24 * 60),
    updatedAt: hoursAgo(26),
  },
  {
    id: "course-es",
    name: "嵌入式系统",
    slug: "embedded-system",
    color: "#d9a05b",
    teacher: "吴老师",
    semester: "2026 春",
    createdAt: minutesAgo(60 * 24 * 60),
    updatedAt: hoursAgo(50),
  },
];

export const mockNotes: NoteMeta[] = [
  // 操作系统
  {
    id: "note-os-thread",
    courseId: "course-os",
    title: "进程与线程",
    fileName: "process-and-thread.md",
    relativePath: "notes/operating-system/process-and-thread.md",
    summary: "进程与线程的区别、上下文切换开销、线程共享的地址空间",
    createdAt: hoursAgo(50),
    updatedAt: hoursAgo(2),
    wordCount: 1286,
    pinned: true,
  },
  {
    id: "note-os-sync",
    courseId: "course-os",
    title: "进程同步与互斥",
    fileName: "process-synchronization.md",
    relativePath: "notes/operating-system/process-synchronization.md",
    summary: "临界区、信号量、管程、生产者消费者问题",
    createdAt: hoursAgo(80),
    updatedAt: hoursAgo(9),
    wordCount: 2043,
    pinned: true,
  },
  {
    id: "note-os-deadlock",
    courseId: "course-os",
    title: "死锁",
    fileName: "deadlock.md",
    relativePath: "notes/operating-system/deadlock.md",
    summary: "四个必要条件、银行家算法、死锁检测与解除",
    createdAt: hoursAgo(120),
    updatedAt: hoursAgo(30),
    wordCount: 1548,
    pinned: false,
  },
  {
    id: "note-os-memory",
    courseId: "course-os",
    title: "内存管理",
    fileName: "memory-management.md",
    relativePath: "notes/operating-system/memory-management.md",
    summary: "分页、分段、虚拟内存、缺页中断与页面置换",
    createdAt: hoursAgo(150),
    updatedAt: hoursAgo(54),
    wordCount: 1872,
    pinned: false,
  },
  {
    id: "note-os-fs",
    courseId: "course-os",
    title: "文件系统",
    fileName: "file-system.md",
    relativePath: "notes/operating-system/file-system.md",
    summary: "inode、目录结构、页缓存与磁盘调度",
    createdAt: hoursAgo(200),
    updatedAt: hoursAgo(100),
    wordCount: 1120,
    pinned: false,
  },
  // 数据结构
  {
    id: "note-ds-tree",
    courseId: "course-ds",
    title: "二叉树遍历",
    fileName: "binary-tree-traversal.md",
    relativePath: "notes/data-structures/binary-tree-traversal.md",
    summary: "前中后序遍历、层序遍历、递归与迭代实现",
    createdAt: hoursAgo(60),
    updatedAt: hoursAgo(3),
    wordCount: 983,
    pinned: true,
  },
  {
    id: "note-ds-quicksort",
    courseId: "course-ds",
    title: "快速排序",
    fileName: "quick-sort.md",
    relativePath: "notes/data-structures/quick-sort.md",
    summary: "划分过程、平均与最坏复杂度、退化与优化",
    createdAt: hoursAgo(90),
    updatedAt: hoursAgo(28),
    wordCount: 764,
    pinned: false,
  },
  {
    id: "note-ds-graph",
    courseId: "course-ds",
    title: "图的最短路径",
    fileName: "shortest-path.md",
    relativePath: "notes/data-structures/shortest-path.md",
    summary: "Dijkstra 与 Floyd 算法、适用场景对比",
    createdAt: hoursAgo(130),
    updatedAt: hoursAgo(60),
    wordCount: 1345,
    pinned: false,
  },
  {
    id: "note-ds-hash",
    courseId: "course-ds",
    title: "哈希表",
    fileName: "hash-table.md",
    relativePath: "notes/data-structures/hash-table.md",
    summary: "哈希函数、冲突处理（链地址/开放定址）、负载因子",
    createdAt: hoursAgo(180),
    updatedAt: hoursAgo(90),
    wordCount: 1021,
    pinned: false,
  },
  // 计算机网络
  {
    id: "note-cn-tcp",
    courseId: "course-cn",
    title: "TCP 三次握手",
    fileName: "tcp-three-way-handshake.md",
    relativePath: "notes/computer-network/tcp-three-way-handshake.md",
    summary: "状态变迁、SYN 洪泛攻击、半连接队列",
    createdAt: hoursAgo(70),
    updatedAt: hoursAgo(26),
    wordCount: 1129,
    pinned: false,
  },
  {
    id: "note-cn-subnet",
    courseId: "course-cn",
    title: "子网划分",
    fileName: "subnetting.md",
    relativePath: "notes/computer-network/subnetting.md",
    summary: "CIDR 记法、VLSM、子网掩码计算",
    createdAt: hoursAgo(140),
    updatedAt: hoursAgo(72),
    wordCount: 856,
    pinned: false,
  },
  {
    id: "note-cn-http",
    courseId: "course-cn",
    title: "HTTP / HTTPS",
    fileName: "http-https.md",
    relativePath: "notes/computer-network/http-https.md",
    summary: "请求报文结构、状态码、TLS 握手流程",
    createdAt: hoursAgo(220),
    updatedAt: hoursAgo(120),
    wordCount: 1677,
    pinned: false,
  },
  // 嵌入式系统
  {
    id: "note-es-i2c",
    courseId: "course-es",
    title: "I2C 通信",
    fileName: "i2c.md",
    relativePath: "notes/embedded-system/i2c.md",
    summary: "起始/停止条件、寻址、应答、仲裁与时钟同步",
    createdAt: hoursAgo(100),
    updatedAt: hoursAgo(50),
    wordCount: 942,
    pinned: false,
  },
  {
    id: "note-es-gpio",
    courseId: "course-es",
    title: "GPIO 中断",
    fileName: "gpio-interrupt.md",
    relativePath: "notes/embedded-system/gpio-interrupt.md",
    summary: "边沿触发与电平触发、中断服务程序注意事项",
    createdAt: hoursAgo(160),
    updatedAt: hoursAgo(76),
    wordCount: 811,
    pinned: false,
  },
];

/** 编辑器占位内容；阶段二接入 CodeMirror 后移除 */
const noteContents: Record<string, string> = {
  "note-os-thread": `# 进程与线程

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

int main(void) {
    pthread_t tid;
    pthread_create(&tid, NULL, worker, NULL);
    pthread_join(tid, NULL);
    return 0;
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
  "note-os-sync": `# 进程同步与互斥

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

/** 未提供占位内容的笔记使用通用模板 */
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

export function contentFor(noteId: string, title: string): string {
  return noteContents[noteId] ?? genericContent(title);
}
