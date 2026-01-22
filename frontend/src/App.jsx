import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, Sprout, LogOut, PlusCircle, Settings, Save } from 'lucide-react';
import { SensorCard } from './components/SensorCard';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ThresholdControl } from './components/ThresholdControl'; // [NEW]
import { useAuth } from './context/AuthContext';
import { io } from 'socket.io-client';

function App() {
  const { token, logout, isAuthenticated, user } = useAuth();
  const [groupedData, setGroupedData] = useState({});
  const [wateringStates, setWateringStates] = useState({}); // { deviceId: boolean }
  const [showRegister, setShowRegister] = useState(false);
  const [pendingThresholds, setPendingThresholds] = useState({}); // { deviceId: { val: 50, sentAt: 123 } }

  // Device Claiming State
  const [claimId, setClaimId] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimSecret, setClaimSecret] = useState('');
  const [claimError, setClaimError] = useState('');

  // Use Environment Variable for API URL (Vite style)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Socket State
  const [socket, setSocket] = useState(null);

  const fetchData = async () => {
    if (!token) return;

    try {
      const [readingsRes, devicesRes] = await Promise.all([
        fetch(`${API_URL}/api/readings?limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/devices`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Check for auth errors from either response
      if (readingsRes.status === 401 || readingsRes.status === 403 || devicesRes.status === 401 || devicesRes.status === 403) {
        logout();
        return;
      }

      const readingsData = await readingsRes.json();
      const devicesData = await devicesRes.json();

      if (readingsData.data && devicesData.data) {
        const groups = {};

        // 1. Initialize all claimed devices first (so they exist even if offline)
        devicesData.data.forEach(dev => {
          groups[dev.device_id] = {
            device_id: dev.device_id,
            name: dev.name,
            timestamp: '1970-01-01T00:00:00Z', // Default old timestamp
            pump_state: 0, // Default off
            plants: [], // Default empty
            isOffline: true // Assume offline until proven otherwise
          };
        });

        // 2. Overlay latest readings
        readingsData.data.forEach(reading => {
          const did = reading.device_id;
          if (groups[did] && groups[did].isOffline) {
            groups[did] = {
              ...reading,
              name: groups[did].name, // Preserve custom name
              isOffline: false
            };
          } else if (!groups[did]) {
            groups[did] = reading;
          }
        });

        setGroupedData(groups);

      } else {
        setGroupedData({});
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  // Reconciliation Effect: Check if pending thresholds are confirmed or timed out
  useEffect(() => {
    const now = Date.now();
    setPendingThresholds(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(did => {
        // 1. Check if backend confirms it
        if (groupedData[did] && groupedData[did].threshold === next[did].val) {
          delete next[did];
          changed = true;
        }
        // 2. Check timeout (10 seconds)
        else if (now - next[did].sentAt > 10000) {
          console.warn(`Threshold sync timed out for ${did}`);
          delete next[did];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groupedData]);

  const handleWaterNow = async (deviceId) => {
    try {
      setWateringStates(prev => ({ ...prev, [deviceId]: true }));

      const res = await fetch(`${API_URL}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId, command: 'PUMP_ON' })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send command');
      }

      setTimeout(() => {
        setWateringStates(prev => ({ ...prev, [deviceId]: false }));
      }, 5000);

    } catch (err) {
      console.error(err);
      alert(`Command Failed: ${err.message}`);
      setWateringStates(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  // Simplified Handler - passed to ThresholdControl
  const handleUpdateThreshold = async (deviceId, newVal) => {
    console.log(`Sending Threshold: ${newVal}`);

    // Set Pending State (Optimistic UI)
    setPendingThresholds(prev => ({
      ...prev,
      [deviceId]: { val: newVal, sentAt: Date.now() }
    }));

    try {
      const res = await fetch(`${API_URL}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId, command: `SET_THRESHOLD:${newVal}` })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update threshold');
      }

    } catch (e) {
      console.error("Failed to update threshold", e);
      alert(`Update Failed: ${e.message}`);
      // Revert pending state on error
      setPendingThresholds(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  };


  const handleResetSystem = async (deviceId) => {
    if (!window.confirm('Are you sure? Only reset if you have fixed the physical issue (e.g. refilled tank, reconnected sensor).')) return;

    try {
      const res = await fetch(`${API_URL}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId, command: 'RESET_ALERTS' })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset system');
      }

      alert('System reset command sent.');
    } catch (e) {
      console.error(e);
      alert(`Reset Failed: ${e.message}`);
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
        body: JSON.stringify({
          deviceId: claimId,
          name: claimName || 'My Plant',
          secret: claimSecret
        })
      });

      const data = await res.json();
      if (res.ok) {
        setClaimId('');
        setClaimName('');
        setClaimSecret('');
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
        setGroupedData(prev => {
          // Should we merge?
          return {
            ...prev,
            [reading.device_id]: {
              ...prev[reading.device_id],
              ...reading
            }
          };
        });
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{user?.username}</span>
            <div style={{ fontSize: '0.7rem', color: socket?.connected ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: socket?.connected ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
              {socket?.connected ? 'Online' : 'Offline'}
            </div>
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
          <input
            type="password"
            placeholder="Device Secret (Password)"
            value={claimSecret}
            onChange={e => setClaimSecret(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
            required
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Device: <span style={{ color: 'white' }}>{latestreading.name || deviceId}</span>
                  {latestreading.pump_state === 1 && <span style={{ marginLeft: '10px', color: '#f59e0b', fontSize: '0.8rem' }}>⚡ PUMP ON</span>}
                </h2>
                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Online Status Logic */}
                  {(() => {
                    const rawTime = latestreading.timestamp;
                    const timeStr = rawTime.endsWith('Z') ? rawTime : rawTime + 'Z';
                    const lastSeen = new Date(timeStr).getTime();
                    const now = new Date().getTime();
                    const isOnline = (now - lastSeen) < 45000;
                    return (
                      <span style={{ fontSize: '0.7rem', color: isOnline ? '#10b981' : '#94a3b8' }}>
                        {isOnline ? '● Online' : '○ Offline'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* 1. Threshold Control (Moved back to header) */}
                <ThresholdControl
                  currentThreshold={pendingThresholds[deviceId] ? pendingThresholds[deviceId].val : (latestreading.threshold || 30)}
                  isSyncing={!!pendingThresholds[deviceId]}
                  onUpdate={(val) => handleUpdateThreshold(deviceId, val)}
                />

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
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>

              {/* 2. AI Insights Card */}
              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #6366f1', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#6366f1' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '8px' }}>
                      <Sprout size={24} color="#818cf8" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>AI Insights</h3>
                      {latestreading.ai_status === 'SOAKING' &&
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>SOAKING</span>
                      }
                      {latestreading.ai_status === 'MONITORING' &&
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>MONITORING</span>
                      }
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>System Health Score</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: latestreading.health_score < 70 ? '#ef4444' : '#10b981' }}>
                      {latestreading.health_score || 100}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Time to Water</div>
                  <div style={{ fontSize: '1.2rem', color: 'white' }}>
                    {latestreading.predicted_hours ? `~ ${latestreading.predicted_hours} hrs` : 'Calculating...'}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                  <button
                    onClick={() => handleResetSystem(deviceId)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      backgroundColor: latestreading.health_score < 60 ? '#ef4444' : '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    <Settings size={16} />
                    {latestreading.health_score < 60 ? 'UNLOCK SYSTEM' : 'Reset System'}
                  </button>

                  {/* Anomalies List */}
                  {latestreading.anomalies && latestreading.anomalies.length > 0 && (
                    <div style={{ marginTop: '1rem', maxHeight: '100px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Recent Issues:</div>
                      {latestreading.anomalies.map((a, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '2px', display: 'flex', gap: '4px' }}>
                          <span>•</span>
                          <span>{a.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
                  title={`Plant ${plant.index + 1} Moisture ${plant.pin ? `(Pin ${plant.pin})` : ''}`}
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
    </div >
  );
}

export default App;

