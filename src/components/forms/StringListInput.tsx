import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Editable list of plain strings -- skills, responsibilities, requirements.
 * Unlike TagInput these stay ordered and allow longer sentences, so each entry
 * gets its own row rather than a chip.
 */
export const StringListInput = ({
  value,
  onChange,
  placeholder = "Add an item",
  addLabel = "Add item",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) => (
  <div className="space-y-1.5">
    {value.map((item, index) => (
      <div key={index} className="flex gap-2">
        <Input
          value={item}
          placeholder={placeholder}
          onChange={(event) => {
            const next = [...value];
            next[index] = event.target.value;
            onChange(next);
          }}
        />
        <button
          type="button"
          aria-label="Remove"
          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          onClick={() => onChange(value.filter((_, i) => i !== index))}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ))}

    <Button size="sm" variant="ghost" onClick={() => onChange([...value, ""])}>
      + {addLabel}
    </Button>
  </div>
);
