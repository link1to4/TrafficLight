import React, { useMemo } from 'react';
import { Intersection, IntersectionStatus, LightColor } from '../types';
import { getSecondsFromMidnight } from '../utils/timeUtils';
import TrafficLightVisual from './TrafficLightVisual';
import { Trash2, Edit, Clock, MapPin, Activity, Power } from 'lucide-react';

interface IntersectionCardProps {
  data: Intersection;
  currentTime: Date;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const IntersectionCard: React.FC<IntersectionCardProps> = ({
  data,
  currentTime,
  onEdit,
  onDelete,
}) => {
  const { status, lightState } = useMemo(() => {
    const { green, yellow, red } = data.timings;
    const totalCycle = green + yellow + red;

    // Determine Active Window based on activeLoops
    // Default to 20 loops if not defined (backward compatibility)
    const loops = data.activeLoops ?? 20; 
    const activeWindowSeconds = totalCycle * loops;

    const nowSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
    const startSeconds = getSecondsFromMidnight(data.startTime);
    
    // Calculate difference handling day wrap-around
    let diff = Math.abs(nowSeconds - startSeconds);
    if (diff > 43200) diff = 86400 - diff; // Wrap check

    // Check if within the +/- loop window
    const isActive = diff <= activeWindowSeconds;
    const derivedStatus: IntersectionStatus = isActive ? 'ACTIVE' : 'STANDBY';

    let currentLight: LightColor = 'OFF';
    let countdown = 0;

    if (derivedStatus === 'STANDBY') {
      // Blink Yellow every second (even seconds on, odd seconds off)
      currentLight = (Math.floor(nowSeconds) % 2 === 0) ? 'YELLOW' : 'OFF';
    } else {
      // Active Logic
      if (totalCycle > 0) {
        let elapsed = nowSeconds - startSeconds;
        // Normalize elapsed to be positive relative to start (handling wrap)
        // Note: The cycle logic needs to be consistent. 
        // We can just take modulo of totalCycle directly from raw time if aligned to start.
        // Or cleaner: (now - start) % totalCycle. 
        // If (now - start) is negative (e.g. 23:59 vs 00:01), we handle wrap.
        
        let timeDiff = nowSeconds - startSeconds;
        if (timeDiff < 0) timeDiff += 86400; // e.g. Start 23:50, Now 00:10 -> diff 20 mins
        
        // However, if we are "before" the start time but within active window (e.g. 09:55 for 10:00 start),
        // the traffic light logic should probably still just follow the cycle offset from start time.
        // A simple way is just `timeDiff % totalCycle`.
        // But `timeDiff` calculated above assumes forward time. 
        // If we are "before" (e.g. 09:55 for 10:00), timeDiff is large (23h 55m).
        // (large_number) % cycle is fine.
        
        const cyclePosition = timeDiff % totalCycle;

        if (cyclePosition < green) {
          currentLight = 'GREEN';
          countdown = green - cyclePosition;
        } else if (cyclePosition < green + yellow) {
          currentLight = 'YELLOW';
          countdown = (green + yellow) - cyclePosition;
        } else {
          currentLight = 'RED';
          countdown = totalCycle - cyclePosition;
        }
      }
    }

    return { status: derivedStatus, lightState: { currentLight, countdown } };
  }, [data, currentTime]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(data.id);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col hover:border-slate-600 transition-colors group">
      {/* Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin size={18} className="text-blue-400" />
            <span className="truncate max-w-[180px]" title={data.name}>{data.name}</span>
          </h3>
          <div className="text-slate-400 text-xs mt-1 flex items-center gap-2 font-mono">
            <Clock size={12} />
            <span>排程: {data.startTime} (±{data.activeLoops || 20}循環)</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
          status === 'ACTIVE' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-amber-900/50 text-amber-400 border border-amber-800'
        }`}>
          {status === 'ACTIVE' ? <Activity size={12}/> : <Power size={12}/>}
          {status === 'ACTIVE' ? '運行中' : '待機中'}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-wrap items-center justify-between gap-4">
        <TrafficLightVisual 
          currentLight={lightState.currentLight} 
          countdown={status === 'ACTIVE' ? lightState.countdown : undefined} 
          size="sm"
        />
        
        <div className="flex flex-col gap-2 text-right">
          <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">秒數設定</div>
          <div className="flex items-center justify-end gap-2 text-sm">
             <span className="text-slate-400 text-xs mr-1">綠</span>
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             <span className="font-mono">{data.timings.green}s</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm">
             <span className="text-slate-400 text-xs mr-1">黃</span>
             <span className="w-2 h-2 rounded-full bg-amber-400"></span>
             <span className="font-mono">{data.timings.yellow}s</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm">
             <span className="text-slate-400 text-xs mr-1">紅</span>
             <span className="w-2 h-2 rounded-full bg-red-500"></span>
             <span className="font-mono">{data.timings.red}s</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 bg-slate-900/30 border-t border-slate-700 grid grid-cols-2 gap-3">
        <button 
          onClick={() => onEdit(data.id)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
        >
          <Edit size={16} /> 編輯
        </button>
        <button 
          onClick={handleDeleteClick}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-medium transition-colors"
        >
          <Trash2 size={16} /> 刪除
        </button>
      </div>
    </div>
  );
};

export default IntersectionCard;