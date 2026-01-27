import { LayoutGrid, PieChart, FileText, Settings, Sprout, User, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

export default function Sidebar({ activeView, onViewChange, user, onLogout }) {
    const navItems = [
        { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
        { id: 'analytics', icon: PieChart, label: 'Analytics' },
        { id: 'logs', icon: FileText, label: 'Logs' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ]

    return (
        <div className="w-64 flex flex-col p-8 space-y-12 h-screen sticky top-0">
            <div className="flex items-center gap-3 px-2">
                <div className="bg-plant-green w-8 h-8 rounded-full flex items-center justify-center text-white">
                    <Sprout size={18} fill="currentColor" />
                </div>
                <h1 className="text-xl font-bold text-plant-dark tracking-tight">PlantCare.</h1>
            </div>

            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={clsx(
                            "flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left",
                            activeView === item.id
                                ? "bg-plant-card text-plant-dark shadow-sm"
                                : "text-plant-text-secondary hover:text-plant-dark hover:bg-plant-highlight"
                        )}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="mt-auto px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-plant-text-secondary">
                    <div className="w-8 h-8 bg-plant-green/20 rounded-full flex items-center justify-center">
                        <User size={16} className="text-plant-green" />
                    </div>
                    <div className="text-xs text-left">
                        <div className="font-bold">{user?.username || 'User'}</div>
                        <div className="opacity-70">Online</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="p-2 text-plant-text-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Log Out"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
    )
}
