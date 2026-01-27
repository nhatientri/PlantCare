import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { BACKEND_URL } from '../../constants'

export default function LogsView() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/logs?limit=50`)
            .then(res => res.json())
            .then(data => {
                setLogs(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const getIcon = (type) => {
        switch (type) {
            case 'error': return <AlertTriangle size={18} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-orange-500" />;
            case 'success': return <CheckCircle size={18} className="text-green-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    }

    if (loading) return <div className="p-8">Loading logs...</div>

    return (
        <div className="flex flex-col gap-8 h-full">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-plant-green/10 rounded-2xl flex items-center justify-center text-plant-green">
                    <FileText size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-plant-dark">Activity Logs</h2>
                    <p className="text-plant-text-secondary">Recent system events and commands</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Device</th>
                                <th className="p-4">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-sm whitespace-nowrap text-slate-500">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <div className={clsx("flex items-center gap-2 px-2 py-1 rounded-full w-fit text-xs font-bold capitalize",
                                            log.type === 'error' && "bg-red-50 text-red-700",
                                            log.type === 'warning' && "bg-orange-50 text-orange-700",
                                            log.type === 'success' && "bg-green-50 text-green-700",
                                            (log.type === 'info' || !log.type) && "bg-blue-50 text-blue-700"
                                        )}>
                                            {getIcon(log.type)}
                                            {log.type}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-plant-dark">
                                        {log.device_id || 'System'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {log.message}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                        No logs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
