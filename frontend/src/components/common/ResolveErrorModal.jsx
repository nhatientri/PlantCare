import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

export default function ResolveErrorModal({ isOpen, onClose, onConfirm, isSending }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl shadow-slate-200 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-plant-dark mb-3">System Paused</h2>
                    <p className="text-plant-text-secondary leading-relaxed">
                        Automatic watering has been halted to protect the pump. No moisture rise was detected after the last cycle.
                    </p>
                </div>

                <div className="bg-plant-bg rounded-2xl p-6 mb-8 border border-slate-100">
                    <h3 className="text-xs font-bold text-plant-dark mb-4 uppercase tracking-widest">Inspection Checklist</h3>
                    <ul className="space-y-4 text-sm text-plant-text-secondary text-left">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 w-4 h-4 rounded-full border-2 border-plant-accent/50 flex-shrink-0" />
                            <span>Is the water tank filled and pump submerged?</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 w-4 h-4 rounded-full border-2 border-plant-accent/50 flex-shrink-0" />
                            <span>Are sensors properly inserted into the soil?</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 w-4 h-4 rounded-full border-2 border-plant-accent/50 flex-shrink-0" />
                            <span>Is the pump tubing free of kinks or blockages?</span>
                        </li>
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-6 py-4 bg-white border-2 border-slate-100 hover:border-slate-200 text-plant-text-secondary rounded-2xl font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSending}
                        className={clsx(
                            "px-6 py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20",
                            isSending ? "bg-red-400 cursor-wait" : "bg-red-500 hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        {isSending ? "Resetting..." : "Resolve Issue"}
                    </button>
                </div>
            </div>
        </div>
    )
}
