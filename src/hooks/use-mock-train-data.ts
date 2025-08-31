
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Train, TrainStatus, Track, Segment } from '@/types';
import { tracks as initialTracks, stations } from '@/data/network';
import { useSimulationTime } from './use-simulation-time';
import { getPointOnCurve, formatTime } from '@/lib/utils';
import type { OptimizeScheduleOnDelayOutput } from '@/ai/flows/optimize-schedule-on-delay';
import { findShortestPath } from '@/lib/graph';


const INITIAL_TRAINS: Omit<Train, 'position' | 'currentSegment' | 'segmentProgress' | 'status' | 'currentSpeed' | 'path' | 'totalDistance'>[] = [
  // Long distance expresses on Delhi-Prayagraj Line
  { id: 'TRN12301', speed: 130, platform: 1, departureTime: '08:00', originStationId: 'NDLS', destinationStationId: 'PRYJ' },
  { id: 'TRN12417', speed: 120, platform: 2, departureTime: '08:15', originStationId: 'PRYJ', destinationStationId: 'NDLS' },
  
  // Train using the Agra loop
  { id: 'TRN12874', speed: 110, platform: 3, departureTime: '08:30', originStationId: 'NDLS', destinationStationId: 'CNB' },
  
  // Train on the Northern Line
  { id: 'TRN14512', speed: 90, platform: 4, departureTime: '08:05', originStationId: 'SRE', destinationStationId: 'DLI' },

  // Train on the Bareilly Line
  { id: 'TRN14319', speed: 80, platform: 5, departureTime: '09:00', originStationId: 'BE', destinationStationId: 'ALJN' },
  
  // Train on the Rohtak Line
  { id: 'TRN14731', speed: 95, platform: 6, departureTime: '08:10', originStationId: 'JIND', destinationStationId: 'DLI' },
  
  // ***** NEW TRAINS FOR COMPLEX NETWORK *****
  
  // Lucknow Shatabdi
  { id: 'TRN12004', speed: 140, platform: 7, departureTime: '08:20', originStationId: 'NDLS', destinationStationId: 'LKO' },
  { id: 'TRN12003', speed: 140, platform: 8, departureTime: '09:05', originStationId: 'LKO', destinationStationId: 'NDLS' },
  
  // Prayagraj -> Varanasi Intercity
  { id: 'TRN14259', speed: 100, platform: 9, departureTime: '08:40', originStationId: 'PRYJ', destinationStationId: 'BSB' },

  // Goods train using bypass
  { id: 'GOODS01', speed: 75, platform: 10, departureTime: '08:50', originStationId: 'TDL', destinationStationId: 'FTP' },

  // Passenger train around Prayagraj
  { id: 'PSG54101', speed: 60, platform: 11, departureTime: '09:15', originStationId: 'CNB', destinationStationId: 'PCOI' }
];


const stationById = (id: string) => stations.find(s => s.id === id);

const createSegmentsFromTracks = (tracks: Track[]): Segment[] => {
    const segments: Segment[] = [];
    const segmentCache = new Set<string>();
    const stationMap = new Map(stations.map(s => [`${s.position.x},${s.position.y}`, s.id]));

    tracks.forEach(track => {
        const stationPointsWithIndices = track.points
            .map((point, index) => ({
                point,
                index,
                stationId: stationMap.get(`${point.x},${point.y}`)
            }))
            .filter(item => item.stationId);

        for (let i = 0; i < stationPointsWithIndices.length - 1; i++) {
            const startItem = stationPointsWithIndices[i];
            const endItem = stationPointsWithIndices[i + 1];

            if (startItem.stationId && endItem.stationId) {
                const startStationId = startItem.stationId;
                const endStationId = endItem.stationId;
                
                const segmentId = `${track.id}-${startStationId}-${endStationId}`;
                const reverseSegmentId = `${track.id}-${endStationId}-${startStationId}`;

                if (!segmentCache.has(segmentId) && !segmentCache.has(reverseSegmentId)) {
                    const segmentPoints = track.points.slice(startItem.index, endItem.index + 1);
                    if (segmentPoints.length >= 2) {
                        segments.push({
                            id: segmentId,
                            trackId: track.id,
                            points: segmentPoints,
                            startStationId: startStationId,
                            endStationId: endStationId,
                        });
                        segmentCache.add(segmentId);
                    }
                }
            }
        }
    });

    return segments;
};

const allSegments = createSegmentsFromTracks(initialTracks);

const findSegment = (startStationId: string, endStationId: string, availableSegments: Segment[]): Segment | undefined => {
    return availableSegments.find(s => 
        (s.startStationId === startStationId && s.endStationId === endStationId) ||
        (s.startStationId === endStationId && s.endStationId === startStationId)
    );
};

