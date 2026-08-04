import { useCallback, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import type { PanelSize } from "react-resizable-panels";
import { ChevronRight } from "lucide-react";
import { cx } from "../../lib/utils/cx";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useFocusStore } from "../../stores/useFocusStore";
import { WorkspacePicker } from "../workspace/WorkspacePicker";
import { CourseSidebar } from "../course/CourseSidebar";
import { NoteListPanel } from "../note/NoteListPanel";
import { EditorArea } from "../editor/EditorArea";
import { FocusBar } from "../focus/FocusBar";

const SEPARATOR_CLASS =
  "w-px shrink-0 bg-border transition-colors duration-150 hover:bg-border-strong";

/** 三栏布局（规范 §8）：课程栏 / 笔记栏 / 编辑区，栏宽可拖动、可折叠。
 *  未选择工作区时显示工作区选择界面。 */
export function AppLayout() {
  const workspacePath = useWorkspaceStore((s) => s.path);
  const focusActive = useFocusStore((s) => s.active);
  const coursePanel = usePanelRef();
  const notePanel = usePanelRef();
  const [courseCollapsed, setCourseCollapsed] = useState(false);
  const [noteCollapsed, setNoteCollapsed] = useState(false);
  // 课程栏当前宽度（百分比），用于定位折叠展开按钮
  const [courseSize, setCourseSize] = useState(17);

  const onCourseResize = useCallback((size: PanelSize) => {
    setCourseSize(size.asPercentage);
    setCourseCollapsed(size.asPercentage === 0);
  }, []);

  const onNoteResize = useCallback((size: PanelSize) => {
    setNoteCollapsed(size.asPercentage === 0);
  }, []);

  // 笔记栏折叠时，展开按钮应贴在课程栏右缘；课程栏也折叠时贴在最左
  // 位置随课程栏宽度变化，故用内联样式（Tailwind 无法为动态值生成类）
  const noteButtonStyle = courseCollapsed
    ? undefined
    : { left: `calc(${courseSize}% - 13px)` };

  // 未选择工作区时显示选择界面（所有 hooks 执行完毕后再早退）
  if (!workspacePath) {
    return <WorkspacePicker />;
  }

  // 专注模式（规范 §13）：隐藏侧栏与非必要按钮，仅 FocusBar + 编辑区；
  // EditorArea 保持挂载（编辑器状态不丢），字号由 .focus-mode 类放大
  if (focusActive) {
    return (
      <div className="focus-mode flex h-full flex-col">
        <FocusBar />
        <div className="min-h-0 flex-1">
          <EditorArea />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Group orientation="horizontal" className="h-full w-full">
        <Panel
          panelRef={coursePanel}
          collapsible
          defaultSize="17"
          minSize="11"
          onResize={onCourseResize}
          className="min-w-0 bg-surface"
        >
          <CourseSidebar panelRef={coursePanel} />
        </Panel>
        <Separator className={SEPARATOR_CLASS} />
        <Panel
          panelRef={notePanel}
          collapsible
          defaultSize="22"
          minSize="16"
          onResize={onNoteResize}
          className="min-w-0 bg-surface"
        >
          <NoteListPanel panelRef={notePanel} />
        </Panel>
        <Separator className={SEPARATOR_CLASS} />
        <Panel defaultSize="61" minSize="35" className="min-w-0">
          <EditorArea />
        </Panel>
      </Group>

      {/* 折叠后的展开按钮（面板宽度为 0 时保留入口） */}
      {courseCollapsed && (
        <button
          type="button"
          onClick={() => coursePanel.current?.expand()}
          title="展开课程栏"
          aria-label="展开课程栏"
          className="absolute left-0 top-1/2 z-20 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border border-l-0 border-border bg-panel text-ink-secondary shadow-sm transition-colors hover:bg-hover hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
      {noteCollapsed && (
        <button
          type="button"
          onClick={() => notePanel.current?.expand()}
          title="展开笔记栏"
          aria-label="展开笔记栏"
          style={noteButtonStyle}
          className={cx(
            "absolute top-1/2 z-20 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border border-l-0 border-border bg-panel text-ink-secondary shadow-sm transition-colors hover:bg-hover hover:text-ink",
            courseCollapsed && "left-8",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
