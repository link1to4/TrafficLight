import React, { useState, useRef, useEffect } from 'react';
import { Intersection, RecordingState } from '../types';
import { LocateFixed, Loader2, Play, StopCircle, X, AlertCircle, Trash2, ArrowLeft, ArrowRight, Timer, Square } from 'lucide-react';
import { getAddressFromCoords } from '../services/geoService';
import { formatTime, getSecondsFromMidnight, secondsToTimeStr } from '../utils/timeUtils';

interface IntersectionFormProps {
  initialData?: Intersection;
  onSave: (data: Omit<Intersection, 'id'>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const IntersectionForm: React.FC<IntersectionFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'BASIC' | 'TIMING'>('BASIC');
  
  // Basic Info State
  const [name, setName] = useState(initialData?.name || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || formatTime(new Date()));
  const [activeLoops, setActiveLoops] = useState(initialData?.activeLoops || 20); // Loops AFTER start
  const [negativeLoops, setNegativeLoops] = useState(initialData?.negativeLoops || 0); // Loops BEFORE start
  
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Timing State
  const [green, setGreen] = useState(initialData?.timings.green || 30);
  const [yellow, setYellow] = useState(initialData?.timings.yellow || 3);
  const [red, setRed] = useState(initialData?.timings.red || 30);
  
  // Logic: If editing (initialData exists), default to Manual (true).
  // If creating new (initialData undefined), default to Recording (false).
  const [isManualMode, setIsManualMode] = useState(!!initialData);

  // Full Recording State (Wizard)
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [recordedGreen, setRecordedGreen] = useState(0);
  const [recordedYellow, setRecordedYellow] = useState(0);

  // Single Field Recording State (Manual Mode)
  const [singleRecordingField, setSingleRecordingField] = useState<'green' | 'yellow' | 'red' | null>(null);
  
  // Refs for recording logic
  const lastTimestampRef = useRef<number>(0);
  const recordingTimerRef = useRef<number>(0); // setInterval ID
  const [currentElapsed, setCurrentElapsed] = useState(0); // Visual feedback

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Cleanup timer when switching modes
  useEffect(() => {
      setSingleRecordingField(null);
      setRecordingState(RecordingState.IDLE);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setCurrentElapsed(0);
  }, [isManualMode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (e.target.value.trim()) setFormError(null);
  };

  const handleGeoLocation = () => {
    setGeoError(null);
    setIsLocating(true);
    if (!navigator.geolocation) {
      setGeoError("您的瀏覽器不支援地理定位功能");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const address = await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
          setName(address);
          setFormError(null);
        } catch (err) {
          setGeoError("無法取得地址資訊。");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setGeoError("無法取得位置，請確認瀏覽器權限。");
        setIsLocating(false);
      }
    );
  };

  // --- Full Recording Wizard Logic ---
  const startRecording = () => {
    // CRITICAL: Update Start Time to NOW
    const now = new Date();
    setStartTime(formatTime(now));
    
    setRecordingState(RecordingState.RECORDING_GREEN);
    lastTimestampRef.current = Date.now();
    setCurrentElapsed(0);
    
    // Start visual timer
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = window.setInterval(() => {
      setCurrentElapsed((Date.now() - lastTimestampRef.current) / 1000);
    }, 100);
  };

  const nextPhase = () => {
    const now = Date.now();
    const duration = Math.max(1, Math.round((now - lastTimestampRef.current) / 1000));
    
    if (recordingState === RecordingState.RECORDING_GREEN) {
      setRecordedGreen(duration);
      setRecordingState(RecordingState.RECORDING_YELLOW);
    } else if (recordingState === RecordingState.RECORDING_YELLOW) {
      setRecordedYellow(duration);
      setRecordingState(RecordingState.RECORDING_RED);
    } else if (recordingState === RecordingState.RECORDING_RED) {
      // Finished Red, auto apply
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      // Apply immediately
      setGreen(recordedGreen);
      setYellow(recordedYellow);
      setRed(duration); // This is the red duration
      
      setIsManualMode(true);
      setRecordingState(RecordingState.IDLE);
      setCurrentElapsed(0);
    }
    
    lastTimestampRef.current = now;
    setCurrentElapsed(0);
  };

  // --- Single Field Recording Logic ---
  const handleStartSingleRecord = (field: 'green' | 'yellow' | 'red') => {
    setSingleRecordingField(field);
    lastTimestampRef.current = Date.now();
    setCurrentElapsed(0);
    
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = window.setInterval(() => {
       setCurrentElapsed((Date.now() - lastTimestampRef.current) / 1000);
    }, 100);
  };

  const handleStopSingleRecord = () => {
    if (!singleRecordingField) return;

    const duration = Math.max(1, Math.round((Date.now() - lastTimestampRef.current) / 1000));
    
    if (singleRecordingField === 'green') setGreen(duration);
    if (singleRecordingField === 'yellow') setYellow(duration);
    if (singleRecordingField === 'red') setRed(duration);
    
    setSingleRecordingField(null);
    setCurrentElapsed(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("請輸入路口名稱");
      return;
    }
    
    onSave({
      name,
      startTime,
      activeLoops,
      negativeLoops,
      timings: { green, yellow, red }
    });
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
    }
  };

