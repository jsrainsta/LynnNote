import { BookOpen, FolderOpen, History } from "lucide-react";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useToastStore } from "../../stores/useToastStore";

/** 无工作区时的全屏选择界面：Logo + 选择按钮 + 最近工作区列表 */
export function WorkspacePicker() {
  const pickWorkspace = useWorkspaceStore((s) => s.pickWorkspace);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const recentPaths = useWorkspaceStore((s) => s.recentPaths);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const showToast = useToastStore((s) => s.show);

  const handlePick = async () => {
    try {
      await pickWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "选择工作区失败", "error");
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      await openWorkspace(path);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "打开工作区失败", "error");
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-panel px-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-white">
        <BookOpen className="size-7" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">LynnNote</h1>
        <p className="mt-1.5 text-[13px] text-ink-secondary">
          选择或创建一个文件夹作为工作区，笔记将以标准 Markdown 文件保存在其中
        </p>
      </div>

      <button
        type="button"
        onClick={handlePick}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
      >
        <FolderOpen className="size-4" aria-hidden="true" />
        {isLoading ? "正在打开…" : "选择工作区文件夹"}
      </button>

      {recentPaths.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium tracking-wider text-ink-tertiary">
            <History className="size-3.5" aria-hidden="true" />
            最近使用
          </p>
          <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {recentPaths.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => handleOpenRecent(path)}
                  title={path}
                  className="w-full truncate rounded-lg border border-border bg-surface px-3 py-2 text-left text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
