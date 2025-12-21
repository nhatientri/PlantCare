import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function HistoryChart({ data }) {
    return (
        <div className="card" style={{ height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>History (Last 24h)</h3>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="timestamp"
                        stroke="#94a3b8"
                        tickFormatter={(str) => new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        itemStyle={{ color: '#f8fafc' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temp (°C)" />
                    <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} name="Moisture (%)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
