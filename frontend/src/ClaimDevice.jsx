import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export default function ClaimDevice({ userId, onClaimed, onClose }) {
    const [deviceId, setDeviceId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const BACKEND_URL = 'http://localhost:3000'

    const handleClaim = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const res = await fetch(`${BACKEND_URL}/api/devices/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, deviceId, password })
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Claim failed')

            setSuccess(true)
            setTimeout(() => {
                onClaimed()
            }, 1000)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="fixed inset-0 bg-plant-dark/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-md p-8 relative shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 hover:text-plant-dark transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-plant-dark mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-plant-green/10 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-plant-green" />
                    </div>
                    Add New Device
                </h2>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Plus className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-plant-dark mb-2">Device Monitor Added!</h3>
                        <p className="text-plant-text-secondary">Redirecting you to the dashboard...</p>
                    </div>
                ) : (
                    <form onSubmit={handleClaim} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm text-center font-bold border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Device ID</label>
                            <input
                                type="text"
                                placeholder="e.g. esp32-living-room"
                                value={deviceId}
                                onChange={e => setDeviceId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                                required
                            />
                            <p className="text-xs text-slate-400 mt-2 ml-1 font-medium">Must match the ID broadcasted by the device.</p>
                        </div>

                        <div>
                            <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Device Password</label>
                            <input
                                type="password"
                                placeholder="Default: admin123"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-plant-dark text-white font-bold py-4 rounded-2xl hover:bg-plant-green transition-colors shadow-lg shadow-plant-dark/10"
                        >
                            Verify & Claim Device
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
