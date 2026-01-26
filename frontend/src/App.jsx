import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { Activity, Droplets, Thermometer, Wind, AlertTriangle, CloudRain, Settings, Brain, Sprout, Plus, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { calculateTimeToEmpty } from './ai-utils'
import AuthForm from './AuthForm'
import ClaimDevice from './ClaimDevice'

function ResolveErrorModal({ isOpen, onClose, onConfirm, isSending }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl shadow-red-900/20">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">System Locked</h2>
          <p className="text-slate-400 text-sm">
            Automatic watering has been halted to protect the pump because no moisture rise was detected after watering.
          </p>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Please Verify:</h3>
          <ul className="space-y-3 text-sm text-slate-400 text-left">
            <li className="flex items-start gap-2">
              <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
              <span>Water tank is filled and pump is submerged.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
              <span>Sensors are properly inserted in soil.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
              <span>Pump tubing is not kinked or blocked.</span>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className={clsx(
              "px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
              isSending ? "bg-red-600/50 cursor-wait" : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30"
            )}
          >
            {isSending ? "Resetting..." : "I Fixed It, Reset System"}
          </button>
        </div>
      </div>
    </div>
  )
}

const BACKEND_URL = 'http://localhost:3000'

const PRESET_COLORS = [
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#f59e0b', // Amber 500
  '#eab308', // Yellow 500
  '#84cc16', // Lime 500
  '#22c55e', // Green 500
  '#10b981', // Emerald 500
  '#14b8a6', // Teal 500
  '#06b6d4', // Cyan 500
  '#0ea5e9', // Sky 500
  '#3b82f6', // Blue 500
  '#6366f1', // Indigo 500
  '#8b5cf6', // Violet 500
  '#a855f7', // Purple 500
  '#d946ef', // Fuchsia 500
  '#ec4899', // Pink 500
  '#f43f5e', // Rose 500
  '#6b7280', // Gray 500
]

/**
 * Reusable Card Component
 */
function Card({ className, children }) {
  return (
    <div className={twMerge("bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg", className)}>
      {children}
    </div>
  )
}

function StatCard({ title, value, unit, icon: Icon, color }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-slate-500 text-sm">{unit}</span>
      </div>
    </Card>
  )
}

