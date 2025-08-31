import { TrainFront } from 'lucide-react';
import SimulationClock from './simulation-clock';

export default function RailflowHeader() {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
      <div className="flex items-center gap-2 text-primary">
        <TrainFront className="w-6 h-6" />
        <h1 className="text-xl font-bold font-headline text-foreground">
          RailFlow
        </h1>
      </div>
      <SimulationClock />
    </header>
  );
}
