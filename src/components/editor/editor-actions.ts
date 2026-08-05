/**
 * CM6 扩展：定位（光标 + 高亮）与光标处插入（阶段七）。
 * 供 MarkdownEditor 的 live/source 两种变体安装，按 noteId 匹配请求。
 *
 * 注意（与斜杠命令插件相同的约束）：
 * - AtomicEditor 编辑中会重建扩展，插件构造/销毁时注册注销检查器；
 * - 不能在一次 update/构造期间同步 dispatch（"not allowed during an update"），
 *   所有 dispatch 延迟到 setTimeout(0)。
 */
import { StateEffect, StateField } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import { useEditorActionStore } from "../../stores/useEditorActionStore";
import { registerActionChecker } from "../../lib/action-registry";

const setLocateHighlight = StateEffect.define<{ from: number; to: number }>();
const clearLocateHighlight = StateEffect.define<null>();

const locateMark = Decoration.mark({ class: "cm-locate-highlight" });

/** 定位高亮：短暂标记定位区间后自动清除 */
const locateHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setLocateHighlight)) {
        deco = Decoration.set([locateMark.range(e.value.from, e.value.to)]);
      } else if (e.is(clearLocateHighlight)) {
        deco = Decoration.none;
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** 高亮持续时长（毫秒） */
const HIGHLIGHT_MS = 2400;

/**
 * 定位扩展：消费 useEditorActionStore.locate 中属于本 noteId 的请求，
 * 把光标移到 from、滚动到视野中央，并高亮 from..to 区间。
 */
export function locateExtension(noteId: string): Extension {
  return [
    locateHighlightField,
    ViewPlugin.fromClass(
      class {
        private unregister: () => void;

        constructor(view: EditorView) {
          this.unregister = registerActionChecker(() => this.scheduleCheck(view));
          window.setTimeout(() => this.check(view), 0);
        }

        update(update: ViewUpdate) {
          // 文档变化可能让待消费的偏移失效，趁机重新检查
          if (update.docChanged) this.check(update.view);
        }

        private scheduleCheck(view: EditorView) {
          window.setTimeout(() => this.check(view), 0);
        }

        private retries = 0;

        private check(view: EditorView) {
          const req = useEditorActionStore.getState().locate;
          if (!req || req.noteId !== noteId) return;
          const len = view.state.doc.length;
          if (req.from >= len && len > 0) return; // 内容未就绪，保留请求等下次
          const from = Math.min(req.from, len);
          const to = Math.min(Math.max(req.to, from + 1), len);
          // AtomicEditor 挂载时会先创建一个临时视图再替换：临时视图的 dom 永远不会
          // 连接。只在**连接的**视图上消费并 dispatch，否则延迟重试——避免请求被
          // 临时视图吞掉导致真正视图拿不到（跨笔记定位场景）。
          if (!view.dom.isConnected) {
            if (this.retries < 10) {
              this.retries += 1;
              window.setTimeout(() => this.check(view), 150);
            }
            return;
          }
          // AtomicEditor 挂载后还会继续初始化（实测约 1 秒），期间其状态重建会
          // 清掉我们的高亮；因此分多个时间点幂等重试 dispatch，最后成功的一次保留。
          // 所有 dispatch 延迟执行：check 可能来自 update()（docChanged），
          // 更新期间同步 dispatch 会被 CM6 拒绝。
          const ATTEMPT_DELAYS = [0, 250, 600, 1200];
          ATTEMPT_DELAYS.forEach((delay, i) => {
            window.setTimeout(() => {
              if (!view.dom.isConnected) return;
              useEditorActionStore.getState().consumeLocate();
              const effects: StateEffect<unknown>[] = [];
              if (to > from) effects.push(setLocateHighlight.of({ from, to }));
              effects.push(EditorView.scrollIntoView(from, { y: "center" }));
              view.dispatch({ selection: { anchor: from }, effects });
              // 只首次抢焦点：重试的 focus 会把焦点从搜索/快速打开输入框抢走
              if (i === 0) view.focus();
            }, delay);
          });
          window.setTimeout(() => {
            if (!view.dom.isConnected) return;
            view.dispatch({ effects: clearLocateHighlight.of(null) });
          }, 1200 + HIGHLIGHT_MS);
        }

        destroy() {
          this.unregister();
        }
      },
    ),
  ];
}

/**
 * 插入扩展：消费 useEditorActionStore.insert 中属于本 noteId 的请求，
 * 在当前光标处插入文本（命令面板"插入问题 / 插入复习卡片"）。
 */
export function insertExtension(noteId: string): Extension {
  return ViewPlugin.fromClass(
    class {
      private unregister: () => void;

      constructor(view: EditorView) {
        this.unregister = registerActionChecker(() => this.scheduleCheck(view));
        window.setTimeout(() => this.check(view), 0);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) this.check(update.view);
      }

      private scheduleCheck(view: EditorView) {
        window.setTimeout(() => this.check(view), 0);
      }

      private check(view: EditorView) {
        const req = useEditorActionStore.getState().insert;
        if (!req || req.noteId !== noteId) return;
        useEditorActionStore.getState().consumeInsert();
        const pos = view.state.selection.main.head;
        window.setTimeout(() => {
          if (!view.dom.isConnected) return;
          view.dispatch({ changes: { from: pos, insert: req.text } });
          view.focus();
        }, 0);
      }

      destroy() {
        this.unregister();
      }
    },
  );
}