const initializeTrains = (): Train[] => {
  return INITIAL_TRAINS.map((trainData) => {
    const originStation = stationById(trainData.originStationId);
    if (!originStation) throw new Error(`Origin station ${trainData.originStationId} not found for train ${trainData.id}`);
    
    const shortestPath = findShortestPath(trainData.originStationId, trainData.destinationStationId);
    if (!shortestPath || shortestPath.path.length < 2) {
      console.error(`No path found for train ${trainData.id} from ${trainData.originStationId} to ${trainData.destinationStationId}`);
      return {
        ...trainData,
        path: [trainData.originStationId],
        totalDistance: 0,
        status: 'stopped',
        currentSpeed: 0,
        position: { ...originStation.position },
        currentSegment: null,
        segmentProgress: 0,
      };
    }

    const firstSegment = findSegment(shortestPath.path[0], shortestPath.path[1], allSegments);
    
    return {
      ...trainData,
      path: shortestPath.path,
      totalDistance: shortestPath.distance,
      status: 'scheduled',
      currentSpeed: 0,
      position: { ...originStation.position },
      currentSegment: firstSegment || null,
      segmentProgress: 0,
    };
  });
};

export const calculateEta = (train: Train, departureTime: Date): string => {
    if (train.status === 'scheduled' || train.status === 'finished' || train.totalDistance === 0 || train.speed === 0) {
        return 'N/A';
    }
    // A simplified distance unit to km conversion factor. This is arbitrary and for simulation purposes.
    const DISTANCE_UNIT_TO_KM = 0.5; 
    const totalDistanceKm = train.totalDistance * DISTANCE_UNIT_TO_KM;
    const travelTimeHours = totalDistanceKm / train.speed;
    const travelTimeMilliseconds = travelTimeHours * 60 * 60 * 1000;
    const etaDate = new Date(departureTime.getTime() + travelTimeMilliseconds);
    return formatTime(etaDate);
};


