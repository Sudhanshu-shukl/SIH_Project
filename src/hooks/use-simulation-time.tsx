"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const START_TIME = new Date();
START_TIME.setHours(8, 0, 0, 0);
const TIME_MULTIPLIER = 60; // Each real second is 60 simulated seconds (1 minute)

interface SimulationContextType {
  time: Date;
  isPaused: boolean;
  speed: number;
  togglePause: () => void;
  setSimulationSpeed: (speed: number) => void;
  resetSimulation: () => void;
  resetVersion: number;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [time, setTime] = useState(START_TIME);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetVersion, setResetVersion] = useState(0);
  
  const lastUpdateTime = useRef(Date.now());
  const animationFrameId = useRef<number>();

  const advanceTime = useCallback(() => {
    if (!isPaused) {
      const now = Date.now();
      const delta = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      setTime(prevTime => {
        const newTime = new Date(prevTime.getTime() + delta * TIME_MULTIPLIER * speed);
        return newTime;
      });
    }
    animationFrameId.current = requestAnimationFrame(advanceTime);
  }, [isPaused, speed]);

  useEffect(() => {
    lastUpdateTime.current = Date.now();
    animationFrameId.current = requestAnimationFrame(advanceTime);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [advanceTime]);

  const togglePause = () => {
    setIsPaused(prev => {
        if (!prev) { // If we are about to pause
            // Nothing needed here right now
        } else { // If we are about to play
            lastUpdateTime.current = Date.now();
        }
        return !prev;
    });
  };

  const setSimulationSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const resetSimulation = () => {
    setTime(START_TIME);
    setIsPaused(false);
    setSpeed(1);
    lastUpdateTime.current = Date.now();
    setResetVersion(v => v + 1);
  };

  return (
    <SimulationContext.Provider value={{ time, isPaused, speed, togglePause, setSimulationSpeed, resetSimulation, resetVersion }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulationTime = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulationTime must be used within a SimulationProvider');
  }
  return context;
};
