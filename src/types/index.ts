export interface Point {
  x: number;
  y: number;
}

export interface Station {
  id: string;
  name: string;
  position: Point;
}

export interface Track {
  id: string;
  points: Point[];
}

export interface Segment {
    id: string;
    trackId: string;
    points: Point[];
    startStationId: string;
    endStationId: string;
}

export type TrainStatus = 'moving' | 'stopped' | 'scheduled' | 'finished';

export interface Train {
  id: string;
  status: TrainStatus;
  speed: number; // Target speed
  currentSpeed: number; // Actual current speed
  platform: number;
  path: string[]; // Sequence of station IDs
  originStationId: string;
  destinationStationId: string;
  position: Point;
  departureTime: string;
  // Internal animation state
  currentSegment: Segment | null;
  segmentProgress: number;
  // Calculated properties
  totalDistance: number;
}
