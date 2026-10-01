import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-navy text-white hover:bg-navy-hover",
        verified: "bg-verified text-white hover:bg-[#116530]",
        outline: "border border-border bg-paper-raised text-ink hover:border-navy",
        ghost: "text-ink-soft hover:text-ink",
      },
      size: {
        lg: "h-12 px-6 text-base",
        md: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
