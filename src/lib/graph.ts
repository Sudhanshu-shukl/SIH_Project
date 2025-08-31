import { stations, tracks } from '@/data/network';
import type { Station, Point, Track, Segment } from '@/types';

// Type definitions for our graph
type Graph = Map<string, Map<string, number>>;

// We need to store segments to rebuild the graph if they are removed.
let availableSegments: Segment[] = [];

// Helper function to calculate Euclidean distance between two points
const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const createSegmentsFromTracks = (tracks: Track[]): Segment[] => {
    const segments: Segment[] = [];
    const segmentCache = new Set<string>();
    const stationMap = new Map(stations.map(s => [`${s.position.x},${s.position.y}`, s]));

    tracks.forEach(track => {
        const stationIndices: number[] = [];
        track.points.forEach((point, index) => {
            const key = `${point.x},${point.y}`;
            if (stationMap.has(key)) {
                stationIndices.push(index);
            }
        });

        for (let i = 0; i < stationIndices.length - 1; i++) {
            const startIndex = stationIndices[i];
            const endIndex = stationIndices[i + 1];

            const startPoint = track.points[startIndex];
            const endPoint = track.points[endIndex];
            
            const startStation = stationMap.get(`${startPoint.x},${startPoint.y}`);
            const endStation = stationMap.get(`${endPoint.x},${endPoint.y}`);

            if (startStation && endStation) {
                const segmentId = `${track.id}-${startStation.id}-${endStation.id}`;
                const reverseSegmentId = `${track.id}-${endStation.id}-${startStation.id}`;

                if (!segmentCache.has(segmentId) && !segmentCache.has(reverseSegmentId)) {
                    const segmentPoints = track.points.slice(startIndex, endIndex + 1);
                    segments.push({
                        id: segmentId,
                        trackId: track.id,
                        points: segmentPoints,
                        startStationId: startStation.id,
                        endStationId: endStation.id,
                    });
                    segmentCache.add(segmentId);
                }
            }
        }
    });

    return segments;
};

const createGraph = (currentSegments: Segment[]): Graph => {
  const graph: Graph = new Map();

  // Add all stations as nodes to the graph
  for (const station of stations) {
    graph.set(station.id, new Map());
  }

  // Add edges based on the currently available segments
  for (const segment of currentSegments) {
      let distance = 0;
      for (let j = 0; j < segment.points.length - 1; j++) {
          distance += calculateDistance(segment.points[j], segment.points[j+1]);
      }

      // Add bidirectional edges
      graph.get(segment.startStationId)?.set(segment.endStationId, distance);
      graph.get(segment.endStationId)?.set(segment.startStationId, distance);
  }

  return graph;
};


// Dijkstra's Algorithm Implementation
export const findShortestPath = (startId: string, endId: string): { path: string[], distance: number } | null => {
  // Always rebuild the graph with the latest available segments
  const graph = createGraph(availableSegments);

  const distances = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const pq = new Set<string>();

  for (const stationId of graph.keys()) {
    distances.set(stationId, Infinity);
    prev.set(stationId, null);
    pq.add(stationId);
  }

  distances.set(startId, 0);

  while (pq.size > 0) {
    let u: string | null = null;
    for (const v of pq) {
      if (u === null || (distances.get(v) ?? Infinity) < (distances.get(u) ?? Infinity)) {
        u = v;
      }
    }
    
    if (u === null || u === endId) break;
    
    pq.delete(u);

    const neighbors = graph.get(u);
    if (neighbors) {
        for (const [v, weight] of neighbors.entries()) {
            if (pq.has(v)) {
                const alt = (distances.get(u) ?? Infinity) + weight;
                if (alt < (distances.get(v) ?? Infinity)) {
                    distances.set(v, alt);
                    prev.set(v, u);
                }
            }
        }
    }
  }

  const path: string[] = [];
  let current: string | null = endId;
  const totalDistance = distances.get(endId);
  
  if (totalDistance === Infinity) {
    return null; // No path found
  }

  while (current) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }
  
  if (path[0] === startId) {
      return { path, distance: totalDistance! };
  }

  return null;
};

// Function for the hook to update the available segments
export const updateAvailableSegments = (segments: Segment[]) => {
    availableSegments = segments;
}

// Initialize the segments on module load
availableSegments = createSegmentsFromTracks(tracks);
