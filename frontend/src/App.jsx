import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { Sprout } from 'lucide-react'
import AuthForm from './AuthForm'
import ClaimDevice from './ClaimDevice'
import Header from './components/layout/Header'
import DeviceDashboard from './components/dashboard/DeviceDashboard'
import { BACKEND_URL } from './constants'

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
      <Header
        user={user}
        status={status}
        onLogout={handleLogout}
        onAddDevice={() => setShowClaim(true)}
      />

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
