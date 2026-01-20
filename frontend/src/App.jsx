import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, Sprout, LogOut, PlusCircle } from 'lucide-react';
import { SensorCard } from './components/SensorCard';
import { HistoryChart } from './components/HistoryChart';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { useAuth } from './context/AuthContext';
import { io } from 'socket.io-client';

function App() {
  const { token, logout, isAuthenticated } = useAuth();
  const [readings, setReadings] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [wateringStates, setWateringStates] = useState({}); // { deviceId: boolean }
  const [showRegister, setShowRegister] = useState(false);

  // Device Claiming State
  const [claimId, setClaimId] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimError, setClaimError] = useState('');

  // Use Environment Variable for API URL (Vite style)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Socket State
  const [socket, setSocket] = useState(null);

  const fetchData = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/readings?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const json = await response.json();

      if (json.data && json.data.length > 0) {
        // Raw chronological data for charts
        const sortedData = json.data.reverse();
        setReadings(sortedData);

        // Group by Device ID to find the LATEST reading for each device
        const groups = {};
        sortedData.forEach(reading => {
          // Because we reversed it (oldest -> newest), 
          // the LAST item in the array for a given device is the latest one.
          groups[reading.device_id] = reading;
        });
        setGroupedData(groups);
      } else {
        setGroupedData({});
        setReadings([]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleWaterNow = async (deviceId) => {
    try {
      setWateringStates(prev => ({ ...prev, [deviceId]: true }));

      await fetch(`${API_URL}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId, command: 'PUMP_ON' })
      });

      // Reset state after 5 seconds (matching firmware duration)
      setTimeout(() => {
        setWateringStates(prev => ({ ...prev, [deviceId]: false }));
      }, 5000);

    } catch (err) {
      console.error(err);
      alert('Failed to send command');
      setWateringStates(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleClaimDevice = async (e) => {
    e.preventDefault();
    setClaimError('');
    if (!claimId) return;

    try {
      const res = await fetch(`${API_URL}/api/devices/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: claimId, name: claimName || 'My Plant' })
      });

      const data = await res.json();
      if (res.ok) {
        setClaimId('');
        setClaimName('');
        alert('Device claimed successfully!');
        fetchData(); // Refresh data
      } else {
        setClaimError(data.error || 'Failed to claim device');
      }
    } catch (err) {
      setClaimError('Network error');
    }
  };

  // Initial Fetch & Socket Setup
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();

      // Initialize Socket
      const newSocket = io(API_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log("Socket Connected:", newSocket.id);
      });

      newSocket.on('new_reading', (reading) => {
        console.log("New Reading Socket:", reading);

        // Update Grouped Data (Latest State)
        setGroupedData(prev => ({
          ...prev,
          [reading.device_id]: reading
        }));

        // Update Readings (Charts)
        setReadings(prev => [...prev, reading]);
      });

      // Cleanup
      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  // Fallback Polling (Reduced frequency to 30s just in case socket fails)
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Auth Flow Views
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <header style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#10b981', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <Sprout size={32} color="white" />
          </div>
          <h1>PlantCare Pro</h1>
        </header>
        {showRegister ? (
          <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <Login onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="dashboard">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#10b981', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
            <Sprout size={32} color="white" />
          </div>
          <div>
            <h1>PlantCare Pro</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Multi-Device System</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: socket?.connected ? '#10b981' : '#ef4444' }}>
            {socket?.connected ? '⚡ Real-Time' : '⚠ Connecting...'}
          </div>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Device Claiming Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PlusCircle size={20} color="#10b981" /> Claim New Device
        </h3>
        {claimError && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{claimError}</div>}
        <form onSubmit={handleClaimDevice} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Device ID (e.g. esp32-default)"
            value={claimId}
            onChange={e => setClaimId(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
            required
          />
          <input
            type="text"
            placeholder="Device Name (e.g. Living Room)"
            value={claimName}
            onChange={e => setClaimName(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>Claim Device</button>
        </form>
      </div>

      {Object.keys(groupedData).length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '2px dashed #334155', borderRadius: '12px' }}>
          <h3>No devices found</h3>
          <p>Claim a device using the ID found in your firmware logs or labeled on the device.</p>
        </div>
      )}

      {Object.keys(groupedData).map(deviceId => {
        const latestreading = groupedData[deviceId];
        const plants = latestreading.plants || [];

        return (

          <div key={deviceId} style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Device: <span style={{ color: 'white' }}>{deviceId}</span>
                {(() => {
                  // Check Online Status
                  // SQLite returns "YYYY-MM-DD HH:MM:SS" (UTC)
                  // We must append 'Z' to force JS to parse it as UTC
                  const rawTime = latestreading.timestamp;
                  const timeStr = rawTime.endsWith('Z') ? rawTime : rawTime + 'Z';
                  const lastSeen = new Date(timeStr).getTime();
                  const now = new Date().getTime();

                  const diff = now - lastSeen;
                  // console.log(`Dev ${deviceId}: lastSeen=${timeStr}, diff=${diff}`);

                  const isOnline = diff < 45000; // 45 seconds tolerance

                  return (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: isOnline ? '#10b98120' : '#334155',
                      color: isOnline ? '#10b981' : '#94a3b8',
                      border: `1px solid ${isOnline ? '#10b98140' : '#475569'}`
                    }}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>
                  );
                })()}

                {latestreading.pump_state === 1 && <span style={{ marginLeft: '10px', color: '#f59e0b', fontSize: '0.8rem' }}>⚡ PUMP ON</span>}
              </h2>
              <button
                className="btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.8rem',
                  backgroundColor: wateringStates[deviceId] ? '#f59e0b' : '',
                  cursor: wateringStates[deviceId] ? 'not-allowed' : 'pointer',
                  opacity: wateringStates[deviceId] ? 0.8 : 1
                }}
                onClick={() => handleWaterNow(deviceId)}
                disabled={wateringStates[deviceId]}
              >
                {wateringStates[deviceId] ? '⏳ Watering...' : '💧 Water Now'}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              {/* Environment Sensors */}
              <SensorCard
                title="Temperature"
                value={latestreading.temperature}
                unit="°C"
                icon={Thermometer}
                color="#ef4444"
              />
              <SensorCard
                title="Humidity"
                value={latestreading.humidity}
                unit="%"
                icon={Wind}
                color="#06b6d4"
              />

              {/* Plant Specific Sensors */}
              {plants.map((plant, idx) => (
                <SensorCard
                  key={idx}
                  title={`Plant ${plant.index + 1} Moisture`}
                  value={plant.moisture}
                  unit="%"
                  icon={Droplets}
                  color="#3b82f6"
                />
              ))}
            </div>
          </div>
        );
      })}

      {isAuthenticated && readings.length > 0 && <HistoryChart data={readings} />}
    </div>
  );
}

export default App;