function SensorRow({ index, detail, color, onColorChange, onCalibrate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [air, setAir] = useState(detail.air_cal || 1700);
  const [water, setWater] = useState(detail.water_cal || 700);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [saveStatus, setSaveStatus] = useState('idle');

  // Sync with props when not editing
  useEffect(() => {
    if (!isEditing) {
      setAir(detail.air_cal || 1700);
      setWater(detail.water_cal || 700);
    }
  }, [detail.air_cal, detail.water_cal, isEditing]);

  // Check for successful save (when props match local state during 'saving')
  useEffect(() => {
    if (saveStatus === 'saving' &&
      detail.air_cal === air &&
      detail.water_cal === water) {
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditing(false);
      }, 1000);
    }
  }, [detail.air_cal, detail.water_cal, air, water, saveStatus]);

  const handleSave = () => {
    setSaveStatus('saving');
    onCalibrate(index, air, water);
    // Don't close immediately - wait for confirmation
  }

  return (
    <div className="bg-slate-950 rounded-lg border-l-4 transition-colors mb-2" style={{ borderColor: color }}>
      <div className="flex items-center justify-between p-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: color }}>Plant #{index + 1}</span>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-3 h-3 rounded-full border border-slate-600 opacity-50 hover:opacity-100 transition-opacity"
                style={{ backgroundColor: color }}
              />
              {showColorPicker && (
                <div className="absolute left-0 bottom-full mb-2 z-10">
                  <div className="fixed inset-0 z-0" onClick={() => setShowColorPicker(false)}></div>
                  <div className="bg-slate-800 p-2 rounded-lg grid grid-cols-4 gap-1 shadow-xl border border-slate-700 w-32 relative z-10">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          onColorChange(c);
                          setShowColorPicker(false);
                        }}
                        className="w-5 h-5 rounded-full hover:scale-125 transition-transform border border-transparent hover:border-white"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-600 font-mono mt-1">
            Pin: {detail.pin} | ADC: {detail.adc}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={clsx("transition-colors", isEditing ? "text-purple-400" : "text-slate-600 hover:text-slate-400")}
            title="Calibrate"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white">{detail.pct}%</span>
            <div className={clsx("w-3 h-3 rounded-full shadow-lg shadow-current",
              detail.pct === 0 || detail.pct > 100 ? "bg-red-500 text-red-500" : "bg-emerald-500 text-emerald-500"
            )} />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-end gap-3 animate-in slide-in-from-top-2">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Air (Dry)</label>
            <input
              type="number"
              value={air}
              onChange={e => setAir(parseInt(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Water (Wet)</label>
            <input
              type="number"
              value={water}
              onChange={e => setWater(parseInt(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus !== 'idle'}
            className={clsx(
              "px-3 py-1 text-xs font-bold rounded shadow-lg transition-all min-w-[60px]",
              saveStatus === 'idle' && "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20",
              saveStatus === 'saving' && "bg-purple-600/50 text-white/50 cursor-wait",
              saveStatus === 'success' && "bg-green-500 text-white shadow-green-900/20"
            )}
          >
            {saveStatus === 'idle' && "Save"}
            {saveStatus === 'saving' && "Saving..."}
            {saveStatus === 'success' && "Saved!"}
          </button>
        </div>
      )}
    </div>
  )
}

function DeviceDashboard({ deviceId, data, sendCommand, nickname, onRemove }) {
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

  // ... (Real-time Update and AI Prediction useEffects remain same, skipping for brevity of match)

  const handleSetThreshold = () => {
    setSaveStatus('saving')
    sendCommand(deviceId, `SET_THRESHOLD:${threshold}`)
    // No timeout here anymore - we wait for useEffect above to detect the change from device
  }

  // ... (Status Info logic remains same)

  // ...



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

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('plantcare_user')
    return saved ? JSON.parse(saved) : null
  })

  // Persist user on change
  useEffect(() => {
    if (user) {
      localStorage.setItem('plantcare_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('plantcare_user')
    }
  }, [user])

  const [showClaim, setShowClaim] = useState(false)
  const [status, setStatus] = useState('DISCONNECTED')
  const [devices, setDevices] = useState({})

  // Load devices when user changes
  useEffect(() => {
    if (!user) {
      setDevices({});
      return;
    }

    fetch(`${BACKEND_URL}/api/devices?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setDevices(data))
      .catch(err => console.error("API Error", err))
  }, [user])

  useEffect(() => {
    const socket = io(BACKEND_URL)
    socket.on('connect', () => setStatus('CONNECTED'))
    socket.on('disconnect', () => setStatus('DISCONNECTED'))

    socket.on('device_update', ({ deviceId, data }) => {
      // Only update if we already know about this device (it's ours)
      setDevices(prev => {
        if (!prev[deviceId] && !data.owner_id) {
          // Note: Ideally backend should only emit to specific user room.
          // For now, prototype: if it's not in our list, ignore it (unless we refresh)
          // Actually, realtime updates won't add NEW devices effectively until claim.
          return prev;
        }
        if (prev[deviceId]) {
          return { ...prev, [deviceId]: { ...prev[deviceId], ...data } }
        }
        return prev;
      })
    })

    return () => socket.disconnect()
  }, [])

  const sendCommand = (deviceId, cmd) => {
    fetch(`${BACKEND_URL}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, cmd })
    }).catch(err => console.error("Cmd Error", err))
  }

  const handleLogout = () => {
    setUser(null);
    setDevices({});
  }

  if (!user) {
    return <AuthForm onLogin={setUser} />
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <Droplets className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              PlantCare
            </h1>
            <div className="flex items-center gap-2">
              <span className={clsx("w-2 h-2 rounded-full", status === 'CONNECTED' ? "bg-emerald-500" : "bg-red-500")} />
              <span className="text-xs text-slate-500 font-medium tracking-wide">
                Welcome, {user.username}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowClaim(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Device
          </button>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {Object.keys(devices).length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <Sprout className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No Plants Yet</h3>
            <p className="mb-6">Add your first PlantCare device to get started.</p>
            <button
              onClick={() => setShowClaim(true)}
              className="text-emerald-500 hover:text-emerald-400 font-bold"
            >
              Claim a Device →
            </button>
          </div>
        ) : (
          Object.keys(devices).sort().map(deviceId => (
            <DeviceDashboard
              key={deviceId}
              deviceId={deviceId}
              nickname={devices[deviceId].nickname}
              data={devices[deviceId]}
              sendCommand={sendCommand}
              onRemove={(id) => {
                fetch(`${BACKEND_URL}/api/devices/${id}`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id })
                })
                  .then(() => {
                    // Refresh list locally or re-fetch
                    const newDevices = { ...devices };
                    delete newDevices[id];
                    setDevices(newDevices);
                  });
              }}
            />
          ))
        )}
      </main>

      {showClaim && (
        <ClaimDevice
          userId={user.id}
          onClose={() => setShowClaim(false)}
          onClaimed={() => {
            setShowClaim(false);
            // Refresh list
            fetch(`${BACKEND_URL}/api/devices?userId=${user.id}`)
              .then(res => res.json())
              .then(data => setDevices(data));
          }}
        />
      )}
    </div>
  )
}
