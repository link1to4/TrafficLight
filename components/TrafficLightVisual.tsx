import React from 'react';
import { LightColor } from '../types';

interface TrafficLightVisualProps {
  currentLight: LightColor;
  countdown?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TrafficLightVisual: React.FC<TrafficLightVisualProps> = ({ 
  currentLight, 
  countdown, 
  size = 'md',
  className = '' 
}) => {
  
  const sizeClasses = {
    sm: 'p-2 gap-2',
    md: 'p-3 gap-3',
    lg: 'p-4 gap-4'
  };

  const circleSize = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-3xl'
  };

  const getLightStyle = (color: LightColor, activeColor: LightColor) => {
    const isActive = color === activeColor;
    // Taiwan style: Dark housing, strong LED colors. Green is usually Emerald/Teal.
    const base = "rounded-full transition-all duration-300 flex items-center justify-center font-bold font-mono relative overflow-hidden";
    
    // Simulate the "hood" or visor shadow with an inner shadow or gradient
    let bg = "bg-slate-950"; // Dark off state (black housing look)
    let shadow = "inner-shadow"; // Custom feel
    let border = "border-2 border-slate-700";
    let text = "text-transparent";
    let glow = "";

    if (isActive) {
      if (color === 'RED') {
        bg = "bg-red-600";
        // Taiwan LEDs are bright. Strong outer glow.
        glow = "shadow-[0_0_25px_8px_rgba(220,38,38,0.6)] ring-2 ring-red-400";
        border = "border-red-500";
        text = "text-white"; 
      } else if (color === 'YELLOW') {
        bg = "bg-amber-400";
        glow = "shadow-[0_0_25px_8px_rgba(251,191,36,0.6)] ring-2 ring-amber-200";
        border = "border-amber-300";
        text = "text-black";
      } else if (color === 'GREEN') {
        // Taiwan Green is more Emerald/Teal
        bg = "bg-emerald-500";
        glow = "shadow-[0_0_25px_8px_rgba(16,185,129,0.6)] ring-2 ring-emerald-300";
        border = "border-emerald-400";
        text = "text-white";
      }
    } else {
        // Dimmed state - looks like dark glass
         if (color === 'RED') bg = "bg-red-950/30";
         else if (color === 'YELLOW') bg = "bg-amber-950/30";
         else if (color === 'GREEN') bg = "bg-emerald-950/30";
         text = "text-transparent";
    }

    return `${base} ${bg} ${glow} ${border} ${circleSize[size]} ${text}`;
  };

  return (
    <div className={`bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl flex flex-row items-center justify-center ${sizeClasses[size]} ${className}`}>
      {/* Top Cap/Hood styling simulation could go here, but keeping it clean for CSS */}
      <div className={getLightStyle('RED', currentLight)}>
        {/* LED Grid effect overlay could go here */}
        <span className="z-10">{currentLight === 'RED' && countdown !== undefined && countdown}</span>
      </div>
      <div className={getLightStyle('YELLOW', currentLight)}>
         <span className="z-10">{currentLight === 'YELLOW' && countdown !== undefined && countdown}</span>
      </div>
      <div className={getLightStyle('GREEN', currentLight)}>
         <span className="z-10">{currentLight === 'GREEN' && countdown !== undefined && countdown}</span>
      </div>
    </div>
  );
};

export default TrafficLightVisual;