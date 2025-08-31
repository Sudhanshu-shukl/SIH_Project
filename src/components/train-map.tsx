
"use client";

import { useState, useEffect, useRef, WheelEvent } from 'react';
import { stations } from '@/data/network';
import { useMockTrainData, calculateEta } from '@/hooks/use-mock-train-data';
import { useToast } from "@/hooks/use-toast";
import { getOptimizedSchedule } from '@/app/actions';
import TrainDetailsSidebar from './train-details-sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Train, TrainStatus, Point, Segment } from '@/types';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimizeScheduleOnDelayOutput } from '@/ai/flows/optimize-schedule-on-delay';
import { updateAvailableSegments } from '@/lib/graph';

const getTrainStatusClass = (status: TrainStatus) => {
  switch (status) {
    case 'moving':
      return 'fill-chart-2 stroke-green-700';
    case 'stopped':
      return 'fill-destructive stroke-red-800';
    case 'scheduled':
      return 'fill-muted-foreground stroke-gray-500';
    case 'finished':
      return 'fill-purple-500 stroke-purple-700';
    default:
      return 'fill-muted-foreground';
  }
};

const getInitialViewBox = (segments: any[]) => {
  const allPoints = segments.flatMap(segment => segment.points);
  if (allPoints.length === 0) {
    return { x: 0, y: 0, width: 1200, height: 800 };
  }

  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const padding = 100;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const x = minX - padding;
  const y = minY - padding;

  return { x, y, width, height };
};


const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

