import { useState, useEffect } from 'react'
import { X, Clock, Sun, Moon, Check } from 'lucide-react'
import { clsx } from 'clsx'

export default function TimeWindowModal({ isOpen, onClose, currentWindows, onSave }) {
    const [mStart, setMStart] = useState(6)
    const [mEnd, setMEnd] = useState(10)
    const [aStart, setAStart] = useState(16)
    const [aEnd, setAEnd] = useState(19)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen && currentWindows) {
            setMStart(currentWindows.m_start ?? 6)
            setMEnd(currentWindows.m_end ?? 10)
            setAStart(currentWindows.a_start ?? 16)
            setAEnd(currentWindows.a_end ?? 19)
        }
    }, [isOpen, currentWindows])

    const handleSave = async () => {
        if (mEnd <= mStart) {
            alert("Morning End time must be after Start time")
            return
        }
        if (aEnd <= aStart) {
            alert("Afternoon End time must be after Start time")
            return
        }
        setIsSaving(true)
        await onSave(mStart, mEnd, aStart, aEnd)
        setIsSaving(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-plant-dark/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 hover:text-plant-dark transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-plant-dark mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-slate-600" />
                    </div>
                    Watering Times
                </h2>
                <p className="text-slate-500 mb-8 pl-14 leading-relaxed text-sm">
                    Configure the allowed time windows for automatic watering. Outside these hours, the system will only log moisture levels.
                </p>

                <div className="space-y-6">
                    {/* Morning Section */}
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                        <div className="flex items-center gap-2 mb-4 text-orange-600 font-bold">
                            <Sun size={18} />
                            <h3>Morning Window</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs uppercase font-bold text-orange-400 mb-1 block">Start Hour</label>
                                <select
                                    value={mStart}
                                    onChange={(e) => setMStart(parseInt(e.target.value))}
                                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-plant-dark focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                >
                                    {[...Array(25).keys()].map(h => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-orange-300 font-bold self-end mb-3">TO</span>
                            <div className="flex-1">
                                <label className="text-xs uppercase font-bold text-orange-400 mb-1 block">End Hour</label>
                                <select
                                    value={mEnd}
                                    onChange={(e) => setMEnd(parseInt(e.target.value))}
                                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-plant-dark focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                >
                                    {[...Array(25).keys()].map(h => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Afternoon Section */}
                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold">
                            <Moon size={18} />
                            <h3>Afternoon Window</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs uppercase font-bold text-indigo-400 mb-1 block">Start Hour</label>
                                <select
                                    value={aStart}
                                    onChange={(e) => setAStart(parseInt(e.target.value))}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-plant-dark focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    {[...Array(25).keys()].map(h => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-indigo-300 font-bold self-end mb-3">TO</span>
                            <div className="flex-1">
                                <label className="text-xs uppercase font-bold text-indigo-400 mb-1 block">End Hour</label>
                                <select
                                    value={aEnd}
                                    onChange={(e) => setAEnd(parseInt(e.target.value))}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-plant-dark focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    {[...Array(25).keys()].map(h => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-3 bg-plant-dark text-white font-bold rounded-2xl hover:bg-plant-green transition-colors flex items-center justify-center gap-2 shadow-lg shadow-plant-dark/20"
                        >
                            {isSaving ? 'Saving...' : <><Check size={18} /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
