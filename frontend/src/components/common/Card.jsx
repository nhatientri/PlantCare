import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

/**
 * Reusable Card Component
 */
export function Card({ className, children }) {
    return (
        <div className={twMerge("bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg", className)}>
            {children}
        </div>
    )
}

export function StatCard({ title, value, unit, icon: Icon, color }) {
    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <Icon className={clsx("w-5 h-5", color)} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{value}</span>
                <span className="text-slate-500 text-sm">{unit}</span>
            </div>
        </Card>
    )
}
