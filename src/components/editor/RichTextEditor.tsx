import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { TableKit } from "@tiptap/extension-table";
import { EditorToolbar } from "./EditorToolbar";
import { useImageUpload } from "./useImageUpload";
import { useToast } from "@/components/ui/Toast";

/**
 * The enabled extension set MUST stay aligned with the server-side allowlist in
 * awc-backend/src/utils/sanitizeHtml.ts. Anything the editor can produce but
 * the sanitizer discards disappears silently when the author saves.
 *
 * StarterKit v3 already bundles Link and Underline, so they are configured
 * through it rather than installed separately.
 */
export const RichTextEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) => {
  const toast = useToast();
  const { upload, uploading, progress } = useImageUpload();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          protocols: ["https", "mailto", "tel"],
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
      // allowBase64 is off on purpose: a pasted base64 image would balloon the
      // stored document and the sanitizer strips data: URIs anyway.
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Write the post…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-slate max-w-none min-h-80 px-4 py-3 focus:outline-none",
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        void insertImage(file);
        return true;
      },
      handlePaste: (_view, event) => {
        // Pasting a screenshot is the common case, so it gets the same path.
        const file = Array.from(event.clipboardData?.files ?? [])[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        void insertImage(file);
        return true;
      },
    },
  });

  async function insertImage(file: File) {
    try {
      const url = await upload(file);
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  }

  /**
   * Re-sync when the parent replaces the content wholesale -- e.g. after a save
   * refetches the server's sanitized HTML, which can differ from what was typed.
   * Guarded against the editor's own updates, which would reset the cursor.
   */
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg bg-white ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-600">
      <EditorToolbar
        editor={editor}
        onInsertImage={(file) => void insertImage(file)}
        uploading={uploading}
      />
      <EditorContent editor={editor} />
      {uploading && (
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          Uploading image… {progress ?? 0}%
        </div>
      )}
    </div>
  );
};