  // Helper for Custom Time Input
  const handleTimePartChange = (part: 'h' | 'm' | 's', value: string) => {
    const [h, m, s] = startTime.split(':');
    let val = parseInt(value);
    
    if (isNaN(val)) val = 0;
    
    // Clamp values
    if (part === 'h') val = Math.min(23, Math.max(0, val));
    else val = Math.min(59, Math.max(0, val));
    
    const strVal = val.toString(); // Don't pad yet while typing
    
    let newH = h, newM = m, newS = s;
    if (part === 'h') newH = strVal;
    if (part === 'm') newM = strVal;
    if (part === 's') newS = strVal;
    
    // Reconstruct but keep raw input until blur if needed, 
    // but for simplicity we allow standard typing and pad on blur
    setStartTime(`${newH}:${newM}:${newS}`);
  };

  const handleTimeBlur = () => {
    const [h, m, s] = startTime.split(':');
    const pad = (str: string) => (parseInt(str) || 0).toString().padStart(2, '0');
    setStartTime(`${pad(h)}:${pad(m)}:${pad(s)}`);
  };

  // Calculate Effective Range (With Negative Logic)
  const calculateEffectiveRange = () => {
    const totalCycle = green + yellow + red;
    const startSecs = getSecondsFromMidnight(startTime);
    
    const forwardSecs = totalCycle * activeLoops;
    const backwardSecs = totalCycle * negativeLoops;
    
    // Start is (Start Time - Negative Duration)
    let minSecs = startSecs - backwardSecs;
    // End is (Start Time + Positive Duration)
    let maxSecs = startSecs + forwardSecs;
    
    // Handle wrapping for display
    const formatWrappedTime = (secs: number) => {
        let normalized = secs;
        // Normalize to positive range if somehow negative
        while (normalized < 0) normalized += 86400;
        // Normalize to 24h
        while (normalized >= 86400) normalized -= 86400;
        return secondsToTimeStr(normalized);
    };

    return {
        start: formatWrappedTime(minSecs),
        end: formatWrappedTime(maxSecs),
        totalCycle,
        startIsYesterday: minSecs < 0
    };
  };

  const { start: effectiveStart, end: effectiveEnd, totalCycle, startIsYesterday } = calculateEffectiveRange();

  // Extract parts for rendering inputs
  const [startH, startM, startS] = startTime.split(':').map(p => (parseInt(p) || 0).toString().padStart(2, '0'));

