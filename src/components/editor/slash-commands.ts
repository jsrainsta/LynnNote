import {
  EditorView,
  ViewPlugin,
  keymap,
  type KeyBinding,
  type ViewUpdate,
} from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { useSlashStore, type SlashCommand } from "../../stores/useSlashStore";

/**
 * 斜杠命令（规范 §10.3）：空行行首输入 `/` 弹出快捷菜单。
 * - 插件职责：检测行首 `/`（含查询词过滤）→ 同步到 useSlashStore；
 *   键盘 ↑/↓/Enter/Esc 拦截并操作 store
 * - 菜单渲染由 React 组件 SlashMenu 完成（fixed 定位），
 *   避免 AtomicEditor 重建 CM6 扩展时清掉插件内部 DOM
 */

export const SLASH_COMMANDS: SlashCommand[] = [
  { label: "标题1", template: "# " },
  { label: "标题2", template: "## " },
  { label: "标题3", template: "### " },
  { label: "无序列表", template: "- " },
  { label: "有序列表", template: "1. " },
  { label: "待办", template: "- [ ] " },
  { label: "引用", template: "> " },
  { label: "代码块", template: "```\n\n```", cursorOffset: 4 },
  { label: "行内公式", template: "$ $", cursorOffset: 2 },
  { label: "公式块", template: "$$\n\n$$", cursorOffset: 3 },
  {
    label: "表格",
    template: "| 列1 | 列2 |\n| --- | --- |\n|  |  |",
    cursorOffset: 8,
  },
  { label: "问题", template: "> [!QUESTION]\n> " },
  { label: "复习卡片", template: "Q: \nA: " },
  { label: "分割线", template: "---\n\n" },
];

const MENU_WIDTH = 176;

/** 光标前文本匹配 "行首(空白) / 查询词"，返回 `/` 的位置与查询词 */
function detectQuery(view: EditorView): { from: number; query: string } | null {
  const { head } = view.state.selection.main;
  const line = view.state.doc.lineAt(head);
  const beforeCursor = line.text.slice(0, head - line.from);
  const m = /^\s*\/([^\s/]*)$/.exec(beforeCursor);
  if (!m) return null;
  return { from: line.from + m[0].indexOf("/"), query: m[1] };
}

/** 插入选中命令：删除 /查询词，插入模板，光标定位到模板内 */
function insertCommand(view: EditorView) {
  const state = useSlashStore.getState();
  const cmd = state.items[state.selected];
  if (!cmd) {
    state.closeMenu();
    return;
  }
  const offset = cmd.cursorOffset ?? cmd.template.length;
  const { head } = view.state.selection.main;
  view.dispatch({
    changes: { from: state.from, to: head, insert: cmd.template },
    selection: { anchor: state.from + offset },
    scrollIntoView: true,
  });
  state.closeMenu();
}

const slashPlugin = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {}

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return;
      const view = update.view;
      const det = detectQuery(view);
      const matches = det
        ? SLASH_COMMANDS.filter((c) => c.label.includes(det.query))
        : [];
      const store = useSlashStore.getState();

      if (!det || matches.length === 0) {
        if (store.open) store.closeMenu();
        return;
      }
      if (store.open) {
        // 查询词变化（如 /代码 → /表）：刷新候选列表，不重建菜单
        store.updateItems(matches, det.from);
        return;
      }
      // 先以兜底坐标打开菜单；coordsAtPos 在 update 期间调用会抛
      // "Reading the editor layout isn't allowed during an update"，
      // 坐标计算延迟到 update 之后（setTimeout 0）
      store.openMenu({
        items: matches,
        selected: 0,
        x: 8,
        y: 8,
        from: det.from,
        insert: () => insertCommand(view),
      });
      setTimeout(() => {
        if (!useSlashStore.getState().open) return;
        const coords = view.coordsAtPos(view.state.selection.main.head);
        if (coords) {
          useSlashStore.getState().updatePosition(
            Math.min(Math.max(coords.left, 8), window.innerWidth - MENU_WIDTH - 8),
            coords.bottom + 4,
          );
        }
      }, 0);
    }
  },
);

const slashKeymap: KeyBinding[] = [
  {
    key: "ArrowDown",
    run: () => {
      const { open, moveSelection } = useSlashStore.getState();
      if (!open) return false;
      moveSelection(1);
      return true;
    },
  },
  {
    key: "ArrowUp",
    run: () => {
      const { open, moveSelection } = useSlashStore.getState();
      if (!open) return false;
      moveSelection(-1);
      return true;
    },
  },
  {
    key: "Enter",
    run: () => {
      const { open, insert } = useSlashStore.getState();
      if (!open || !insert) return false;
      insert();
      return true;
    },
  },
  {
    key: "Escape",
    run: () => {
      const { open, closeMenu } = useSlashStore.getState();
      if (!open) return false;
      closeMenu();
      return true;
    },
  },
];

/** 斜杠命令扩展（live 与 source 模式共用）；菜单 UI 由 SlashMenu 组件渲染 */
export function slashCommandsExtension(): Extension {
  return [slashPlugin, keymap.of(slashKeymap)];
}
