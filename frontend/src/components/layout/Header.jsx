import { Droplets, Plus, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

export default function Header({ user, status, onLogout, onAddDevice }) {
    return (
        <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <Droplets className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        PlantCare
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className={clsx("w-2 h-2 rounded-full", status === 'CONNECTED' ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-xs text-slate-500 font-medium tracking-wide">
                            Welcome, {user.username}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={onAddDevice}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Device
                </button>
                <button
                    onClick={onLogout}
                    className="text-slate-400 hover:text-white"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