  // Render Helper for Manual Input Card (New Design)
  const renderManualTimerCard = (
    label: string,
    field: 'green' | 'yellow' | 'red',
    value: number,
    setValue: (val: number) => void,
    // Style configurations
    textColor: string,
    borderColor: string,
    // Idle state button styles
    btnIdleBg: string,
    btnIdleHover: string,
    btnIdleText: string,
    btnShadow: string,
    // Recording state style (border color)
    recordBorderColor: string,
    recordTextColor: string
  ) => {
    const isRecordingThis = singleRecordingField === field;
    const isRecordingOther = singleRecordingField !== null && !isRecordingThis;

    return (
      <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-xl border items-center transition-colors ${isRecordingThis ? 'border-2 '+recordBorderColor : 'border-slate-700'}`}>
        <label className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{label}</label>
        
        {/* Large Input Display */}
        <div className="relative w-full">
           <input
            type="number"
            min="1"
            value={value}
            disabled={isRecordingOther || isRecordingThis}
            onChange={(e) => setValue(Math.max(1, parseInt(e.target.value) || 0))}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg py-3 text-3xl text-center font-mono text-white focus:outline-none focus:border-slate-500 transition-colors disabled:opacity-50`}
          />
           <span className="absolute right-3 bottom-4 text-xs text-slate-500 font-sans font-normal">秒</span>
        </div>

        {/* Traffic Light Styled Button */}
        <button
          type="button"
          disabled={isRecordingOther}
          onClick={() => isRecordingThis ? handleStopSingleRecord() : handleStartSingleRecord(field)}
          className={`
             w-full py-3 rounded-lg font-bold text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg
             ${isRecordingOther ? 'opacity-20 grayscale cursor-not-allowed' : ''}
             ${isRecordingThis 
                ? `bg-slate-900 border-2 ${recordBorderColor} ${recordTextColor} animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.5)]` 
                : `${btnIdleBg} ${btnIdleHover} ${btnIdleText} ${btnShadow}`
             }
          `}
        >
           {isRecordingThis ? (
             <>
               <Square size={16} fill="currentColor" />
               <span className="font-mono text-lg">{Math.floor(currentElapsed)}s</span>
             </>
           ) : (
             <>
               <Timer size={18} />
               <span>開始計時</span>
             </>
           )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? '編輯路口' : '新增路口'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900">
          <button 
            onClick={() => setActiveTab('BASIC')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'BASIC' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            基礎資訊
          </button>
          <button 
            onClick={() => setActiveTab('TIMING')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'TIMING' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            燈號秒數
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'BASIC' ? (
            <div className="space-y-6">
              {/* Name Input with GPS */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  路口名稱 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="例：信義路五段與松智路口"
                    className={`flex-1 bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-2 focus:outline-none ${formError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-blue-500'}`}
                  />
                  <button
                    type="button"
                    onClick={handleGeoLocation}
                    disabled={isLocating}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors flex items-center justify-center w-12"
                    title="使用 GPS 定位"
                  >
                    {isLocating ? <Loader2 className="animate-spin" size={20} /> : <LocateFixed size={20} />}
                  </button>
                </div>
                {formError && (
                  <div className="flex items-center gap-1 text-red-400 text-xs mt-1 animate-pulse">
                    <AlertCircle size={12} />
                    <span>{formError}</span>
                  </div>
                )}
                {geoError && <p className="text-red-400 text-xs mt-1">{geoError}</p>}
              </div>

              {/* Start Time (Custom 3-part input for mobile compatibility) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">每日啟動時間 (綠燈起點)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={startH}
                      onChange={(e) => handleTimePartChange('h', e.target.value)}
                      onBlur={handleTimeBlur}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-1 bottom-1 text-[10px] text-slate-500">時</span>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={startM}
                      onChange={(e) => handleTimePartChange('m', e.target.value)}
                      onBlur={handleTimeBlur}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                     <span className="absolute right-1 bottom-1 text-[10px] text-slate-500">分</span>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={startS}
                      onChange={(e) => handleTimePartChange('s', e.target.value)}
                      onBlur={handleTimeBlur}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                     <span className="absolute right-1 bottom-1 text-[10px] text-slate-500">秒</span>
                  </div>
                </div>
              </div>

              {/* Active Loops Configuration (Split into Back/Forward) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">運作範圍設定 (單位: 循環數)</label>
                <div className="flex gap-2">
                   {/* Backward Loops */}
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ArrowLeft size={10} /> 往回推 (負循環)
                     </label>
                     <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <input
                           type="number"
                           min="0"
                           max="1000"
                           value={negativeLoops}
                           onChange={(e) => setNegativeLoops(Math.max(0, parseInt(e.target.value) || 0))}
                           className="w-full bg-transparent text-white focus:outline-none text-right font-mono"
                        />
                     </div>
                   </div>

                   {/* Forward Loops */}
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        往後推 (正循環) <ArrowRight size={10} />
                     </label>
                     <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <input
                           type="number"
                           min="1"
                           max="1000"
                           value={activeLoops}
                           onChange={(e) => setActiveLoops(Math.max(1, parseInt(e.target.value) || 0))}
                           className="w-full bg-transparent text-white focus:outline-none text-right font-mono"
                        />
                     </div>
                   </div>
                </div>

                <div className="text-slate-400 text-xs mt-1 bg-slate-800/50 p-3 rounded border border-slate-700">
                  <div className="flex justify-between mb-1">
                     <span>單一週期長度:</span>
                     <span className="text-white font-mono">{totalCycle} 秒</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700 mt-2">
                     <span>有效運作區間:</span>
                     <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                           <span className="text-blue-400 font-bold font-mono text-sm">{effectiveStart}</span>
                           {startIsYesterday && <span className="text-[9px] bg-slate-700 px-1 rounded text-slate-300">前一日</span>}
                        </div>
                        <span className="text-slate-500 text-[10px] block text-center leading-none my-0.5">▼</span>
                        <div className="flex items-center justify-end gap-1">
                           <span className="text-blue-400 font-bold font-mono text-sm">{effectiveEnd}</span>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsManualMode(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isManualMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  手動輸入
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isManualMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  互動錄製 (引導式)
                </button>
              </div>

              {isManualMode ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderManualTimerCard(
                    "綠燈", 
                    "green", 
                    green, 
                    setGreen,
                    "text-emerald-400", // label color
                    "border-emerald-900/50", // input border
                    // Button Idle
                    "bg-emerald-600",
                    "hover:bg-emerald-500",
                    "text-white",
                    "shadow-emerald-900/40",
                    // Button Active
                    "border-emerald-500",
                    "text-emerald-500"
                  )}
                  {renderManualTimerCard(
                    "黃燈", 
                    "yellow", 
                    yellow, 
                    setYellow,
                    "text-amber-400",
                    "border-amber-900/50",
                    // Button Idle
                    "bg-amber-400",
                    "hover:bg-amber-300",
                    "text-black", // Black text for yellow bg
                    "shadow-amber-900/40",
                     // Button Active
                     "border-amber-400",
                     "text-amber-400"
                  )}
                  {renderManualTimerCard(
                    "紅燈", 
                    "red", 
                    red, 
                    setRed,
                    "text-red-400",
                    "border-red-900/50",
                     // Button Idle
                     "bg-red-600",
                     "hover:bg-red-500",
                     "text-white",
                     "shadow-red-900/40",
                     // Button Active
                     "border-red-500",
                     "text-red-500"
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 py-2">
                  {/* Visualizer */}
                  <div className="relative">
                     <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-3xl font-bold font-mono transition-colors duration-200
                        ${recordingState === RecordingState.RECORDING_GREEN ? 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 
                          recordingState === RecordingState.RECORDING_YELLOW ? 'bg-amber-400 border-amber-200 text-black shadow-[0_0_30px_rgba(251,191,36,0.5)]' :
                          recordingState === RecordingState.RECORDING_RED ? 'bg-red-500 border-red-300 text-black shadow-[0_0_30px_rgba(239,68,68,0.5)]' :
                          'bg-slate-800 border-slate-600 text-slate-500'
                        }
                     `}>
                       {recordingState === RecordingState.IDLE ? '準備' : 
                        Math.floor(currentElapsed)}
                     </div>
                  </div>

                  {/* Controls */}
                  <div className="w-full flex justify-center gap-4">
                    {recordingState === RecordingState.IDLE && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold transition-transform active:scale-95"
                      >
                        <Play size={20} fill="currentColor" /> 開始 (綠燈)
                      </button>
                    )}

                    {(recordingState === RecordingState.RECORDING_GREEN) && (
                      <button
                        type="button"
                        onClick={nextPhase}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-full font-bold transition-transform active:scale-95"
                      >
                         切換黃燈
                      </button>
                    )}

                    {(recordingState === RecordingState.RECORDING_YELLOW) && (
                      <button
                        type="button"
                        onClick={nextPhase}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold transition-transform active:scale-95"
                      >
                         切換紅燈
                      </button>
                    )}

                    {(recordingState === RecordingState.RECORDING_RED) && (
                       <button
                       type="button"
                       onClick={nextPhase}
                       className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-bold transition-transform active:scale-95"
                     >
                        <StopCircle size={20} /> 結束 (完成)
                     </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 text-center max-w-xs">
                    提示：錄製結束後將自動更新秒數設定。
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-800">
           {/* Left side delete button (only for editing) */}
           <div>
            {initialData && onDelete && (
               <button 
               type="button"
               onClick={handleDelete}
               className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors font-medium text-sm"
             >
               <Trash2 size={16} /> 刪除路口
             </button>
            )}
           </div>

           {/* Right side actions */}
           <div className="flex gap-3">
            <button 
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors font-medium"
            >
              取消
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all font-medium"
            >
              儲存設定
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IntersectionForm;