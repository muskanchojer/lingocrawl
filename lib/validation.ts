import { z } from "zod";

export const CATEGORIES = [
  "news",
  "culture_history",
  "government",
  "political_parties",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => value ?? "");

export const urlRowSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(2048)
    .url("Enter a valid URL")
    .refine((value) => /^https?:\/\//i.test(value), "Use a http:// or https:// address"),
  category: z.enum(CATEGORIES),
  note: optionalTrimmed(280),
});

export const submissionPayloadSchema = z.object({
  languageId: z.string().trim().min(1, "Choose a language"),
  links: z.array(urlRowSchema).min(1, "Add at least one link").max(20),
  contributorName: optionalTrimmed(80),
  submitterContact: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal(""))
    .transform((value) => value ?? ""),
  turnstileToken: z.string().min(1, "Verification required"),
  // Deliberately unrestricted: a bot filling this field with arbitrary text
  // must still pass shape validation so the route's honeypot check (not
  // this schema) is what decides the request is spam.
  honeypot: optionalTrimmed(500),
});

export type SubmissionPayload = z.infer<typeof submissionPayloadSchema>;
export type UrlRow = z.infer<typeof urlRowSchema>;
