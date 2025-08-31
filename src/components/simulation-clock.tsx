"use client";

import { useSimulationTime } from "@/hooks/use-simulation-time";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, FastForward, Rewind, RotateCw } from 'lucide-react';

export default function SimulationClock() {
  const {
    time,
    isPaused,
    speed,
    togglePause,
    setSimulationSpeed,
    resetSimulation,
  } = useSimulationTime();

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="flex items-center gap-4">
       <Card className="flex items-center justify-center p-2 px-4 shadow-inner bg-muted">
        <span className="text-xl font-bold font-mono tracking-wider text-foreground">
            {formattedTime}
        </span>
       </Card>
       <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={resetSimulation}>
                <RotateCw className="w-4 h-4" />
                <span className="sr-only">Reset Simulation</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSimulationSpeed(1)} className={speed === 1 ? 'bg-accent' : ''}>
                <Rewind className="w-4 h-4" />
                <span className="sr-only">Normal Speed</span>
            </Button>
            <Button variant="outline" size="icon" onClick={togglePause}>
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span className="sr-only">{isPaused ? 'Play' : 'Pause'}</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSimulationSpeed(5)} className={speed === 5 ? 'bg-accent' : ''}>
                <FastForward className="w-4 h-4" />
                <span className="sr-only">Fast Forward</span>
            </Button>
       </div>
    </div>
  );
}
