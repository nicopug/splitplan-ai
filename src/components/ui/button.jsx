import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-white text-black hover:bg-gray-200",
                destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white",
                outline: "border border-white/10 bg-transparent text-white hover:bg-white/5 hover:border-white/20",
                secondary: "bg-white/5 text-white border border-white/5 hover:bg-white/10",
                ghost: "hover:bg-white/5 text-gray-400 hover:text-white",
                link: "text-white underline-offset-4 hover:underline",
                accent: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]",
            },
            size: {
                default: "h-10 px-6 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-10 text-base tracking-wide",
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
