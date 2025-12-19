export interface TrafficLightTimings {
  green: number;
  yellow: number;
  red: number;
}

export interface Intersection {
  id: string;
  name: string;
  startTime: string; // Format "HH:mm:ss"
  activeLoops: number; // Loops AFTER start time
  negativeLoops?: number; // Loops BEFORE start time
  timings: TrafficLightTimings;
}

export type IntersectionStatus = 'ACTIVE' | 'STANDBY';

export type LightColor = 'RED' | 'YELLOW' | 'GREEN' | 'OFF';

export interface TrafficState {
  currentLight: LightColor;
  countdown: number;
  isBlinking: boolean; // For standby mode
}

export enum RecordingState {
  IDLE = 'IDLE',
  RECORDING_GREEN = 'RECORDING_GREEN',
  RECORDING_YELLOW = 'RECORDING_YELLOW',
  RECORDING_RED = 'RECORDING_RED',
  FINISHED = 'FINISHED'
}

export interface GitHubSettings {
  token: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
}