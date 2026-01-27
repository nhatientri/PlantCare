import { Plus, ArrowRight, Sprout } from 'lucide-react'
import { clsx } from 'clsx'

export default function RightPanel({ devices, selectedId, onSelect, onAdd }) {
    const deviceList = Object.keys(devices).map(id => ({ id, ...devices[id] }));

    return (
        <div className="w-80 p-6 flex flex-col gap-8 h-screen sticky top-0 overflow-y-auto">
            {/* Add Button */}
            <button
                onClick={onAdd}
                className="w-full bg-plant-accent text-white rounded-2xl py-4 font-bold shadow-lg shadow-orange-900/10 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
                <Plus size={20} />
                Add New Plant
            </button>

            {/* Plant List Container */}
            <div className="bg-plant-dark rounded-[32px] p-6 flex-1 flex flex-col text-white shadow-2xl shadow-plant-dark/20">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="font-bold text-lg">Plant List</h2>
                    <button className="text-xs text-white/50 hover:text-white transition-colors">see all</button>
                </div>

                <div className="space-y-4">
                    {deviceList.length === 0 ? (
                        <div className="text-center py-10 text-white/30 text-sm">
                            No plants yet.
                        </div>
                    ) : (
                        deviceList.map((device) => (
                            <button
                                key={device.id}
                                onClick={() => onSelect(device.id)}
                                className={clsx(
                                    "w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all border",
                                    selectedId === device.id
                                        ? "bg-white/10 border-white/20 backdrop-blur-md"
                                        : "bg-transparent border-transparent hover:bg-white/5"
                                )}
                            >
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <Sprout className="text-plant-green" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate">{device.nickname || device.id}</h3>
                                    <p className="text-xs text-white/50 truncate">
                                        {device.online ? 'Healthy' : 'Offline'} • {Math.round(device.moisture)}%
                                    </p>
                                </div>
                                {selectedId === device.id && (
                                    <div className="w-2 h-2 rounded-full bg-plant-accent" />
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Decorative Bottom Card */}
                <div className="mt-auto pt-8">
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <Sprout size={14} className="text-white" />
                            </div>
                            <div>
                                <div className="text-xs font-bold">Did you know?</div>
                                <div className="text-[10px] text-white/60">Monstera need indirect light.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
