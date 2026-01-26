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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" />
                    Add New Device
                </h2>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Device Added!</h3>
                        <p className="text-slate-400">Redirecting...</p>
                    </div>
                ) : (
                    <form onSubmit={handleClaim} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Device ID</label>
                            <input
                                type="text"
                                placeholder="e.g. esp32-living-room"
                                value={deviceId}
                                onChange={e => setDeviceId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                required
                            />
                            <p className="text-xs text-slate-600 mt-1">Must be exactly as broadcasted.</p>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Device Password</label>
                            <input
                                type="password"
                                placeholder="Default: admin123"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Verify & Claim
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
