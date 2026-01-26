import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

export default function ResolveErrorModal({ isOpen, onClose, onConfirm, isSending }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl shadow-red-900/20">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">System Locked</h2>
                    <p className="text-slate-400 text-sm">
                        Automatic watering has been halted to protect the pump because no moisture rise was detected after watering.
                    </p>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Please Verify:</h3>
                    <ul className="space-y-3 text-sm text-slate-400 text-left">
                        <li className="flex items-start gap-2">
                            <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                            <span>Water tank is filled and pump is submerged.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                            <span>Sensors are properly inserted in soil.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                            <span>Pump tubing is not kinked or blocked.</span>
                        </li>
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSending}
                        className={clsx(
                            "px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                            isSending ? "bg-red-600/50 cursor-wait" : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30"
                        )}
                    >
                        {isSending ? "Resetting..." : "I Fixed It, Reset System"}
                    </button>
                </div>
            </div>
        </div>
    )
}
