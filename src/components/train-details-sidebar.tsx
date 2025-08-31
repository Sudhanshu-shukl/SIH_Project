import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Train, TrainStatus } from '@/types';
import { stations } from '@/data/network';
import { AlertTriangle, Clock, Gauge, Tag, Ticket, Milestone, MapPin, CalendarClock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateEta } from '@/hooks/use-mock-train-data';

interface TrainDetailsSidebarProps {
  train: Train | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSimulateDelay: (trainId: string, status: TrainStatus) => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </div>
        <span className="font-medium text-foreground">{value}</span>
    </div>
);

const getStatusVariant = (status: TrainStatus) => {
    switch (status) {
        case 'moving': return 'default';
        case 'stopped': return 'destructive';
        case 'scheduled': return 'secondary';
        case 'finished': return 'default';
        default: return 'outline';
    }
}

const getStatusClass = (status: TrainStatus) => {
    switch (status) {
        case 'moving': return 'bg-green-500 hover:bg-green-600';
        case 'stopped': return ''; // Uses default destructive
        case 'scheduled': return 'bg-blue-500 hover:bg-blue-600';
        case 'finished': return 'bg-purple-500 hover:bg-purple-600';
        default: return '';
    }
}


export default function TrainDetailsSidebar({
  train,
  open,
  onOpenChange,
  onSimulateDelay,
}: TrainDetailsSidebarProps) {
  if (!train) return null;

  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name || stationId;
  };

  const originStationName = getStationName(train.originStationId);
  const destinationStationName = getStationName(train.destinationStationId);
  
  const [hours, minutes] = train.departureTime.split(':').map(Number);
  const departureDate = new Date();
  departureDate.setHours(hours, minutes, 0, 0);
  const eta = calculateEta(train, departureDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-2xl font-headline">
            Train Details
          </SheetTitle>
          <SheetDescription>
            Real-time information for train {train.id}.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        <div className="flex-1 space-y-6">
            <div className="p-4 space-y-4 rounded-lg bg-background">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        <span className="text-lg font-semibold font-headline">{train.id}</span>
                    </div>
                     <Badge variant={getStatusVariant(train.status)} className={cn(getStatusClass(train.status))}>
                        {train.status === 'finished' ? <CheckCircle2 className="w-4 h-4 mr-1"/> : null}
                        {train.status.charAt(0).toUpperCase() + train.status.slice(1)}
                    </Badge>
                </div>

                <Separator />
                
                <DetailItem icon={MapPin} label="Origin" value={originStationName} />
                <DetailItem icon={MapPin} label="Destination" value={destinationStationName} />
                <DetailItem icon={CalendarClock} label="Departure" value={train.departureTime} />
                <DetailItem icon={Gauge} label="Speed" value={train.status === 'scheduled' || train.status === 'finished' ? 'N/A' : `${train.currentSpeed} km/h`} />
                <DetailItem icon={Clock} label="ETA" value={eta} />
                <DetailItem icon={Ticket} label="Platform" value={train.platform} />
                <DetailItem icon={Milestone} label="Path ID" value={train.currentSegment?.trackId ?? 'N/A'} />
            </div>

        </div>
        <div className="mt-auto">
          {train.status === 'moving' && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onSimulateDelay(train.id, 'stopped')}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Simulate Delay
            </Button>
          )}
           {train.status === 'stopped' && (
            <Button
              className="w-full bg-green-500 hover:bg-green-600"
              onClick={() => onSimulateDelay(train.id, 'moving')}
            >
              Resume Train
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
