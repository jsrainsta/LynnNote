/**
 * 编辑器动作检查器注册表（阶段七"点击定位"基础设施）。
 * CM6 视图插件在挂载/销毁时注册/注销自己；store 发起请求时通过
 * notifyActionCheck() 唤醒所有已挂载视图立即检查（不必等下一次编辑更新）。
 *
 * 独立成模块（不依赖 store / CM6），避免 useEditorActionStore 与
 * editor-actions.ts 之间循环依赖。
 */

type CheckFn = () => void;

const checkers = new Set<CheckFn>();

export function registerActionChecker(fn: CheckFn): () => void {
  checkers.add(fn);
  return () => {
    checkers.delete(fn);
  };
}

export function notifyActionCheck(): void {
  for (const fn of [...checkers]) fn();
}
