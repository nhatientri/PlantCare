import { useState, useEffect } from 'react'
import { PieChart, Activity, Wifi, Clock, BarChart as BarChartIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { StatBlock } from '../dashboard/StatBlock'
import { BACKEND_URL } from '../../constants'

export default function AnalyticsView() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [flowRate, setFlowRate] = useState(20)
    const [isEditingRate, setIsEditingRate] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('plantcare_flowrate')
        if (saved) setFlowRate(parseFloat(saved))

        fetch(`${BACKEND_URL}/api/analytics`)
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const handleRateSave = () => {
        setIsEditingRate(false)
        localStorage.setItem('plantcare_flowrate', flowRate)
    }

    if (loading) return <div className="p-8">Loading analytics...</div>

    // Calculations
    const totalVolumeMl = (stats.pumpCount || 0) * 2 * flowRate;
    const totalVolumeL = (totalVolumeMl / 1000).toFixed(2);

    // Determine WiFi Color
    let wifiColor = "text-red-500";
    const signal = stats.wifiStrength ? parseInt(stats.wifiStrength) : -100;
    if (signal > -60) wifiColor = "text-green-500";
    else if (signal > -75) wifiColor = "text-yellow-500";

    return (
        <div className="flex flex-col gap-8 h-full">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                    <PieChart size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-plant-dark">System Analytics</h2>
                    <p className="text-plant-text-secondary">Overview of your garden's performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBlock
                    title="WiFi Strength"
                    value={`${(stats?.wifiStrength !== undefined && stats?.wifiStrength !== null) ? stats.wifiStrength : '--'} dBm`}
                    unit="Average Signal"
                    icon={Wifi}
                    color={wifiColor}
                />
                <StatBlock
                    title="Pump Activations"
                    value={(stats?.pumpCount !== undefined && stats?.pumpCount !== null) ? stats.pumpCount : '--'}
                    unit="Last 24h"
                    icon={Activity}
                    color="text-green-500"
                />

                {isEditingRate ? (
                    <div className="p-5 rounded-3xl flex flex-col justify-between min-h-[140px] bg-plant-card text-plant-dark shadow-sm border border-plant-accent ring-2 ring-plant-accent transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase text-plant-accent">Set Flow Rate</span>
                            <BarChartIcon size={20} className="text-plant-accent" />
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <input
                                type="number"
                                autoFocus
                                value={flowRate}
                                onChange={e => setFlowRate(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRateSave()}
                                className="w-24 text-3xl font-bold bg-transparent border-b-2 border-slate-300 focus:border-plant-accent outline-none"
                            />
                            <span className="text-sm font-bold text-slate-400 mb-2">ml/s</span>
                        </div>
                        <button
                            onClick={handleRateSave}
                            className="text-xs bg-plant-accent text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600 transition-colors self-start"
                        >
                            Save Rate
                        </button>
                    </div>
                ) : (
                    <StatBlock
                        title="Est. Water Used"
                        value={`${totalVolumeL}L`}
                        unit="Last 24h"
                        subtitle={`Rate: ${flowRate} ml/s (Tap to Edit)`}
                        icon={BarChartIcon}
                        color="text-cyan-500"
                        onClick={() => setIsEditingRate(true)}
                    />
                )}
            </div>

            {/* Watering Frequency Chart */}
            <div className="flex-1 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-plant-dark">Watering Frequency</h3>
                    <p className="text-sm text-slate-400">Pump activations per day</p>
                </div>

                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                stroke="#cbd5e1"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return d.toLocaleDateString('en-US', { weekday: 'short' });
                                }}
                            />
                            <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" name="Activations" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
