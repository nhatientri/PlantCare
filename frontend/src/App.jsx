import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, Sprout } from 'lucide-react';
import { SensorCard } from './components/SensorCard';
import { HistoryChart } from './components/HistoryChart';

function App() {
  const [readings, setReadings] = useState([]);
  const [groupedData, setGroupedData] = useState({});

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/readings?limit=100');
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
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#10b981', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
          <Sprout size={32} color="white" />
        </div>
        <div>
          <h1>PlantCare Pro</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Multi-Device System</p>
        </div>
      </header>

      {Object.keys(groupedData).length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>No devices connected yet...</div>
      )}

      {Object.keys(groupedData).map(deviceId => {
        const latestreading = groupedData[deviceId];
        const plants = latestreading.plants || [];

        return (
          <div key={deviceId} style={{ marginBottom: '3rem' }}>
            <h2 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem', color: '#94a3b8' }}>
              Device: <span style={{ color: 'white' }}>{deviceId}</span>
              {latestreading.pump_state === 1 && <span style={{ marginLeft: '10px', color: '#f59e0b', fontSize: '0.8rem' }}>⚡ PUMP ON</span>}
            </h2>

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

      {/* Global History Chart (Showing generic temp data for now, could be improved to filter) */}
      {/* Passing all readings for now, Chart might look messy with multiple devices mixed, but keeping simple for MVP */}
      <HistoryChart data={readings} />
    </div>
  );
}

export default App;
