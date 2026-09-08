import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ToolButton = ({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={cn(
      "rounded p-1.5 text-slate-600 transition-colors",
      "hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40",
      active && "bg-brand-100 text-brand-700"
    )}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-1 h-5 w-px bg-slate-300" />;

export const EditorToolbar = ({
  editor,
  onInsertImage,
  uploading,
}: {
  editor: Editor;
  onInsertImage: (file: File) => void;
  uploading: boolean;
}) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    // The server allowlist only permits https/mailto/tel -- reject anything
    // else here so the author gets feedback instead of silent stripping.
    if (!/^(https:\/\/|mailto:|tel:)/i.test(url)) {
      window.alert("Links must start with https://, mailto: or tel:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 bg-slate-50 p-1.5">
      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton
        label={editor.isActive("link") ? "Remove link" : "Add link"}
        active={editor.isActive("link")}
        onClick={toggleLink}
      >
        {editor.isActive("link") ? (
          <Link2Off className="h-4 w-4" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
      </ToolButton>

      <ToolButton
        label="Insert image"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="h-4 w-4" />
      </ToolButton>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onInsertImage(file);
          // Reset so selecting the same file twice still fires onChange.
          event.target.value = "";
        }}
      />

      <ToolButton
        label="Insert table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolButton>
    </div>
  );
};
