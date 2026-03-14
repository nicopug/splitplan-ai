import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
    "text-xs font-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary uppercase tracking-widest"
)

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