export function useMockTrainData() {
  const { time, isPaused, speed, resetVersion } = useSimulationTime();
  
  const [segments, setSegments] = useState<Segment[]>(allSegments);
  const [trains, setTrains] = useState<Train[]>(() => initializeTrains());

  const animationFrameId = useRef<number>();

  useEffect(() => {
    setSegments(allSegments);
    setTrains(initializeTrains());
  }, [resetVersion]);


  const updateTrainPositions = useCallback(() => {
    setTrains(currentTrains => {
      return currentTrains.map(train => {
        let updatedTrain = { ...train };
        
        if (updatedTrain.status === 'scheduled') {
          const [hours, minutes] = updatedTrain.departureTime.split(':').map(Number);
          const departureDate = new Date(time);
          departureDate.setHours(hours, minutes, 0, 0);

          if (time >= departureDate) {
              updatedTrain.status = 'moving';
              updatedTrain.currentSpeed = updatedTrain.speed;
          }
        }

        if (updatedTrain.status !== 'moving' || isPaused || !updatedTrain.currentSegment) {
          return updatedTrain;
        }
        
        const currentPathIndex = updatedTrain.path.indexOf(updatedTrain.currentSegment.startStationId);
        let segmentReversed = false;

        if (currentPathIndex === -1 || updatedTrain.path[currentPathIndex + 1] !== updatedTrain.currentSegment.endStationId) {
            const reverseIndex = updatedTrain.path.indexOf(updatedTrain.currentSegment.endStationId);
            if (reverseIndex !== -1 && updatedTrain.path[reverseIndex + 1] === updatedTrain.currentSegment.startStationId) {
                segmentReversed = true;
            } else {
                 console.warn(`Train ${updatedTrain.id} is on a segment not matching its path. Stopping.`);
                 return { ...updatedTrain, status: 'stopped', currentSpeed: 0 };
            }
        }
        
        const speedFactor = 0.0002 * (updatedTrain.currentSpeed / 100) * speed;
        let newProgress = updatedTrain.segmentProgress + speedFactor;
       
        if (newProgress >= 1) { // Move to the next segment
            const lastStationIdInSegment = segmentReversed ? updatedTrain.currentSegment.startStationId : updatedTrain.currentSegment.endStationId;
            const currentStationIndexInPath = updatedTrain.path.indexOf(lastStationIdInSegment);
            
            // Check if the train has reached its final destination.
            if (lastStationIdInSegment === updatedTrain.destinationStationId) {
                const destStation = stationById(updatedTrain.destinationStationId);
                return {
                    ...updatedTrain,
                    status: 'finished',
                    currentSpeed: 0,
                    position: destStation?.position || updatedTrain.position,
                    segmentProgress: 1,
                    currentSegment: null,
                };
            }

            if (currentStationIndexInPath === -1 || currentStationIndexInPath + 1 >= updatedTrain.path.length) {
                console.error(`Train ${updatedTrain.id} path logic error. Stopping.`);
                const destStation = stationById(updatedTrain.destinationStationId);
                 return {
                    ...updatedTrain,
                    status: 'finished',
                    currentSpeed: 0,
                    position: destStation?.position || updatedTrain.position,
                    segmentProgress: 1,
                    currentSegment: null,
                };
            }

            const nextStartStationId = lastStationIdInSegment;
            const nextEndStationId = updatedTrain.path[currentStationIndexInPath + 1];
            
            const nextSegment = findSegment(nextStartStationId, nextEndStationId, segments);
            if (nextSegment) {
                updatedTrain.currentSegment = nextSegment;
                updatedTrain.segmentProgress = newProgress - 1; // Carry over excess progress
            } else { // Path is broken
                const lastReachedStation = stationById(nextStartStationId);
                console.warn(`Train ${updatedTrain.id} path broken. Stopping at ${nextStartStationId}.`);
                return {
                    ...updatedTrain,
                    status: 'stopped',
                    currentSpeed: 0,
                    position: lastReachedStation?.position || updatedTrain.position,
                    segmentProgress: 1,
                };
            }
        } else {
            updatedTrain.segmentProgress = newProgress;
        }
        
        const pointsForCurve = updatedTrain.currentSegment.points;
        const newPosition = getPointOnCurve(pointsForCurve, updatedTrain.segmentProgress, segmentReversed);
        updatedTrain.position = newPosition;

        return updatedTrain;
      });
    });

    animationFrameId.current = requestAnimationFrame(updateTrainPositions);
  }, [time, isPaused, speed, segments]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(updateTrainPositions);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateTrainPositions]);

  const setTrainStatus = useCallback((trainId: string, status: TrainStatus) => {
    setTrains(currentTrains =>
      currentTrains.map(train =>
        train.id === trainId ? { ...train, status, currentSpeed: status === 'moving' ? train.speed : 0 } : train
      )
    );
  }, []);
  
  const applyScheduleActions = useCallback((actions: OptimizeScheduleOnDelayOutput['actions']) => {
    setTrains(currentTrains => {
        const newTrains = [...currentTrains];
        actions.forEach(action => {
            const trainIndex = newTrains.findIndex(t => t.id === action.trainId);
            if (trainIndex === -1) return;

            const train = newTrains[trainIndex];

            switch (action.action) {
                case 'reroute':
                    if (action.newPath && action.newPath.length > 1) {
                        const newPathData = findShortestPath(train.originStationId, train.destinationStationId); // Recalculate based on current graph state
                        if (!newPathData) {
                            console.error(`Reroute failed for ${train.id}, no new path found.`);
                            newTrains[trainIndex] = { ...train, status: 'stopped', currentSpeed: 0 };
                            break;
                        }

                        let currentStationId: string | undefined;
                        // Find the most recently passed station
                        const currentPathIdx = train.path.indexOf(train.currentSegment?.startStationId ?? '');
                        if (currentPathIdx !== -1) {
                            currentStationId = train.segmentProgress < 0.1 ? train.path[currentPathIdx] : train.path[currentPathIdx + 1];
                        } else {
                            currentStationId = train.path.find(id => newPathData.path.includes(id));
                        }
                        currentStationId = currentStationId || newPathData.path[0];
                        
                        const currentStationIndexInNewPath = newPathData.path.indexOf(currentStationId);
                        
                        if (currentStationIndexInNewPath !== -1 && currentStationIndexInNewPath < newPathData.path.length - 1) {
                            const nextStationId = newPathData.path[currentStationIndexInNewPath + 1];
                            const nextSegment = findSegment(currentStationId, nextStationId, segments);
                            
                            if (nextSegment) {
                                newTrains[trainIndex] = { 
                                    ...train, 
                                    path: newPathData.path,
                                    totalDistance: newPathData.distance,
                                    status: 'moving', 
                                    currentSpeed: train.speed,
                                    currentSegment: nextSegment,
                                    segmentProgress: 0,
                                };
                            } else {
                                console.warn(`No segment found for reroute: ${currentStationId} -> ${nextStationId}`);
                                newTrains[trainIndex] = { ...train, status: 'stopped', currentSpeed: 0, path: newPathData.path };
                            }
                        } else {
                             console.warn(`Current station ${currentStationId} not found or is last stop in new path for train ${train.id}`);
                             newTrains[trainIndex] = { ...train, status: 'stopped', currentSpeed: 0, path: newPathData.path };
                        }
                    }
                    break;
                case 'hold':
                    newTrains[trainIndex] = { ...train, status: 'stopped', currentSpeed: 0 };
                    break;
                case 'resume':
                    newTrains[trainIndex] = { ...train, status: 'moving', currentSpeed: train.speed };
                    break;
                case 'adjust_speed':
                     if (action.newSpeed) {
                        newTrains[trainIndex] = { ...train, currentSpeed: action.newSpeed, speed: action.newSpeed };
                     }
                    break;
            }
        });
        return newTrains;
    });
  }, [segments]);

  const removeSegment = useCallback((segmentId: string): Segment[] => {
    let newSegments: Segment[] = [];
    setSegments(currentSegments => {
        newSegments = currentSegments.filter(segment => segment.id !== segmentId);
        return newSegments;
    });
    return newSegments;
  }, []);

  return { trains, segments, setTrainStatus, applyScheduleActions, removeSegment };
}
