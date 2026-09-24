import { Building2, Landmark, Newspaper, Sparkles, Vote, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/validation";

// Tailwind's scanner needs each class name to appear literally in source —
// no `bg-${dynamic}` — so every variant a consumer might need is spelled
// out here once, up front, rather than assembled at render time.
export const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon; bgClass: string; borderClass: string; hoverBorderClass: string }
> = {
  news: {
    label: "News",
    icon: Newspaper,
    bgClass: "bg-cat-news",
    borderClass: "border-cat-news",
    hoverBorderClass: "hover:border-cat-news",
  },
  culture_history: {
    label: "Culture / History",
    icon: Landmark,
    bgClass: "bg-cat-culture",
    borderClass: "border-cat-culture",
    hoverBorderClass: "hover:border-cat-culture",
  },
  government: {
    label: "Government",
    icon: Building2,
    bgClass: "bg-cat-government",
    borderClass: "border-cat-government",
    hoverBorderClass: "hover:border-cat-government",
  },
  political_parties: {
    label: "Political Parties",
    icon: Vote,
    bgClass: "bg-cat-political",
    borderClass: "border-cat-political",
    hoverBorderClass: "hover:border-cat-political",
  },
  other: {
    label: "Other",
    icon: Sparkles,
    bgClass: "bg-cat-other",
    borderClass: "border-cat-other",
    hoverBorderClass: "hover:border-cat-other",
  },
};
