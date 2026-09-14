import { useRef } from "react";
// Text is the fallback icon below -- without this import it resolves to the
// DOM's global Text, which is not a component.
import { ChevronDown, ChevronUp, GripVertical, Text, Trash2 } from "lucide-react";
import type { BlockTypeDef } from "./blockTypes";
import { useImageUpload } from "@/components/editor/useImageUpload";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";

/**
 * Editor for the block-based content used by News and Case Studies.
 *
 * These two models predate the blog and are rendered by the live public site
 * (NewsDetails.tsx, CaseStudyDetail.tsx) as typed block arrays, NOT as HTML.
 * Keeping the structure means those pages need no changes at all -- which is
 * why this exists instead of reusing the TipTap editor.
 *
 * Block text is plain: the server strips any markup before storing it.
 */
export interface Block {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  url?: string;
  caption?: string;
}


const isList = (type: string) =>
  type === "list" || type === "list_ordered" || type === "list_unordered";

const emptyBlock = (type: string): Block => {
  if (isList(type)) return { type, items: [""] };
  if (type === "heading") return { type, text: "", level: 2 };
  if (type === "image") return { type, url: "", caption: "" };
  if (type === "link") return { type, text: "", url: "" };
  return { type, text: "" };
};

const ImageBlockFields = ({
  block,
  onChange,
  folder,
}: {
  block: Block;
  onChange: (next: Block) => void;
  folder: "news" | "casestudies";
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useImageUpload();
  const toast = useToast();

  const pick = async (file: File) => {
    try {
      onChange({ ...block, url: await upload(file, folder) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-2">
      {block.url ? (
        <img
          src={block.url}
          alt={block.caption || ""}
          className="max-h-56 rounded-lg object-contain ring-1 ring-slate-200"
        />
      ) : null}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {block.url ? "Replace image" : uploading ? `${progress ?? 0}%` : "Upload image"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pick(file);
            event.target.value = "";
          }}
        />
      </div>

      <Input
        placeholder="Caption / alt text"
        value={block.caption ?? ""}
        onChange={(event) => onChange({ ...block, caption: event.target.value })}
      />
    </div>
  );
};

export const BlockEditor = ({
  blocks,
  onChange,
  types,
  uploadFolder,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  types: BlockTypeDef[];
  uploadFolder: "news" | "casestudies";
}) => {
  const update = (index: number, next: Block) => {
    const copy = [...blocks];
    copy[index] = next;
    onChange(copy);
  };

  const remove = (index: number) =>
    onChange(blocks.filter((_, i) => i !== index));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  const add = (type: string) => onChange([...blocks, emptyBlock(type)]);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const def = types.find((t) => t.type === block.type);
        const Icon = def?.icon ?? Text;

        return (
          <div
            key={index}
            className="rounded-lg bg-white p-3 ring-1 ring-slate-200"
          >
            <div className="mb-2 flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <Icon className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {def?.label ?? block.type}
              </span>

              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label="Move down"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Remove block"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {block.type === "paragraph" && (
              <Textarea
                rows={4}
                value={block.text ?? ""}
                placeholder="Paragraph text"
                onChange={(event) =>
                  update(index, { ...block, text: event.target.value })
                }
              />
            )}

            {block.type === "heading" && (
              <div className="flex gap-2">
                <Select
                  className="w-28"
                  value={String(block.level ?? 2)}
                  onChange={(event) =>
                    update(index, { ...block, level: Number(event.target.value) })
                  }
                >
                  <option value="2">H2</option>
                  <option value="3">H3</option>
                  <option value="4">H4</option>
                  <option value="5">H5</option>
                  <option value="6">H6</option>
                </Select>
                <Input
                  value={block.text ?? ""}
                  placeholder="Heading text"
                  onChange={(event) =>
                    update(index, { ...block, text: event.target.value })
                  }
                />
              </div>
            )}

            {isList(block.type) && (
              <div className="space-y-1.5">
                {(block.items ?? []).map((item, itemIndex) => (
                  <div key={itemIndex} className="flex gap-2">
                    <Input
                      value={item}
                      placeholder={`Item ${itemIndex + 1}`}
                      onChange={(event) => {
                        const items = [...(block.items ?? [])];
                        items[itemIndex] = event.target.value;
                        update(index, { ...block, items });
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() =>
                        update(index, {
                          ...block,
                          items: (block.items ?? []).filter(
                            (_, i) => i !== itemIndex
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    update(index, { ...block, items: [...(block.items ?? []), ""] })
                  }
                >
                  + Add item
                </Button>
              </div>
            )}

            {block.type === "image" && (
              <ImageBlockFields
                block={block}
                folder={uploadFolder}
                onChange={(next) => update(index, next)}
              />
            )}

            {block.type === "link" && (
              <div className="space-y-2">
                <Input
                  value={block.text ?? ""}
                  placeholder="Link text"
                  onChange={(event) =>
                    update(index, { ...block, text: event.target.value })
                  }
                />
                <Input
                  value={block.url ?? ""}
                  placeholder="https://…"
                  onChange={(event) =>
                    update(index, { ...block, url: event.target.value })
                  }
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-slate-300 p-2">
        {types.map((def) => {
          const Icon = def.icon;
          return (
            <Button
              key={def.type}
              size="sm"
              variant="ghost"
              onClick={() => add(def.type)}
            >
              <Icon className="h-4 w-4" />
              {def.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
