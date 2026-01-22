import React, { useState, useEffect } from 'react';
import { Settings, Save, Check } from 'lucide-react';

export function ThresholdControl({ currentThreshold, onUpdate, isSyncing }) {
    const [value, setValue] = useState(currentThreshold);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Sync with prop if it changes externally (and we aren't editing)
        // AND if we are not currently trying to save/sync our own changes
        if (!isDirty) {
            setValue(currentThreshold);
        }
    }, [currentThreshold, isDirty]);

    const handleChange = (e) => {
        const val = parseInt(e.target.value);
        setValue(val);
        setIsDirty(val !== currentThreshold);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(value);
        } finally {
            setIsSaving(false);
            setIsDirty(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: '#0f172a',
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            border: '1px solid #334155',
            opacity: isSyncing ? 0.7 : 1,
            pointerEvents: isSyncing ? 'none' : 'auto'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <Settings size={16} />
                <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Auto-Water:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={handleChange}
                    disabled={isSyncing}
                    title="Adjust Threshold"
                    style={{
                        width: '100px',
                        cursor: isSyncing ? 'wait' : 'pointer',
                        accentColor: '#10b981',
                        height: '4px'
                    }}
                />
                <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    minWidth: '36px',
                    textAlign: 'right',
                    color: value < 30 ? '#ef4444' : (value > 70 ? '#3b82f6' : '#10b981')
                }}>
                    {value}%
                </span>
            </div>

            {isSyncing ? (
                <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 12, height: 12, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
            ) : isDirty ? (
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    title="Save Changes"
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        color: '#f59e0b',
                        cursor: 'pointer',
                        display: 'flex'
                    }}
                >
                    <Save size={18} />
                </button>
            ) : (
                <div style={{ width: 26 }} /* Spacer to prevent layout jump */ />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
