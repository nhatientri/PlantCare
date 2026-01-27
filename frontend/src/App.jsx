import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import AuthForm from './AuthForm'
import ClaimDevice from './ClaimDevice'
import Sidebar from './components/layout/Sidebar'
import RightPanel from './components/layout/RightPanel'
import DeviceDashboard from './components/dashboard/DeviceDashboard'
import AnalyticsView from './components/views/AnalyticsView'
import LogsView from './components/views/LogsView'
import SettingsView from './components/views/SettingsView'
import { BACKEND_URL } from './constants'
import { Sprout } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('plantcare_user')
    return saved ? JSON.parse(saved) : null
  })

  // View State: 'dashboard', 'analytics', 'logs', 'settings'
  const [currentView, setCurrentView] = useState('dashboard');

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
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Load devices
  useEffect(() => {
    if (!user) {
      setDevices({});
      return;
    }

    fetch(`${BACKEND_URL}/api/devices?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        if (!selectedDeviceId && Object.keys(data).length > 0) {
          setSelectedDeviceId(Object.keys(data).sort()[0]);
        }
      })
      .catch(err => console.error("API Error", err))
  }, [user])

  useEffect(() => {
    const socket = io(BACKEND_URL)
    socket.on('connect', () => setStatus('CONNECTED'))
    socket.on('disconnect', () => setStatus('DISCONNECTED'))

    socket.on('device_update', ({ deviceId, data }) => {
      setDevices(prev => {
        if (!prev[deviceId] && !data.owner_id) return prev;
        if (Object.keys(prev).length === 0 && !selectedDeviceId) {
          setSelectedDeviceId(deviceId);
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
    fetch(`${BACKEND_URL}/api/devices/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, cmd })
    }).catch(err => console.error("Cmd Error", err))
  }

  const handleLogout = () => {
    setUser(null);
    setDevices({});
    setSelectedDeviceId(null);
  }

  if (!user) {
    return <AuthForm onLogin={setUser} />
  }

  const selectedDevice = devices[selectedDeviceId];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Render content based on current view
  const renderContent = () => {
    switch (currentView) {
      case 'analytics': return <AnalyticsView />;
      case 'logs': return <LogsView />;
      case 'settings': return <SettingsView user={user} />;
      case 'dashboard':
      default:
        return selectedDevice ? (
          <DeviceDashboard
            deviceId={selectedDeviceId}
            data={selectedDevice}
            nickname={selectedDevice.nickname}
            sendCommand={sendCommand}
            onRename={(id, newName) => {
              fetch(`${BACKEND_URL}/api/devices/${id}/nickname`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, nickname: newName })
              }).then(res => {
                if (res.ok) {
                  setDevices(prev => ({
                    ...prev,
                    [id]: { ...prev[id], nickname: newName }
                  }));
                }
              });
            }}
            onRemove={(id) => {
              // ... remove logic
              fetch(`${BACKEND_URL}/api/devices/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              }).then(() => {
                const newDevices = { ...devices };
                delete newDevices[id];
                setDevices(newDevices);
                const keys = Object.keys(newDevices).sort();
                setSelectedDeviceId(keys.length > 0 ? keys[0] : null);
              });
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-plant-text-secondary p-12 bg-white/50 rounded-[32px] border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-plant-green/10 rounded-full flex items-center justify-center mb-6">
              <Sprout size={40} className="text-plant-green" />
            </div>
            <h2 className="text-xl font-bold text-plant-dark mb-2">No Plant Selected</h2>
            <p className="max-w-md text-center">Select a plant from the right sidebar or add a new device to get started monitoring your garden.</p>
          </div>
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-plant-bg font-sans text-plant-dark">
      {/* 1. Sidebar */}
      <Sidebar
        activeView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onLogout={handleLogout}
      />

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col p-8 pl-0 overflow-y-auto h-screen">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back, {user.username}!</h1>
            <p className="text-plant-text-secondary mt-1 ml-1 flex items-center gap-2">
              <span className="opacity-60">📅</span> {today}
            </p>
          </div>
          {/* Context Actions could go here */}
        </header>

        {renderContent()}
      </div>

      {/* 3. Right Panel (Only show on Dashboard view, or always? Usually dashboard only or context aware) */}
      <RightPanel
        devices={devices}
        selectedId={selectedDeviceId}
        onSelect={(id) => {
          setSelectedDeviceId(id);
          setCurrentView('dashboard'); // Switch back to dashboard when selecting a plant
        }}
        onAdd={() => setShowClaim(true)}
      />

      {showClaim && (
        <ClaimDevice
          userId={user.id}
          onClose={() => setShowClaim(false)}
          onClaimed={() => {
            setShowClaim(false);
            fetch(`${BACKEND_URL}/api/devices?userId=${user.id}`)
              .then(res => res.json())
              .then(data => setDevices(data));
          }}
        />
      )}
    </div>
  )
}
