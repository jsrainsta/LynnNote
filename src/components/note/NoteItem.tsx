import { Pin } from "lucide-react";
import { useNoteStore } from "../../stores/useNoteStore";
import { formatRelativeTime } from "../../lib/utils/format";
import { cx } from "../../lib/utils/cx";
import type { NoteMeta } from "../../types";

interface NoteItemProps {
  note: NoteMeta;
  selected: boolean;
}

export function NoteItem({ note, selected }: NoteItemProps) {
  const selectNote = useNoteStore((s) => s.selectNote);

  return (
    <button
      type="button"
      onClick={() => selectNote(note.id)}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "group relative w-full cursor-pointer rounded-lg px-2.5 py-2 text-left",
        "transition-colors duration-150",
        selected ? "bg-active" : "hover:bg-hover",
      )}
    >
      {selected && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
      )}
      <div className="flex items-center gap-1.5">
        <span
          className={cx(
            "min-w-0 flex-1 truncate text-[13px]",
            selected ? "font-medium text-ink" : "text-ink group-hover:text-ink",
          )}
        >
          {note.title}
        </span>
        {note.pinned && (
          <Pin
            className="size-3 shrink-0 fill-ink-tertiary text-ink-tertiary"
            aria-label="已置顶"
          />
        )}
      </div>
      {note.summary && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-secondary">
          {note.summary}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ink-tertiary">{formatRelativeTime(note.updatedAt)}</p>
    </button>
  );
}
