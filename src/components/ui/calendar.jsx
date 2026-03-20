import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"
import { it } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday:
                    "text-muted rounded-md w-9 font-normal text-[0.8rem] h-9 flex items-center justify-center",
                week: "flex w-full mt-2",
                day: cn(
                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                ),
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary-blue hover:text-white rounded-full transition-all text-primary"
                ),
                range_start: "day-range-start",
                range_end: "day-range-end",
                selected:
                    "!bg-primary-blue !text-white hover:!bg-primary-blue hover:!text-white focus:!bg-primary-blue focus:!text-white rounded-full",
                today: "bg-accent text-accent-foreground",
                outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Caption: ({ displayMonth }) => {
                    const { goToMonth, nextMonth, previousMonth } = useNavigation();
                    return (
                        <div className="flex items-center justify-between mb-4 h-10 px-2 w-full">
                            <button
                                type="button"
                                className={cn(
                                    buttonVariants({ variant: "outline" }),
                                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-primary border-border-subtle"
                                )}
                                disabled={!previousMonth}
                                onClick={() => previousMonth && goToMonth(previousMonth)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-black uppercase tracking-widest text-primary">
                                {format(displayMonth, "MMMM yyyy", { locale: it }).toUpperCase()}
                            </span>
                            <button
                                type="button"
                                className={cn(
                                    buttonVariants({ variant: "outline" }),
                                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-primary border-border-subtle"
                                )}
                                disabled={!nextMonth}
                                onClick={() => nextMonth && goToMonth(nextMonth)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    );
                }
            }}
            formatters={{
                formatWeekdayName: (date) => {
                    const days = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
                    return days[date.getDay()];
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
