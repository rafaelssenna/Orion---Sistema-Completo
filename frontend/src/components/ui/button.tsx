import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-orion-space disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-orion-accent text-black hover:bg-orion-accent-light",
        destructive: "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25",
        outline: "border border-white/10 bg-transparent text-orion-silver hover:bg-white/5 hover:text-white hover:border-orion-accent/50",
        secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10",
        ghost: "text-orion-silver hover:bg-white/5 hover:text-white",
        link: "text-orion-accent underline-offset-4 hover:underline",
        success: "bg-emerald-500 text-white hover:bg-emerald-400",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
