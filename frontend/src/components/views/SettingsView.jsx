import { useState } from 'react'
import { Settings, User, Shield, Info, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { BACKEND_URL } from '../../constants'

function PasswordChangeForm({ username }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [oldPass, setOldPass] = useState('')
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [status, setStatus] = useState('idle') // idle, loading, success, error
    const [msg, setMsg] = useState('')

    const handleSubmit = async () => {
        if (newPass !== confirmPass) {
            setStatus('error')
            setMsg("Passwords don't match")
            return
        }
        if (newPass.length < 6) {
            setStatus('error')
            setMsg("Password too short")
            return
        }

        setStatus('loading')
        try {
            const res = await fetch(`${BACKEND_URL}/api/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    oldPassword: oldPass,
                    newPassword: newPass
                })
            })
            const data = await res.json()
            if (res.ok) {
                setStatus('success')
                setMsg("Password updated!")
                setTimeout(() => {
                    setIsExpanded(false)
                    setStatus('idle')
                    setOldPass('')
                    setNewPass('')
                    setConfirmPass('')
                }, 2000)
            } else {
                setStatus('error')
                setMsg(data.error || "Failed to update")
            }
        } catch (e) {
            setStatus('error')
            setMsg("Network Error")
        }
    }

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full py-3 bg-white border border-slate-200 text-plant-dark font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
                <Shield size={18} /> Change Password
            </button>
        )
    }

    return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Old Password</label>
                <input
                    type="password"
                    value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-plant-accent text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password</label>
                <input
                    type="password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-plant-accent text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirm New</label>
                <input
                    type="password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-plant-accent text-sm"
                />
            </div>

            {status === 'error' && <div className="text-red-500 text-xs font-bold">{msg}</div>}
            {status === 'success' && <div className="text-green-500 text-xs font-bold">{msg}</div>}

            <div className="flex gap-2 pt-2">
                <button
                    onClick={() => setIsExpanded(false)}
                    className="flex-1 py-2 text-slate-400 font-bold text-sm hover:text-slate-600"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={status === 'loading' || status === 'success'}
                    className="flex-1 py-2 bg-plant-dark text-white rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                    {status === 'loading' ? 'Saving...' : 'Update'}
                </button>
            </div>
        </div>
    )
}

export default function SettingsView({ user }) {
    return (
        <div className="flex flex-col gap-8 h-full">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                    <Settings size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-plant-dark">Settings</h2>
                    <p className="text-plant-text-secondary">Manage your profile and application preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="text-plant-accent" />
                        <h3 className="text-lg font-bold text-plant-dark">User Profile</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                            <div className="text-plant-dark font-medium">{user?.username || 'Unknown'}</div>
                        </div>


                        <PasswordChangeForm username={user?.username} />
                    </div>
                </div>

                {/* Data Management Section */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="text-red-500" />
                        <h3 className="text-lg font-bold text-plant-dark">Data Management</h3>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <p className="text-slate-500 text-sm mb-6">
                            Manage your recorded data. Actions here cannot be undone.
                        </p>

                        <div className="mt-auto">
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete ALL water level history? This usage data will be permanently lost.")) {
                                        try {
                                            const res = await fetch(`${BACKEND_URL}/api/history`, {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId: user.id })
                                            });
                                            if (res.ok) alert("History cleared successfully.");
                                            else alert("Failed to clear history.");
                                        } catch (e) {
                                            alert("Network error.");
                                        }
                                    }
                                }}
                                className="w-full py-4 border border-red-100 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} /> Clear Water Level History
                            </button>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    )
}
