import RailflowHeader from "@/components/railflow-header";
import TrainMap from "@/components/train-map";
import { SimulationProvider } from "@/hooks/use-simulation-time";

export default function Home() {
  return (
    <SimulationProvider>
      <div className="flex flex-col h-screen bg-background">
        <RailflowHeader />
        <main className="flex-1 overflow-hidden">
          <TrainMap />
        </main>
      </div>
    </SimulationProvider>
  );
}
