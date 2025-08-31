"use server"
 
import { optimizeScheduleOnDelay, type OptimizeScheduleOnDelayInput, type OptimizeScheduleOnDelayOutput } from '@/ai/flows/optimize-schedule-on-delay';
 
export async function getOptimizedSchedule(input: OptimizeScheduleOnDelayInput): Promise<{ success: true, data: OptimizeScheduleOnDelayOutput } | { success: false, error: string }> {
  try {
    const result = await optimizeScheduleOnDelay(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to get optimization from AI. Details: ${errorMessage}` };
  }
}
