import {
  Heading2,
  Image as ImageIcon,
  Link2,
  List,
  ListOrdered,
  Text,
  type LucideIcon,
} from "lucide-react";

/**
 * The block palettes offered by BlockEditor.
 *
 * Separated from the component so that file exports only components and stays
 * eligible for fast refresh.
 */
export interface BlockTypeDef {
  type: string;
  label: string;
  /**
   * LucideIcon, not `typeof Text` -- that resolved against the DOM's global
   * `Text` once this moved out of the component file, and stopped being usable
   * as a JSX element.
   */
  icon: LucideIcon;
}

/** News uses "list"; case studies distinguish ordered from unordered. */
export const NEWS_BLOCK_TYPES: BlockTypeDef[] = [
  { type: "paragraph", label: "Paragraph", icon: Text },
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "list", label: "List", icon: List },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "link", label: "Link", icon: Link2 },
];

export const CASE_STUDY_BLOCK_TYPES: BlockTypeDef[] = [
  { type: "paragraph", label: "Paragraph", icon: Text },
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "list_unordered", label: "Bullet list", icon: List },
  { type: "list_ordered", label: "Numbered list", icon: ListOrdered },
  { type: "image", label: "Image", icon: ImageIcon },
];
