import { Building2, Landmark, Newspaper, Sparkles, Vote, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/validation";

// One accent (navy) carries every category now — told apart by icon and
// label, not by hue — so there's nothing per-category to spell out beyond
// the icon and label themselves.
export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  news: { label: "News", icon: Newspaper },
  culture_history: { label: "Culture / History", icon: Landmark },
  government: { label: "Government", icon: Building2 },
  political_parties: { label: "Political Parties", icon: Vote },
  other: { label: "Other", icon: Sparkles },
};
