import { useState, useEffect } from 'react'
import { Activity, Droplets, Thermometer, Wind, AlertTriangle, CloudRain, Brain, Sprout, LogOut, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { calculateTimeToEmpty } from '../../ai-utils'
import { BACKEND_URL, PRESET_COLORS } from '../../constants'
import { Card, StatCard } from '../common/Card'
import ResolveErrorModal from '../common/ResolveErrorModal'
import SensorRow from './SensorRow'

export default function DeviceDashboard({ deviceId, data, sendCommand, nickname, onRemove }) {
    const [history, setHistory] = useState([])
    const [threshold, setThreshold] = useState(data.threshold || 30) // Init from data
    const [prediction, setPrediction] = useState(null)
    const [saveStatus, setSaveStatus] = useState('idle')
    const [resetStatus, setResetStatus] = useState('idle')
    const [showResolveModal, setShowResolveModal] = useState(false)
    const [colorPrefs, setColorPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('plantcare_prefs');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    })

    // Helper to get color for a specific sensor index on this device
    const getSensorColor = (index) => {
        const devPrefs = colorPrefs[deviceId] || {};
        if (devPrefs[index]) return devPrefs[index];
        return PRESET_COLORS[index % PRESET_COLORS.length];
    }

    const updateSensorColor = (index, color) => {
        const newPrefs = {
            ...colorPrefs,
            [deviceId]: {
                ...(colorPrefs[deviceId] || {}),
                [index]: color
            }
        };
        setColorPrefs(newPrefs);
        localStorage.setItem('plantcare_prefs', JSON.stringify(newPrefs));
    }

    const handleCalibrate = (index, air, water) => {
        sendCommand(deviceId, `SET_CALIBRATION_VALUES:${index}:${air}:${water}`);
    }

    // 1. Sync local threshold when SERVER data changes (and we aren't busy saving)
    useEffect(() => {
        if (data.threshold !== undefined && saveStatus === 'idle') {
            setThreshold(data.threshold)
        }
    }, [data.threshold])

    // 2. Check for Save Success
    useEffect(() => {
        if (saveStatus === 'saving' && data.threshold !== undefined && parseInt(data.threshold) === parseInt(threshold)) {
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 2000)
        }
    }, [data.threshold, saveStatus, threshold])

    const deviceThreshold = data.threshold !== undefined ? data.threshold : 30
    const isChanged = parseInt(threshold) !== parseInt(deviceThreshold)


    // Fetch History...
    useEffect(() => {
        fetch(`${BACKEND_URL}/api/history/${deviceId}`)
            .then(res => res.json())
            .then(hist => {
                // Transform history to include flattened sensor keys for Recharts
                const processed = hist.map(item => {
                    const details = {};
                    if (item.sensor_details) {
                        item.sensor_details.forEach((d, i) => details[`s${i}`] = d.pct);
                    } else if (item.sensors) {
                        item.sensors.forEach((v, i) => details[`s${i}`] = v);
                    }
                    return { ...item, ...details };
                });
                setHistory(processed);
            })
            .catch(err => console.error("Failed to fetch history", err))
    }, [deviceId])

    const handleSetThreshold = () => {
        setSaveStatus('saving')
        sendCommand(deviceId, `SET_THRESHOLD:${threshold}`)
    }

    // Real-time Update
    useEffect(() => {
        if (data) {
            setHistory(prev => {
                const now = new Date().toLocaleTimeString()
                // Extract individual sensor values
                const details = {};
                if (data.sensor_details) {
                    data.sensor_details.forEach((d, i) => details[`s${i}`] = d.pct);
                } else if (data.sensors) {
                    data.sensors.forEach((v, i) => details[`s${i}`] = v);
                }

                const newItem = { time: now, moisture: data.moisture, raw: data.moisture, ...details }
                if (prev.length > 0 && prev[prev.length - 1].time === now) return prev;
                const newHistory = [...prev, newItem]
                if (newHistory.length > 50) newHistory.shift()
                return newHistory
            })
        }
    }, [data])

    // AI Prediction
    useEffect(() => {
        if (history.length > 5) {
            const moistureValues = history.map(h => h.raw)
            const currentMoisture = moistureValues[moistureValues.length - 1]
            const hours = calculateTimeToEmpty(moistureValues, currentMoisture, threshold)
            setPrediction(hours)
        }
    }, [history, threshold])

    const getStatusInfo = (s) => {
        switch (parseInt(s)) {
            case 0: return { label: 'IDLE', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
            case 1: return { label: 'WATERING', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' }
            case 2: return { label: 'SOAKING', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' }
            case 3: return { label: 'TANK EMPTY', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' }
            case 4: return { label: 'SENSOR FAULT', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' }
            default: return { label: 'UNKNOWN', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
        }
    }

    const statusInfo = getStatusInfo(data.state)
    if (!data || typeof data.moisture === 'undefined') return null;

    return (
        <div className="space-y-6 border-b border-slate-800 pb-12 mb-12 last:border-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sprout className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white capitalize">{nickname || deviceId}</h2>
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-2.5 h-2.5 rounded-full shadow-lg",
                            data.online ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                        )} />
                        <span className={clsx("text-xs font-medium uppercase tracking-wider",
                            data.online ? "text-green-400" : "text-red-400"
                        )}>
                            {data.online ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {[3, 4].includes(parseInt(data.state)) && (
                        <button
                            onClick={() => setShowResolveModal(true)}
                            className="px-4 py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 flex items-center gap-2 animate-pulse"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Resolve Issue
                        </button>
                    )}
                    <div className={clsx("px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2",
                        statusInfo.bg, statusInfo.color
                    )}>
                        <Activity className="w-4 h-4" />
                        {statusInfo.label}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Moisture" value={Math.round(data.moisture)} unit="%" icon={Droplets} color="text-blue-500" />
                <StatCard title="Temperature" value={data.temp?.toFixed(1) || 0} unit="°C" icon={Thermometer} color="text-orange-500" />
                <StatCard title="Humidity" value={data.humidity?.toFixed(1) || 0} unit="%" icon={Wind} color="text-emerald-500" />
                <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-indigo-300 text-sm font-medium uppercase tracking-wider">AI Prediction</h3>
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        {!prediction ? (
                            <span className="text-slate-400 text-sm">Gathering data...</span>
                        ) : prediction === Infinity ? (
                            <span className="text-white font-bold">Stable</span>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-white">{prediction.toFixed(1)}</span>
                                <span className="text-indigo-300 text-sm">Hours to Empty</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        Live Moisture Data
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={history}>
                                <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#38bdf8' }}
                                />
                                <Line type="monotone" dataKey="moisture" stroke="#475569" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Average" />
                                {data.sensor_details ? (
                                    data.sensor_details.map((_, i) => (
                                        <Line key={i} type="monotone" dataKey={`s${i}`} stroke={getSensorColor(i)} strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Plant #${i + 1}`} />
                                    ))
                                ) : (
                                    data.sensors?.map((_, i) => (
                                        <Line key={i} type="monotone" dataKey={`s${i}`} stroke={getSensorColor(i)} strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Plant #${i + 1}`} />
                                    ))
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-500" />
                            Controls
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-slate-400">Moisture Threshold</span>
                                    <span className="text-sm font-bold text-white">{threshold}%</span>
                                </div>
                                <div className="flex items-center gap-3 relative">
                                    <input
                                        type="range" min="0" max="100" value={threshold}
                                        onChange={(e) => setThreshold(e.target.value)}
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <button
                                        onClick={handleSetThreshold}
                                        disabled={saveStatus !== 'idle'}
                                        className={clsx(
                                            "px-3 py-1 text-xs font-bold rounded-lg transition-all duration-300 min-w-[60px]",
                                            (isChanged || saveStatus !== 'idle') ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute right-0",
                                            saveStatus === 'idle' && "bg-purple-600 hover:bg-purple-500 text-white",
                                            saveStatus === 'saving' && "bg-purple-600/50 text-white/50 cursor-wait",
                                            saveStatus === 'success' && "bg-green-500 text-white"
                                        )}
                                    >
                                        {saveStatus === 'idle' && "Set"}
                                        {saveStatus === 'saving' && "..."}
                                        {saveStatus === 'success' && "Saved!"}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => sendCommand(deviceId, 'PUMP_ON')}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CloudRain className="w-5 h-5" />
                                Water Now
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to remove this device?')) onRemove(deviceId);
                                }}
                                className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Remove Device
                            </button>
                        </div>
                    </Card>

                    {/* Individual Plants Status */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-slate-300">Individual Plants</h3>
                        <div className="space-y-3">
                            {data.sensor_details ? (
                                data.sensor_details.map((detail, idx) => (
                                    <SensorRow
                                        key={idx}
                                        index={idx}
                                        detail={detail}
                                        color={getSensorColor(idx)}
                                        onColorChange={(c) => updateSensorColor(idx, c)}
                                        onCalibrate={handleCalibrate}
                                    />
                                ))
                            ) : (
                                data.sensors?.map((val, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <span className="text-sm text-slate-400">Plant #{idx + 1}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-white">{val}%</span>
                                            <div className={clsx("w-3 h-3 rounded-full shadow-lg shadow-current",
                                                val === 0 || val > 100 ? "bg-red-500 text-red-500" : "bg-emerald-500 text-emerald-500"
                                            )} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <ResolveErrorModal
                isOpen={showResolveModal}
                onClose={() => setShowResolveModal(false)}
                isSending={resetStatus === 'sending'}
                onConfirm={() => {
                    setResetStatus('sending');
                    sendCommand(deviceId, 'RESET');
                    // Mock success response since we don't get immediate ack
                    setTimeout(() => {
                        setResetStatus('success');
                        setShowResolveModal(false);
                        setTimeout(() => setResetStatus('idle'), 3000);
                    }, 1000);
                }}
            />
        </div>
    )
}
