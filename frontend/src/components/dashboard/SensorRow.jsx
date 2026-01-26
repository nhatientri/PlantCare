import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { PRESET_COLORS } from '../../constants'

export default function SensorRow({ index, detail, color, onColorChange, onCalibrate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [air, setAir] = useState(detail.air_cal || 1700);
    const [water, setWater] = useState(detail.water_cal || 700);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const [saveStatus, setSaveStatus] = useState('idle');

    // Sync with props when not editing
    useEffect(() => {
        if (!isEditing) {
            setAir(detail.air_cal || 1700);
            setWater(detail.water_cal || 700);
        }
    }, [detail.air_cal, detail.water_cal, isEditing]);

    // Check for successful save (when props match local state during 'saving')
    useEffect(() => {
        if (saveStatus === 'saving' &&
            detail.air_cal === air &&
            detail.water_cal === water) {
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                setIsEditing(false);
            }, 1000);
        }
    }, [detail.air_cal, detail.water_cal, air, water, saveStatus]);

    const handleSave = () => {
        setSaveStatus('saving');
        onCalibrate(index, air, water);
        // Don't close immediately - wait for confirmation
    }

    return (
        <div className="bg-slate-950 rounded-lg border-l-4 transition-colors mb-2" style={{ borderColor: color }}>
            <div className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: color }}>Plant #{index + 1}</span>
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="w-3 h-3 rounded-full border border-slate-600 opacity-50 hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: color }}
                            />
                            {showColorPicker && (
                                <div className="absolute left-0 bottom-full mb-2 z-10">
                                    <div className="fixed inset-0 z-0" onClick={() => setShowColorPicker(false)}></div>
                                    <div className="bg-slate-800 p-2 rounded-lg grid grid-cols-4 gap-1 shadow-xl border border-slate-700 w-32 relative z-10">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    onColorChange(c);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-5 h-5 rounded-full hover:scale-125 transition-transform border border-transparent hover:border-white"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono mt-1">
                        Pin: {detail.pin} | ADC: {detail.adc}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={clsx("transition-colors", isEditing ? "text-purple-400" : "text-slate-600 hover:text-slate-400")}
                        title="Calibrate"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white">{detail.pct}%</span>
                        <div className={clsx("w-3 h-3 rounded-full shadow-lg shadow-current",
                            detail.pct === 0 || detail.pct > 100 ? "bg-red-500 text-red-500" : "bg-emerald-500 text-emerald-500"
                        )} />
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-end gap-3 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Air (Dry)</label>
                        <input
                            type="number"
                            value={air}
                            onChange={e => setAir(parseInt(e.target.value))}
                            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Water (Wet)</label>
                        <input
                            type="number"
                            value={water}
                            onChange={e => setWater(parseInt(e.target.value))}
                            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className={clsx(
                            "px-3 py-1 text-xs font-bold rounded shadow-lg transition-all min-w-[60px]",
                            saveStatus === 'idle' && "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20",
                            saveStatus === 'saving' && "bg-purple-600/50 text-white/50 cursor-wait",
                            saveStatus === 'success' && "bg-green-500 text-white shadow-green-900/20"
                        )}
                    >
                        {saveStatus === 'idle' && "Save"}
                        {saveStatus === 'saving' && "Saving..."}
                        {saveStatus === 'success' && "Saved!"}
                    </button>
                </div>
            )}
        </div>
    )
}
