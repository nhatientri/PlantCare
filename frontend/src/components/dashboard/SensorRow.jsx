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

    // Check for successful save
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
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md group">
            <div className="flex items-center justify-between p-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                title="Change Color"
                            />
                            {showColorPicker && (
                                <div className="absolute left-0 bottom-full mb-2 z-50">
                                    <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)}></div>
                                    <div className="bg-white p-2 rounded-xl flex items-center gap-1.5 shadow-xl border border-slate-100 min-w-max relative z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent closing
                                                    onColorChange(c);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-6 h-6 rounded-full hover:scale-125 transition-transform border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="font-bold text-plant-dark text-lg">Plant #{index + 1}</span>
                    </div>
                    <span className="text-xs text-plant-text-secondary font-mono mt-1 pl-7">
                        Pin: {detail.pin} | ADC: {detail.adc}
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-plant-bg px-4 py-1.5 rounded-full">
                        <div className={clsx("w-2 h-2 rounded-full",
                            detail.pct === 0 || detail.pct > 100 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                        )} />
                        <span className={clsx("text-lg font-bold font-mono",
                            detail.pct === 0 || detail.pct > 100 ? "text-red-600" : "text-emerald-700"
                        )}>{detail.pct}%</span>
                    </div>

                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={clsx(
                            "p-2 rounded-lg transition-colors border",
                            isEditing
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : "bg-white text-slate-400 border-slate-100 hover:text-plant-dark hover:border-slate-200"
                        )}
                        title="Calibrate Sensor"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isEditing && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-end gap-4 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-[10px] text-plant-text-secondary uppercase tracking-wider mb-1.5 font-bold">Air Value (Dry)</label>
                        <input
                            type="number"
                            value={air}
                            onChange={e => setAir(parseInt(e.target.value))}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-plant-dark focus:outline-none focus:border-plant-accent focus:ring-1 focus:ring-plant-accent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-plant-text-secondary uppercase tracking-wider mb-1.5 font-bold">Water Value (Wet)</label>
                        <input
                            type="number"
                            value={water}
                            onChange={e => setWater(parseInt(e.target.value))}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-plant-dark focus:outline-none focus:border-plant-accent focus:ring-1 focus:ring-plant-accent transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className={clsx(
                            "px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition-all min-w-[80px]",
                            saveStatus === 'idle' && "bg-plant-accent text-white hover:bg-orange-600",
                            saveStatus === 'saving' && "bg-orange-200 text-orange-800 cursor-wait",
                            saveStatus === 'success' && "bg-green-500 text-white"
                        )}
                    >
                        {saveStatus === 'idle' && "Save"}
                        {saveStatus === 'saving' && "..."}
                        {saveStatus === 'success' && "Saved!"}
                    </button>
                </div>
            )}
        </div>
    )
}
