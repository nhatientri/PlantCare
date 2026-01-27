import { clsx } from "clsx"

export function StatBlock({ title, value, unit, icon: Icon, color, subtitle, active, onClick }) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "p-5 rounded-3xl flex flex-col justify-between min-h-[140px] transition-all relative overflow-hidden",
                active ? "bg-plant-dark text-white" : "bg-plant-card text-plant-dark shadow-sm border border-slate-100",
                onClick && "cursor-pointer hover:ring-2 hover:ring-plant-accent hover:shadow-md active:scale-95 select-none"
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={clsx("p-2 rounded-full", active ? "bg-white/10" : "bg-plant-bg")}>
                        <Icon size={20} className={active ? "text-white" : "text-plant-green"} />
                    </div>
                    <span className={clsx("font-bold text-sm", active ? "text-white" : "text-plant-text-secondary")}>
                        {title}
                    </span>
                </div>
                {active && <div className="w-2 h-2 rounded-full bg-plant-green animate-pulse" />}
            </div>

            <div className="mt-4">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{value}</span>
                    <span className={clsx("text-sm", active ? "text-white/60" : "text-plant-text-secondary")}>{unit}</span>
                </div>
                <div className={clsx("text-xs font-medium mt-1", active ? "text-white/40" : "text-plant-text-secondary")}>
                    {subtitle}
                </div>
            </div>
        </div>
    )
}
