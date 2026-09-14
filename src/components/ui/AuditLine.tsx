import { formatRelative } from "@/lib/format";

/**
 * Populated by the API's admin detail endpoints. A plain id means the record
 * was written before the field was populated -- treat that as unknown rather
 * than printing a raw ObjectId.
 */
export interface AuditActor {
  _id?: string;
  name?: string;
  email?: string;
}

const nameOf = (actor?: AuditActor | string | null): string | null => {
  if (!actor || typeof actor === "string") return null;
  return actor.name?.trim() || actor.email?.trim() || null;
};

/**
 * "Created by X · Updated by Y 2d ago".
 *
 * Records that predate this show only their timestamps: the panel has stored
 * createdBy/updatedBy for a while but never displayed them, and older rows
 * across the other modules never had the fields at all. Showing "—" is honest;
 * inventing a name would not be.
 */
export const AuditLine = ({
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  className,
}: {
  createdBy?: AuditActor | string | null;
  updatedBy?: AuditActor | string | null;
  createdAt?: string;
  updatedAt?: string;
  className?: string;
}) => {
  const creator = nameOf(createdBy);
  const editor = nameOf(updatedBy);

  const parts: string[] = [];

  if (createdAt) {
    parts.push(`Created ${formatRelative(createdAt)}${creator ? ` by ${creator}` : ""}`);
  }

  // Only worth a second clause once something has actually changed since.
  if (updatedAt && updatedAt !== createdAt) {
    parts.push(`updated ${formatRelative(updatedAt)}${editor ? ` by ${editor}` : ""}`);
  }

  if (parts.length === 0) return null;

  return (
    <p className={className ?? "text-xs text-slate-400"}>{parts.join(" · ")}</p>
  );
};
