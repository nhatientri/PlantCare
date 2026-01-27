import { useState, useEffect } from 'react'
import { Droplets, Thermometer, Wind, AlertTriangle, CloudRain, Settings, Sprout, Check, Save, Trash2, X, Edit2, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { calculateTimeToEmpty } from '../../ai-utils'
import { BACKEND_URL, PRESET_COLORS } from '../../constants'
import ResolveErrorModal from '../common/ResolveErrorModal'
import SensorRow from './SensorRow'
import { StatBlock } from './StatBlock'
import TimeWindowModal from './TimeWindowModal'

export default function DeviceDashboard({ deviceId, data, sendCommand, nickname, onRemove, onRename }) {
    const [history, setHistory] = useState([])
    const [timeRange, setTimeRange] = useState('1d') // '1d', '7d', '1m'
    const [threshold, setThreshold] = useState(data.threshold || 30)
    const [prediction, setPrediction] = useState(null)
    const [saveStatus, setSaveStatus] = useState('idle')
    const [resetStatus, setResetStatus] = useState('idle')
    const [showResolveModal, setShowResolveModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showTimeModal, setShowTimeModal] = useState(false)
    const [tempName, setTempName] = useState(nickname)
    const [optimisticMode, setOptimisticMode] = useState(data.mode !== undefined ? data.mode : 0)

    // Update temp name when prop changes
    useEffect(() => {
        setTempName(nickname || deviceId)
    }, [nickname, deviceId])

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

    useEffect(() => {
        if (data.threshold !== undefined && saveStatus === 'idle') {
            setThreshold(data.threshold)
        }
    }, [data.threshold])

    useEffect(() => {
        if (saveStatus === 'saving' && data.threshold !== undefined && parseInt(data.threshold) === parseInt(threshold)) {
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 500)
        }
    }, [data.threshold, saveStatus, threshold])

    const deviceThreshold = data.threshold !== undefined ? data.threshold : 30
    const isChanged = parseInt(threshold) !== parseInt(deviceThreshold)

    // Fetch history when device or range changes
    useEffect(() => {
        fetch(`${BACKEND_URL}/api/history/${deviceId}?range=${timeRange}`)
            .then(res => res.json())
            .then(hist => {
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
    }, [deviceId, timeRange])

    const handleSetThreshold = () => {
        setSaveStatus('saving')
        sendCommand(deviceId, `SET_THRESHOLD:${threshold}`)
    }

    const handleSaveWindows = (mStart, mEnd, aStart, aEnd) => {
        sendCommand(deviceId, `SET_TIME_WINDOW:${mStart}:${mEnd}:${aStart}:${aEnd}`)
    }

    const handleSetTriggerMode = (mode) => {
        // Optimistic update
        setOptimisticMode(mode);
        sendCommand(deviceId, `SET_TRIGGER_MODE:${mode}`)
    }

    // Sync optimistic mode with real data when it arrives
    useEffect(() => {
        if (data && data.mode !== undefined) {
            setOptimisticMode(data.mode);
        }
    }, [data.mode, data])

    // Merge Real-time updates only if range is 1D (otherwise chart looks weird jumping)
    useEffect(() => {
        if (data && timeRange === '1d') {
            setHistory(prev => {
                const now = new Date().getTime(); // Consistent timestamp format
                const details = {};
                if (data.sensor_details) {
                    data.sensor_details.forEach((d, i) => details[`s${i}`] = d.pct);
                } else if (data.sensors) {
                    data.sensors.forEach((v, i) => details[`s${i}`] = v);
                }
                const newItem = {
                    time: now,
                    moisture: data.moisture,
                    raw: data.moisture,
                    ...details
                }

                // Avoid duplicates
                if (prev.length > 0) {
                    const lastTime = prev[prev.length - 1].time;
                    // Simple check: if less than 1 second diff, ignore
                    if (Math.abs(now - lastTime) < 1000) return prev;
                }

                const newHistory = [...prev, newItem]
                // Limit real-time array growth, though fetch mostly handles it
                if (newHistory.length > 200) newHistory.shift()
                return newHistory
            })
        }
    }, [data, timeRange])

    useEffect(() => {
        if (history.length > 5) {
            const moistureValues = history.map(h => h.raw || h.moisture)
            const currentMoisture = moistureValues[moistureValues.length - 1]
            const hours = calculateTimeToEmpty(moistureValues, currentMoisture, threshold)
            setPrediction(hours)
        }
    }, [history, threshold])

    if (!data || typeof data.moisture === 'undefined') return null;

    return (
        <div className="flex flex-col gap-8 flex-1 min-w-0">
            {/* Header and Plant Info */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-start justify-between relative overflow-hidden">
                {/* Decorative Background leaves */}
                <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                    <Sprout size={200} />
                </div>

                <div className="flex gap-6 z-10">
                    <div className="w-24 h-24 rounded-full bg-plant-bg border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                        <Sprout size={48} className="text-plant-green" />
                    </div>
                    <div className="mt-2">
                        <h2 className="text-3xl font-bold text-plant-dark">{nickname || deviceId}</h2>


                        <div className="flex items-center gap-3 mt-4">
                            <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2",
                                data.online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                                <div className={clsx("w-2 h-2 rounded-full", data.online ? "bg-green-500" : "bg-red-500")} />
                                {data.online ? "Online" : "Offline"}
                            </span>
                            {[3, 4].includes(parseInt(data.state)) && (
                                <button
                                    onClick={() => setShowResolveModal(true)}
                                    className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold flex items-center gap-1 animate-pulse"
                                >
                                    <AlertTriangle size={12} /> Issue Detected
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 z-10">
                    <button
                        onClick={() => setShowTimeModal(true)}
                        className="p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-plant-dark transition-colors"
                        title="Watering Schedule"
                    >
                        <Clock size={20} />
                    </button>
                    <button
                        onClick={() => {
                            setTempName(nickname || deviceId);
                            setShowSettings(true);
                        }}
                        className="p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-plant-dark transition-colors"
                        title="Device Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* device settings modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-plant-dark/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-plant-dark transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-plant-dark mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                <Settings className="w-5 h-5 text-slate-600" />
                            </div>
                            Device Settings
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Device Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-plant-dark font-medium focus:outline-none focus:ring-2 focus:ring-plant-green/20 focus:border-plant-green transition-all"
                                        placeholder="Enter device nickname"
                                    />
                                    <button
                                        onClick={() => {
                                            onRename(deviceId, tempName);
                                            setShowSettings(false);
                                        }}
                                        disabled={tempName === nickname}
                                        className="bg-plant-dark text-white px-5 rounded-2xl font-bold hover:bg-plant-green disabled:opacity-50 disabled:hover:bg-plant-dark transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-plant-text-secondary text-xs font-bold uppercase mb-2 ml-1">Watering Trigger</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[0, 1, 2].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => handleSetTriggerMode(m)}
                                            className={clsx(
                                                "py-3 rounded-xl text-sm font-bold border transition-all",
                                                (optimisticMode === m)
                                                    ? "bg-plant-green text-white border-plant-green shadow-md shadow-plant-green/20"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-plant-green hover:text-plant-green"
                                            )}
                                        >
                                            {m === 0 && "Average"}
                                            {m === 1 && "Any Plant"}
                                            {m === 2 && "All Plants"}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2 ml-1">
                                    {optimisticMode === 0 && "Water when the average moisture of all plants is low."}
                                    {optimisticMode === 1 && "Water if ANY single plant becomes dry."}
                                    {optimisticMode === 2 && "Water only when ALL plants are dry."}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
                                <p className="text-xs text-slate-400 mb-4">Removing this device will delete all its history and configuration.</p>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to remove this device? This action cannot be undone.')) {
                                            onRemove(deviceId);
                                            setShowSettings(false); // probably unneeded as component unmounts
                                        }
                                    }}
                                    className="w-full py-3 border border-red-100 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Remove Device
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            <TimeWindowModal
                isOpen={showTimeModal}
                onClose={() => setShowTimeModal(false)}
                currentWindows={data.windows}
                onSave={handleSaveWindows}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBlock
                    title="Air Humidity"
                    value={`${data.humidity?.toFixed(1) || '--'}%`}
                    unit="Humidity"
                    subtitle="Ambient Environment"
                    icon={Wind}
                    active={true} // Highlighted
                    color="text-white"
                />
                <StatBlock
                    title="Temperature"
                    value={`${data.temp?.toFixed(1) || '--'}°C`}
                    unit="Celsius"
                    subtitle="Ambient"
                    icon={Thermometer}
                    active={false}
                    color="text-orange-500"
                />
                <StatBlock
                    title="Forecast"
                    value={!prediction ? '--' : prediction === Infinity ? 'Stable' : `${prediction.toFixed(1)}h`}
                    unit={!prediction || prediction === Infinity ? '' : 'Time to Empty'}
                    subtitle={!prediction || prediction === Infinity ? "Water level stable" : "Watering needed soon"}
                    icon={CloudRain}
                    active={false}
                    color="text-blue-500"
                />
            </div>

            {/* Main Chart Section */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-plant-dark">Water Level</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['1h', '24h', '7d'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                                    timeRange === range
                                        ? "bg-white text-plant-dark shadow-sm"
                                        : "text-plant-text-secondary hover:text-plant-dark"
                                )}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="time"
                                stroke="#cbd5e1"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(timeStr) => {
                                    // For ranges > 1d, maybe show date, else time
                                    const date = new Date(timeStr);
                                    if (isNaN(date.getTime())) return timeStr; // fallback for old strings using locale time
                                    if (timeRange === '1d') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontWeight: 'bold' }}
                                labelFormatter={(label) => {
                                    const d = new Date(label);
                                    if (isNaN(d.getTime())) return label;
                                    return d.toLocaleString([], {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })
                                }}
                            />
                            {/* Threshold Line */}
                            <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold', fill: '#ef4444', fontSize: 12 }} />

                            {/* Render lines for each sensor */}
                            {(() => {
                                // Find all sX keys in data
                                const sensorKeys = new Set();
                                history.forEach(h => {
                                    Object.keys(h).forEach(k => {
                                        if (k.startsWith('s') && !isNaN(parseInt(k.slice(1)))) {
                                            sensorKeys.add(k);
                                        }
                                    });
                                });

                                return Array.from(sensorKeys).map(key => {
                                    const index = parseInt(key.slice(1));
                                    const color = getSensorColor(index);
                                    return (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={`Plant ${index + 1}`}
                                            stroke={color}
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    );
                                });
                            })()}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Controls Inline */}
                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between bg-plant-bg/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-4 flex-1">
                        <span className="text-sm font-bold text-plant-dark whitespace-nowrap">Threshold: {threshold}%</span>
                        <div className="relative flex-1 max-w-xs flex items-center gap-2">
                            <input
                                type="range" min="0" max="100" value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                className="w-full accent-plant-accent h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <button
                                onClick={handleSetThreshold}
                                disabled={saveStatus !== 'idle'}
                                className={clsx(
                                    "px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1 transition-all shadow-sm",
                                    (isChanged || saveStatus !== 'idle') ? "opacity-100 scale-100" : "opacity-0 scale-50 w-0 px-0 overflow-hidden",
                                    saveStatus === 'idle' && "bg-plant-accent text-white hover:bg-orange-600",
                                    saveStatus === 'success' && "bg-green-500 text-white"
                                )}
                            >
                                {saveStatus === 'success' ? (
                                    <>
                                        <Check size={14} /> Saved
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} /> Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const s = parseInt(data.state);
                            if (s === 1 || s === 2) return; // Ignore if watering or soaking
                            if (s === 3 || s === 4) {
                                setShowResolveModal(true); // Open resolve modal on error click
                                return;
                            }
                            sendCommand(deviceId, 'PUMP_ON')
                        }}
                        disabled={parseInt(data.state) === 1 || parseInt(data.state) === 2}
                        className={clsx(
                            "px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2",
                            (parseInt(data.state) === 0 || isNaN(parseInt(data.state))) && "bg-blue-50 hover:bg-blue-100 text-blue-600", // Idle
                            parseInt(data.state) === 1 && "bg-blue-500 text-white cursor-default", // Watering
                            parseInt(data.state) === 2 && "bg-teal-500 text-white cursor-default animate-pulse", // Soaking
                            (parseInt(data.state) === 3 || parseInt(data.state) === 4) && "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50" // Error
                        )}
                    >
                        {(parseInt(data.state) === 0 || isNaN(parseInt(data.state))) && <CloudRain size={18} />}
                        {parseInt(data.state) === 1 && <CloudRain size={18} className="animate-bounce" />}
                        {parseInt(data.state) === 2 && <Droplets size={18} className="animate-bounce" />}
                        {(parseInt(data.state) === 3 || parseInt(data.state) === 4) && <AlertTriangle size={18} className="animate-bounce" />}

                        {(parseInt(data.state) === 0 || isNaN(parseInt(data.state))) && "Water Now"}
                        {parseInt(data.state) === 1 && "Watering..."}
                        {parseInt(data.state) === 2 && "Soaking..."}
                        {(parseInt(data.state) === 3 || parseInt(data.state) === 4) && "System Error"}
                    </button>
                </div>
            </div>

            {/* Detailed Sensors */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-plant-dark mb-4">Plant Details</h3>
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
                        <div className="text-slate-400 italic">No individual sensor data</div>
                    )}
                </div>
            </div>

            <ResolveErrorModal
                isOpen={showResolveModal}
                onClose={() => setShowResolveModal(false)}
                isSending={resetStatus === 'sending'}
                onConfirm={() => {
                    setResetStatus('sending');
                    sendCommand(deviceId, 'RESET');
                    setTimeout(() => {
                        setResetStatus('success');
                        setShowResolveModal(false);
                        setTimeout(() => setResetStatus('idle'), 3000);
                    }, 1000);
                }}
            />
        </div >
    )
}
