import { create } from "zustand";

/**
 * 斜杠命令菜单状态（阶段五）。
 * 状态放 React 层（zustand）的原因：AtomicEditor 在编辑过程中会重建
 * CM6 扩展（ViewPlugin 被 destroy 重建），插件内部持有 DOM 会被清掉；
 * 菜单渲染交给 React 组件（SlashMenu），插件只负责检测与插入。
 */

export interface SlashCommand {
  /** 菜单显示名（如 "标题1"）；/后的查询词按此过滤 */
  label: string;
  /** 插入的 markdown 片段 */
  template: string;
  /** 插入后光标相对模板开头的偏移；缺省 = 模板末尾 */
  cursorOffset?: number;
}

export interface SlashMenuState {
  open: boolean;
  /** 当前可选的命令（已按查询词过滤） */
  items: SlashCommand[];
  selected: number;
  /** 菜单左上角视口坐标 */
  x: number;
  y: number;
  /** 行首 / 的位置（插入时删除范围起点） */
  from: number;
  /** 由插件注册：插入选中命令（内含 view 上下文） */
  insert: (() => void) | null;
  openMenu: (payload: {
    items: SlashCommand[];
    selected: number;
    x: number;
    y: number;
    from: number;
    insert: () => void;
  }) => void;
  closeMenu: () => void;
  updatePosition: (x: number, y: number) => void;
  /** 查询词变化时更新候选列表（菜单已打开） */
  updateItems: (items: SlashCommand[], from: number) => void;
  moveSelection: (delta: number) => void;
  selectAndInsert: (index: number) => void;
}

export const useSlashStore = create<SlashMenuState>()((set, get) => ({
  open: false,
  items: [],
  selected: 0,
  x: 0,
  y: 0,
  from: -1,
  insert: null,

  openMenu: (payload) =>
    set({
      open: true,
      items: payload.items,
      selected: payload.selected,
      x: payload.x,
      y: payload.y,
      from: payload.from,
      insert: payload.insert,
    }),

  /** 更新菜单位置（插件在 update 后延迟计算坐标时调用） */
  updatePosition: (x: number, y: number) => set({ x, y }),

  updateItems: (items, from) =>
    set((s) => ({
      items,
      from,
      selected: Math.min(s.selected, Math.max(items.length - 1, 0)),
    })),

  closeMenu: () => set({ open: false, items: [], selected: 0, insert: null }),

  moveSelection: (delta) => {
    const { items, selected } = get();
    if (items.length === 0) return;
    set({ selected: (selected + delta + items.length) % items.length });
  },

  selectAndInsert: (index) => {
    set({ selected: index });
    get().insert?.();
  },
}));