const createCurvePath = (points: Point[], tension = 0.5, closed = false): string => {
    if (points.length < 2) return '';
    if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }

    let path = `M ${points[0].x},${points[0].y}`;
    const allPoints = points;

    for (let i = 0; i < allPoints.length - 1; i++) {
        const p0 = i > 0 ? allPoints[i - 1] : allPoints[i];
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        const p3 = i < allPoints.length - 2 ? allPoints[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
        
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
};


export default function TrainMap() {
  const { trains, segments, setTrainStatus, applyScheduleActions, removeSegment } = useMockTrainData();
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [hoveredTrain, setHoveredTrain] = useState<Train | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const prevTrainStatuses = useRef<Map<string, TrainStatus>>(new Map());

  const [initialViewBox] = useState(() => getInitialViewBox(segments));
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);


  useEffect(() => {
    trains.forEach(train => {
      const prevStatus = prevTrainStatuses.current.get(train.id);
      if (prevStatus === 'moving' && train.status === 'stopped') {
        handleTrainDelay(train, `Train ${train.id} has been delayed.`);
      }
      prevTrainStatuses.current.set(train.id, train.status);

      if (hoveredTrain && train.id === hoveredTrain.id) {
        setHoveredTrain(train);
      }
      if (selectedTrain && train.id === selectedTrain.id) {
        setSelectedTrain(train);
      }
    });
  }, [trains]);
  
  const handleAiResponse = (data: OptimizeScheduleOnDelayOutput) => {
    toast({
        title: "AI Schedule Optimization Complete",
        description: (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                <p className="font-semibold">{data.summary}</p>
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                    {data.actions.map((action, index) => (
                        <li key={index}>
                            <strong>{action.trainId}:</strong> {action.action} - {action.reason}
                        </li>
                    ))}
                </ul>
            </div>
        ),
        duration: 20000 
    });

    applyScheduleActions(data.actions);
  };

  const handleTrainDelay = async (delayedTrain: Train, reason: string) => {
    toast({
      title: "Optimizing Schedule...",
      description: `${reason} Running AI optimization...`,
    });

    const otherTrains = trains.filter(t => t.id !== delayedTrain.id);
    const result = await getOptimizedSchedule({ 
      delayedTrain, 
      otherTrains,
      delayDuration: 15,
      disruptionType: 'delay'
    });

    if (result.success && result.data) {
        handleAiResponse(result.data);
    } else {
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: result.error,
      });
    }
  };

  const handleTrackRemoval = async (removedSegment: Segment) => {
    const newSegments = removeSegment(removedSegment.id);
    updateAvailableSegments(newSegments);

    const affectedTrain = trains.find(train => {
      if (train.status === 'finished' || train.status === 'stopped') return false; 
      
      const currentPathIndex = train.path.indexOf(train.currentSegment?.startStationId ?? '');
      if (currentPathIndex === -1) return false;

      for (let i = currentPathIndex; i < train.path.length - 1; i++) {
        if (
          (train.path[i] === removedSegment.startStationId && train.path[i+1] === removedSegment.endStationId) ||
          (train.path[i] === removedSegment.endStationId && train.path[i+1] === removedSegment.startStationId)
        ) {
          return true;
        }
      }
      return false;
    });

    if (affectedTrain) {
        toast({
            title: "Track Closed! Rerouting...",
            description: `A track segment was removed. Rerouting train ${affectedTrain.id} and others via AI.`,
        });

        const otherTrains = trains.filter(t => t.id !== affectedTrain.id);
        const result = await getOptimizedSchedule({
            delayedTrain: { ...affectedTrain, status: 'stopped' }, // Treat as a disruption
            otherTrains,
            delayDuration: 0, // No delay, it's a pathing issue
            disruptionType: 'track_closure',
        });
        
        if (result.success && result.data) {
            handleAiResponse(result.data);
        } else {
            toast({
                variant: "destructive",
                title: "Rerouting Failed",
                description: result.error,
            });
        }
    }
  };
  
  const handleTrainClick = (train: Train) => {
    setSelectedTrain(train);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setTimeout(() => {
        setSelectedTrain(null);
    }, 300);
  }

  const getPointFromEvent = (event: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).classList.contains('track-path')) {
      return;
    }
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPoint(getPointFromEvent(e));
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const endPoint = getPointFromEvent(e);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    setViewBox(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const { x, y, width, height } = viewBox;
    const CTM = svgRef.current?.getScreenCTM();
    if (!CTM) return;

    const mouseX = (e.clientX - CTM.e) / CTM.a;
    const mouseY = (e.clientY - CTM.f) / CTM.d;

    let newWidth, newHeight;

    if (e.deltaY < 0) { // Zoom in
      newWidth = width / zoomFactor;
      newHeight = height / zoomFactor;
    } else { // Zoom out
      newWidth = width * zoomFactor;
      newHeight = height * zoomFactor;
    }

    if (newWidth / initialViewBox.width > MAX_ZOOM || newWidth / initialViewBox.width < MIN_ZOOM) {
        return;
    }

    setViewBox({
      x: x + (mouseX - x) * (1 - newWidth / width),
      y: y + (mouseY - y) * (1 - newHeight / height),
      width: newWidth,
      height: newHeight,
    });
  };
  
  return (
    <div className="w-full h-full p-4 overflow-hidden">
      <TooltipProvider>
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className={cn("rounded-lg border bg-card shadow-sm", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            <marker id="station-marker" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <circle cx="5" cy="5" r="3" className="fill-muted-foreground" />
            </marker>
          </defs>

          {/* Tracks */}
          <g className="tracks">
            {segments.map(segment => (
              <path
                key={segment.id}
                d={createCurvePath(segment.points)}
                className="stroke-border fill-none transition-all hover:stroke-destructive hover:stroke-[4] cursor-pointer track-path"
                strokeWidth="2"
                onClick={() => handleTrackRemoval(segment)}
              />
            ))}
          </g>

          {/* Stations */}
          <g className="stations">
            {stations.map(station => (
              <g key={station.id} transform={`translate(${station.position.x}, ${station.position.y})`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <circle r="8" className="fill-card stroke-primary stroke-2 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{station.name}</p>
                  </TooltipContent>
                </Tooltip>
                <text x="12" y="5" className="text-sm font-medium fill-foreground select-none pointer-events-none">{station.name}</text>
              </g>
            ))}
          </g>

          {/* Trains */}
          <g className="trains">
            {trains.map(train => (
              <Tooltip key={train.id}>
                <TooltipTrigger asChild>
                  <g 
                    transform={`translate(${train.position.x}, ${train.position.y})`}
                    onClick={() => handleTrainClick(train)}
                    onMouseEnter={() => setHoveredTrain(train)}
                    onMouseLeave={() => setHoveredTrain(null)}
                    className="cursor-pointer"
                  >
                    <circle 
                      r="10"
                      className={cn(
                        'stroke-2 transition-all',
                         getTrainStatusClass(train.status),
                         selectedTrain?.id === train.id ? 'stroke-primary' : 'stroke-transparent'
                      )}
                    >
                        {train.status === 'moving' &&
                            <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
                        }
                    </circle>
                  </g>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-bold">{train.id}</p>
                    <p className='flex items-center'>Status: <span className={cn('capitalize ml-1', {
                        'text-chart-2': train.status === 'moving',
                        'text-destructive': train.status === 'stopped',
                        'text-muted-foreground': train.status === 'scheduled',
                        'text-purple-500': train.status === 'finished'
                    })}>{train.status === 'finished' ? <CheckCircle2 className="w-4 h-4 mr-1"/> : null}{train.status}</span></p>
                    <p>Departure: {train.departureTime}</p>
                    <p>Speed: {train.currentSpeed} km/h</p>
                    <p>ETA: {calculateEta(train, new Date(0))}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
             {/* Hovered Train Speed Indicator */}
            {hoveredTrain && hoveredTrain.status === 'moving' && (
                <g 
                    transform={`translate(${hoveredTrain.position.x + 15}, ${hoveredTrain.position.y - 15})`}
                    className="pointer-events-none transition-opacity"
                >
                    <circle r="12" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1" />
                    <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dy=".3em"
                        className="text-[10px] font-bold fill-foreground"
                    >
                        {hoveredTrain.currentSpeed}
                    </text>
                </g>
            )}
          </g>
        </svg>
      </TooltipProvider>

      <TrainDetailsSidebar
        train={selectedTrain}
        open={isSidebarOpen}
        onOpenChange={handleSidebarClose}
        onSimulateDelay={setTrainStatus}
      />
    </div>
  );
}
