import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-primary text-base hover:opacity-90 shadow-lg !text-white",
                destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white",
                outline: "border border-border-medium bg-transparent text-primary hover:bg-elevated",
                secondary: "bg-surface text-primary border border-border-subtle hover:bg-elevated",
                ghost: "hover:bg-elevated text-muted hover:text-primary",
                link: "text-primary underline-offset-4 hover:underline",
                accent: "bg-primary-blue text-white hover:bg-primary-blue-light shadow-xl shadow-primary-blue/20",
            },
            size: {
                default: "h-10 px-6 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-10 text-base tracking-wide",
                xl: "h-16 px-12 text-base font-black tracking-widest uppercase",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button, buttonVariants }
