import { useState } from 'react'
import { Droplets } from 'lucide-react'

export default function AuthForm({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')

    const BACKEND_URL = 'http://localhost:3000'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (isRegister && password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        const endpoint = isRegister ? '/api/register' : '/api/login'

        try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Request failed')

            // Login successful
            onLogin(data.user)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-emerald-500/10 p-3 rounded-full mb-4">
                        <Droplets className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">PlantCare</h1>
                    <p className="text-slate-400">Smart Watering Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            required
                        />
                    </div>

                    {isRegister && (
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                    >
                        {isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError('');
                            setConfirmPassword('');
                        }}
                        className="text-slate-500 hover:text-emerald-400 text-sm transition-colors"
                    >
                        {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    )
}
