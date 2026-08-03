import { invoke } from "@tauri-apps/api/core";
import { buildDemoScan, demoContent } from "./demo-data";
import { hashContent } from "./hash";

/**
 * 文件系统适配层（阶段三）：
 * - Tauri 桌面模式：invoke 调用 Rust 命令（真实磁盘读写）
 * - 浏览器 dev 模式（无 __TAURI_INTERNALS__）：localStorage 模拟，
 *   数据结构与 Rust 返回值一致，保证 npm run dev 可完整验证
 *
 * Rust 命令参数为 snake_case，前端统一传 camelCase（Tauri 自动映射）。
 */

// ---- 与 Rust 侧 serde 序列化对应的 JSON 类型（camelCase） ----

export interface CourseMetaJson {
  id: string;
  name: string;
  slug: string;
  color: string;
  teacher: string | null;
  location: string | null;
  schedule: string | null;
  semester: string | null;
  examDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEntryJson {
  id: string;
  courseSlug: string;
  title: string;
  fileName: string;
  relativePath: string;
  head: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface ScanResult {
  courses: CourseMetaJson[];
  notes: NoteEntryJson[];
}

/** 选中并初始化工作区后的结果（对应 Rust WorkspaceOpened） */
export interface WorkspaceOpened {
  path: string;
  scan: ScanResult;
}

export interface NoteReadResult {
  content: string;
  hash: number;
}

export interface WriteNoteResult {
  status: "ok" | "conflict";
  hash: number;
}

/** 课程更新补丁：省略的字段不修改（Rust Option 语义），空字符串 = 清空 */
export interface CoursePatch {
  name?: string;
  color?: string;
  teacher?: string;
  location?: string;
  schedule?: string;
  semester?: string;
  examDate?: string;
}

/** 与 Rust COURSE_COLORS 一致的默认色板（browser fallback 轮换使用） */
const COURSE_COLORS = ["#6d7cf6", "#7fb069", "#5aa9a6", "#d9a05b"];

/** 课程名 → slug（与 Rust slugify 同规则：Unicode 字母数字保留，其余转 -） */
export function slugify(name: string): string {
  const collapsed = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return collapsed || "untitled";
}

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// ---------- 浏览器 fallback：localStorage 模拟 ----------

const LS_RECENT = "lynnnote:recent";
const LS_WS_PREFIX = "lynnnote:ws:";
const LS_CONTENT_PREFIX = "lynnnote:content:";

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function lsWsKey(path: string): string {
  return `${LS_WS_PREFIX}${path}`;
}

function lsContentKey(relativePath: string): string {
  return `${LS_CONTENT_PREFIX}${relativePath}`;
}

function lsGetWs(path: string): ScanResult | null {
  const raw = lsGet(lsWsKey(path));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScanResult;
  } catch {
    return null;
  }
}

function lsSaveWs(path: string, scan: ScanResult): void {
  lsSet(lsWsKey(path), JSON.stringify(scan));
}

/** 浏览器模式初始化演示工作区（等价于 init_workspace） */
function lsInitDemoWorkspace(): ScanResult {
  const scan = buildDemoScan();
  // 把两篇示例全文写入 localStorage，其余在读取时用模板兜底
  for (const note of scan.notes) {
    const full = demoContent(note.relativePath, note.title);
    if (!lsGet(lsContentKey(note.relativePath))) {
      lsSet(lsContentKey(note.relativePath), full);
    }
  }
  lsSaveWs(DEMO_PATH, scan);
  return scan;
}

const DEMO_PATH = "demo";

function lsPickWorkspace(): WorkspaceOpened {
  const scan = lsGetWs(DEMO_PATH) ?? lsInitDemoWorkspace();
  return { path: DEMO_PATH, scan };
}

// ---------- 统一 API（Tauri / 浏览器双实现） ----------

export interface Fs {
  /** 选择并初始化工作区；用户取消返回 null */
  pickWorkspace: () => Promise<WorkspaceOpened | null>;
  /** 扫描指定工作区 */
  scanWorkspace: (path: string) => Promise<ScanResult>;
  readNote: (workspace: string, relativePath: string) => Promise<NoteReadResult>;
  writeNote: (
    workspace: string,
    relativePath: string,
    content: string,
    expectedHash?: number,
  ) => Promise<WriteNoteResult>;
  createNote: (
    workspace: string,
    courseSlug: string,
    title: string,
  ) => Promise<NoteEntryJson>;
  renameNote: (
    workspace: string,
    relativePath: string,
    newTitle: string,
  ) => Promise<NoteEntryJson>;
  deleteNote: (workspace: string, relativePath: string) => Promise<void>;
  createCourse: (workspace: string, name: string) => Promise<CourseMetaJson>;
  updateCourse: (
    workspace: string,
    id: string,
    patch: CoursePatch,
  ) => Promise<CourseMetaJson>;
  deleteCourse: (workspace: string, id: string) => Promise<void>;
  loadRecent: () => Promise<string[]>;
  saveRecent: (path: string) => Promise<void>;
}

export const fs: Fs = isTauri
  ? {
      pickWorkspace: () => invoke<WorkspaceOpened | null>("pick_workspace"),
      scanWorkspace: (path) => invoke<ScanResult>("scan_workspace", { path }),
      readNote: (workspace, relativePath) =>
        invoke<NoteReadResult>("read_note", { workspace, relativePath }),
      writeNote: (workspace, relativePath, content, expectedHash) =>
        invoke<WriteNoteResult>("write_note", {
          workspace,
          relativePath,
          content,
          expectedHash,
        }),
      createNote: (workspace, courseSlug, title) =>
        invoke<NoteEntryJson>("create_note", { workspace, courseSlug, title }),
      renameNote: (workspace, relativePath, newTitle) =>
        invoke<NoteEntryJson>("rename_note", {
          workspace,
          relativePath,
          newTitle,
        }),
      deleteNote: (workspace, relativePath) =>
        invoke<void>("delete_note", { workspace, relativePath }),
      createCourse: (workspace, name) =>
        invoke<CourseMetaJson>("create_course", { workspace, name }),
      updateCourse: (workspace, id, patch) =>
        invoke<CourseMetaJson>("update_course", { workspace, id, ...patch }),
      deleteCourse: (workspace, id) =>
        invoke<void>("delete_course", { workspace, id }),
      loadRecent: () => invoke<string[]>("load_recent"),
      saveRecent: (path) => invoke<void>("save_recent", { path }),
    }
  : {
      pickWorkspace: async () => lsPickWorkspace(),
      scanWorkspace: async (path) => {
        if (path === DEMO_PATH) return lsGetWs(DEMO_PATH) ?? lsInitDemoWorkspace();
        const scan = lsGetWs(path);
        if (!scan) throw new Error("工作区不存在：" + path);
        return scan;
      },
      readNote: async (_workspace, relativePath) => {
        const title =
          relativePath
            .split("/")
            .pop()
            ?.replace(/\.md$/, "")
            .replace(/-/g, " ") ?? "未命名笔记";
        const content =
          lsGet(lsContentKey(relativePath)) ?? demoContent(relativePath, title);
        return { content, hash: hashContent(content) };
      },
      writeNote: async (_workspace, relativePath, content, expectedHash) => {
        const current = lsGet(lsContentKey(relativePath)) ?? "";
        if (expectedHash !== undefined && hashContent(current) !== expectedHash) {
          return { status: "conflict", hash: hashContent(current) };
        }
        lsSet(lsContentKey(relativePath), content);
        return { status: "ok", hash: hashContent(content) };
      },
      createNote: async (_workspace, courseSlug, title) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        const fileName = `${title.replace(/[\\/:*?"<>|\n\r\t]/g, "-")}.md`;
        const rel = `notes/${courseSlug}/${fileName}`;
        if (scan.notes.some((n) => n.relativePath === rel)) {
          throw new Error("同名笔记已存在");
        }
        const content = `# ${title}\n`;
        lsSet(lsContentKey(rel), content);
        const entry: NoteEntryJson = {
          id: rel,
          courseSlug,
          title,
          fileName,
          relativePath: rel,
          head: content.slice(0, 200),
          wordCount: content.replace(/\s/g, "").length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
        };
        scan.notes.push(entry);
        lsSaveWs(path, scan);
        return entry;
      },
      renameNote: async (_workspace, relativePath, newTitle) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        const note = scan.notes.find((n) => n.relativePath === relativePath);
        if (!note) throw new Error("笔记不存在");
        const fileName = `${newTitle.replace(/[\\/:*?"<>|\n\r\t]/g, "-")}.md`;
        const rel = `notes/${note.courseSlug}/${fileName}`;
        if (scan.notes.some((n) => n.relativePath === rel)) {
          throw new Error("同名笔记已存在");
        }
        const content = lsGet(lsContentKey(relativePath)) ?? "";
        lsSet(lsContentKey(rel), content);
        lsSet(lsContentKey(relativePath), "");
        note.fileName = fileName;
        note.relativePath = rel;
        note.id = rel;
        note.title = newTitle;
        note.updatedAt = new Date().toISOString();
        lsSaveWs(path, scan);
        return { ...note };
      },
      deleteNote: async (_workspace, relativePath) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        scan.notes = scan.notes.filter((n) => n.relativePath !== relativePath);
        lsSaveWs(path, scan);
        localStorage.removeItem(lsContentKey(relativePath));
      },
      createCourse: async (_workspace, name) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        const base = slugify(name);
        let slug = base;
        let n = 2;
        while (scan.courses.some((c) => c.slug === slug)) {
          slug = `${base}-${n}`;
          n += 1;
        }
        const now = new Date().toISOString();
        const course: CourseMetaJson = {
          id: slug,
          name: name.trim(),
          slug,
          color: COURSE_COLORS[scan.courses.length % COURSE_COLORS.length],
          teacher: null,
          location: null,
          schedule: null,
          semester: null,
          examDate: null,
          createdAt: now,
          updatedAt: now,
        };
        scan.courses.push(course);
        lsSaveWs(path, scan);
        return course;
      },
      updateCourse: async (_workspace, id, patch) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        const course = scan.courses.find((c) => c.id === id);
        if (!course) throw new Error("课程不存在");
        if (patch.name !== undefined) {
          const trimmed = patch.name.trim();
          if (!trimmed) throw new Error("课程名称不能为空");
          course.name = trimmed;
        }
        if (patch.color !== undefined && patch.color !== "") course.color = patch.color;
        if (patch.teacher !== undefined) course.teacher = patch.teacher;
        if (patch.location !== undefined) course.location = patch.location;
        if (patch.schedule !== undefined) course.schedule = patch.schedule;
        if (patch.semester !== undefined) course.semester = patch.semester;
        if (patch.examDate !== undefined) course.examDate = patch.examDate;
        course.updatedAt = new Date().toISOString();
        lsSaveWs(path, scan);
        return { ...course };
      },
      deleteCourse: async (_workspace, id) => {
        const path = DEMO_PATH;
        const scan = lsGetWs(path) ?? lsInitDemoWorkspace();
        const course = scan.courses.find((c) => c.id === id);
        if (!course) throw new Error("课程不存在");
        scan.courses = scan.courses.filter((c) => c.id !== id);
        // 移除该课程全部笔记（含内容缓存）
        const removed = scan.notes.filter((n) => n.courseSlug === course.slug);
        scan.notes = scan.notes.filter((n) => n.courseSlug !== course.slug);
        for (const note of removed) {
          localStorage.removeItem(lsContentKey(note.relativePath));
        }
        lsSaveWs(path, scan);
      },
      loadRecent: async () => {
        const raw = lsGet(LS_RECENT);
        return raw ? (JSON.parse(raw) as string[]) : [];
      },
      saveRecent: async (path) => {
        const list = (await fs.loadRecent()).filter((p) => p !== path);
        list.unshift(path);
        lsSet(LS_RECENT, JSON.stringify(list.slice(0, 10)));
      },
    };
