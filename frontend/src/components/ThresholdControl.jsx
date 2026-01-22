import React, { useState, useEffect } from 'react';
import { Settings, Save, Check } from 'lucide-react';

export function ThresholdControl({ currentThreshold, onUpdate }) {
    const [value, setValue] = useState(currentThreshold);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Sync with prop if it changes externally (and we aren't editing)
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
        await onUpdate(value);
        setIsSaving(false);
        setIsDirty(false);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #334155',
            gap: '1rem',
            width: '100%',
            maxWidth: '300px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                    <Settings size={18} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Auto-Water Threshold</span>
                </div>
                <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: value < 30 ? '#ef4444' : (value > 70 ? '#3b82f6' : '#10b981')
                }}>
                    {value}%
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={handleChange}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        accentColor: '#10b981',
                        height: '6px'
                    }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {isDirty ? (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.4rem 1rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#f59e0b'
                        }}
                    >
                        {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                    </button>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                        padding: '0.4rem 1rem'
                    }}>
                        <Check size={16} /> Saved
                    </div>
                )}
            </div>
        </div>
    );
}
