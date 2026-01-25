import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { Activity, Droplets, Thermometer, Wind, AlertTriangle, CloudRain, Settings, Brain, Sprout } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { calculateTimeToEmpty } from './ai-utils'

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

function DeviceDashboard({ deviceId, data, sendCommand }) {
  const [history, setHistory] = useState([])
  const [threshold, setThreshold] = useState(30)
  const [prediction, setPrediction] = useState(null)

  // Update History Local to this component
  useEffect(() => {
    if (data) {
      setHistory(prev => {
        const now = new Date().toLocaleTimeString()
        const newItem = { time: now, moisture: data.moisture, raw: data.moisture }
        // Deduplicate timestamps if update is too fast
        if (prev.length > 0 && prev[prev.length - 1].time === now) return prev;

        const newHistory = [...prev, newItem]
        if (newHistory.length > 50) newHistory.shift()
        return newHistory
      })
    }
  }, [data]) // Run when data prop changes

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
      {/* Device Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white capitalize">{deviceId.replace('esp32-', '').replace('-', ' ')}</h2>
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
        <div className={clsx("px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2",
          statusInfo.bg,
          statusInfo.color
        )}>
          <Activity className="w-4 h-4" />
          {statusInfo.label}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Temperature" value={data.temp.toFixed(1)} unit="°C" icon={Thermometer} color="text-orange-500" />
        <StatCard title="Humidity" value={data.humidity.toFixed(1)} unit="%" icon={Wind} color="text-emerald-500" />
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
        {/* Chart */}
        <Card className="lg:col-span-2 min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Live Moisture Data
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Line type="monotone" dataKey="moisture" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Controls & Sensors */}
        <div className="space-y-6">
          {/* Controls */}
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
                <input
                  type="range" min="0" max="100" value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  onMouseUp={() => sendCommand(deviceId, `SET_THRESHOLD:${threshold}`)}
                  onTouchEnd={() => sendCommand(deviceId, `SET_THRESHOLD:${threshold}`)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <button
                onClick={() => sendCommand(deviceId, 'PUMP_ON')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <CloudRain className="w-5 h-5" />
                Water Now
              </button>

              <button
                onClick={() => sendCommand(deviceId, 'RESET')}
                className="w-full py-3 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Reset System
              </button>
            </div>
          </Card>

          {/* Sensor Health */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Sensor Status</h3>
            <div className="space-y-3">
              {data.sensor_details ? (
                data.sensor_details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-400">Sensor #{idx + 1} <span className="text-xs text-slate-600">(Pin {detail.pin})</span></span>
                      <span className="text-[10px] text-slate-600 font-mono">ADC: {detail.adc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500">{detail.pct}%</span>
                      <div className={clsx("w-3 h-3 rounded-full shadow-lg shadow-current",
                        detail.pct === 0 || detail.pct > 100 ? "bg-red-500 text-red-500" : "bg-emerald-500 text-emerald-500"
                      )} />
                    </div>
                  </div>
                ))
              ) : (
                data.sensors.map((val, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-sm text-slate-400">Sensor #{idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500">{val}%</span>
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
    </div>
  )
}

export default function App() {
  const [status, setStatus] = useState('DISCONNECTED')

  // DEVICES OBJECT: { "esp32-living-room": { moisture: 30, ... }, "esp32-balcony": { ... } }
  const [devices, setDevices] = useState({})

  const [alerts, setAlerts] = useState([])
  const clientRef = useRef(null)

  useEffect(() => {
    // Connect to HiveMQ Public Broker over WebSockets
    const client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt', {
      clientId: 'PlantCare_Dash_' + Math.random().toString(16).substr(2, 8)
    })

    clientRef.current = client

    client.on('connect', () => {
      setStatus('CONNECTED')
      client.subscribe('plantcare/+/status')
      client.subscribe('plantcare/+/alert')
      client.subscribe('plantcare/+/online')
    })

    client.on('message', (topic, message) => {
      // topic: plantcare/DEVICE_ID/status
      const parts = topic.split('/')
      const deviceId = parts[1]
      const msgType = parts[2]

      if (msgType === 'status') {
        try {
          const payload = JSON.parse(message.toString())
          setDevices(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], ...payload, online: true }
          }))
        } catch (e) {
          console.error("Parse Error", e)
        }
      } else if (msgType === 'alert') {
        const msg = message.toString()
        setAlerts(prev => {
          const exists = prev.find(a => a.deviceId === deviceId && a.msg === msg)
          if (exists) return prev
          return [...prev, { id: Date.now(), deviceId, msg }]
        })
      } else if (msgType === 'online') {
        const str = message.toString().toLowerCase()
        const isOnline = str === 'true'
        setDevices(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], online: isOnline }
        }))
      }
    })

    client.on('close', () => setStatus('DISCONNECTED'))

    return () => {
      if (client) client.end()
    }
  }, [])

  const sendCommand = (deviceId, cmd) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(`plantcare/${deviceId}/cmd`, cmd)
    }
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
              PlantCare Command Center
            </h1>
            <div className="flex items-center gap-2">
              <span className={clsx("w-2 h-2 rounded-full animate-pulse", status === 'CONNECTED' ? "bg-emerald-500" : "bg-red-500")} />
              <span className="text-xs text-slate-500 font-medium tracking-wide">{status}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold uppercase text-xs tracking-wider bg-red-500/20 px-2 py-1 rounded">{a.deviceId}</span>
                  {a.msg}
                </div>
                <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} className="hover:text-white">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Device List */}
        {Object.keys(devices).length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full mx-auto mb-4" />
            Waiting for devices to come online...
          </div>
        ) : (
          Object.keys(devices).sort().map(deviceId => (
            <DeviceDashboard
              key={deviceId}
              deviceId={deviceId}
              data={devices[deviceId]}
              sendCommand={sendCommand}
            />
          ))
        )}
      </main>
    </div>
  )
}
