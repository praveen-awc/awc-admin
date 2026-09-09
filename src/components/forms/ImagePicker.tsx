import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useImageUpload } from "@/components/editor/useImageUpload";
import type { UploadFolder } from "@/features/blogs/blog.api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export const ImagePicker = ({
  url,
  alt,
  folder = "blog",
  showAlt = true,
  onChange,
}: {
  url?: string;
  alt?: string;
  folder?: UploadFolder;
  /** Hide the alt field where the model has nowhere to store it. */
  showAlt?: boolean;
  onChange: (next: { url?: string; alt?: string }) => void;
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useImageUpload();
  const toast = useToast();

  const pick = async (file: File) => {
    try {
      onChange({ url: await upload(file, folder), alt });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-2">
      {url ? (
        <div className="space-y-2">
          <img
            src={url}
            alt={alt || "Cover"}
            className="aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              loading={uploading}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => onChange({ url: undefined, alt: undefined })}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs">
            {uploading ? `Uploading… ${progress ?? 0}%` : "Upload an image"}
          </span>
        </button>
      )}

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

      {url && showAlt && (
        <Field
          label="Alt text"
          hint="Describes the image for screen readers and search engines."
        >
          <Input
            value={alt ?? ""}
            onChange={(event) => onChange({ url, alt: event.target.value })}
            placeholder="Oracle Fusion integration architecture diagram"
          />
        </Field>
      )}
    </div>
  );
};
