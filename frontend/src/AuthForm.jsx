import { useState } from 'react'
import { Sprout } from 'lucide-react'
import { BACKEND_URL } from './constants'

export default function AuthForm({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')



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
        <div className="min-h-screen bg-plant-bg flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 p-8 rounded-[32px] shadow-sm w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-plant-green w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white shadow-lg shadow-plant-green/20">
                        <Sprout className="w-8 h-8" fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-bold text-plant-dark tracking-tight">PlantCare.</h1>
                    <p className="text-plant-text-secondary mt-2">Sign in to monitor your garden</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-2xl text-sm text-center font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {isRegister && (
                        <div>
                            <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-plant-dark text-white font-bold py-4 rounded-2xl hover:bg-plant-green transition-colors shadow-lg shadow-plant-dark/10 mt-4"
                    >
                        {isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center bg-slate-50 p-4 rounded-2xl">
                    <button
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError('');
                            setConfirmPassword('');
                        }}
                        className="text-plant-text-secondary hover:text-plant-dark text-sm font-medium transition-colors"
                    >
                        {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    )
}
