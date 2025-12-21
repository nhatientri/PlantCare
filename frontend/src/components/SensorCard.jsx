import React from 'react';

export function SensorCard({ title, value, unit, icon: Icon, color }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                backgroundColor: `${color}20`,
                padding: '1rem',
                borderRadius: '50%',
                color: color
            }}>
                <Icon size={32} />
            </div>
            <div>
                <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{title}</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {value}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{unit}</span>
                </div>
            </div>
        </div>
    );
}
