export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour12: false });
};

export const getSecondsFromMidnight = (timeStr: string): number => {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
};

export const getCurrentTimeSeconds = (): number => {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
};

export const secondsToTimeStr = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
