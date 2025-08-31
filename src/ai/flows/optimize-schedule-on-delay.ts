'use server';

/**
 * @fileOverview This file defines a Genkit flow to optimize the train schedule when a delay occurs.
 *
 * - optimizeScheduleOnDelay - A function that triggers the schedule optimization flow.
 * - OptimizeScheduleOnDelayInput - The input type for the optimizeScheduleOnDelay function.
 * - OptimizeScheduleOnDelayOutput - The return type for the optimizeScheduleOnDelay function, providing a structured list of actions to take.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { stations, tracks } from '@/data/network';
import { findShortestPath } from '@/lib/graph';
import type { Train } from '@/types';


const OptimizeScheduleOnDelayInputSchema = z.object({
  delayedTrain: z.custom<Train>().describe('The train that has been delayed or is most affected by a disruption.'),
  otherTrains: z.array(z.custom<Train>()).describe('The current status of all other trains in the network.'),
  delayDuration: z
    .number()
    .describe('The duration of the delay in minutes. Will be 0 for disruptions like track closures.'),
  disruptionType: z.enum(['delay', 'track_closure']).describe('The type of disruption that occurred.'),
});
export type OptimizeScheduleOnDelayInput = z.infer<
  typeof OptimizeScheduleOnDelayInputSchema
>;

const TrainActionSchema = z.object({
    trainId: z.string().describe("The ID of the train to be modified."),
    action: z.enum(['reroute', 'hold', 'resume', 'adjust_speed']).describe("The action to perform on the train."),
    newPath: z.array(z.string()).optional().describe("The new path for the train as an array of station IDs if rerouted."),
    holdDuration: z.number().optional().describe("The duration in minutes for which the train should be held."),
    newSpeed: z.number().optional().describe("The new target speed for the train in km/h."),
    reason: z.string().describe("The reason for this specific action.")
});

const OptimizeScheduleOnDelayOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the overall optimization plan."),
  actions: z.array(TrainActionSchema).describe("A list of specific, actionable commands for the simulation."),
});
export type OptimizeScheduleOnDelayOutput = z.infer<
  typeof OptimizeScheduleOnDelayOutputSchema
>;

export async function optimizeScheduleOnDelay(
  input: OptimizeScheduleOnDelayInput
): Promise<OptimizeScheduleOnDelayOutput> {
  return optimizeScheduleOnDelayFlow(input);
}

const findOptimalPath = ai.defineTool(
    {
        name: 'findOptimalPath',
        description: 'Finds the shortest, most efficient path for a train between two stations using the CURRENTLY AVAILABLE network graph.',
        input: z.object({
            startStationId: z.string(),
            endStationId: z.string(),
        }),
        output: z.object({
            path: z.array(z.string()).optional(),
            cost: z.number().optional(),
        }),
    },
    async ({ startStationId, endStationId }) => {
        const result = findShortestPath(startStationId, endStationId);
        if (!result) {
            return { path: undefined, cost: undefined };
        }
        return { path: result.path, cost: result.distance };
    }
);

const optimizeSchedulePrompt = ai.definePrompt({
  name: 'optimizeSchedulePrompt',
  input: {schema: OptimizeScheduleOnDelayInputSchema},
  output: {schema: OptimizeScheduleOnDelayOutputSchema},
  tools: [findOptimalPath],
  prompt: `You are a master railway network controller for the Delhi region. Your task is to resolve a disruption with minimal impact on the overall network, functioning as a prescriptive, automated system.

A critical disruption has occurred:
- Disruption Type: {{disruptionType}}
- Primary Affected Train: {{delayedTrain.id}} (Status: {{delayedTrain.status}})
- Its Route: {{delayedTrain.originStationId}} to {{delayedTrain.destinationStationId}}

Current network state:
- All Stations: {{{JSONstringify stations}}}
- All Tracks & Connections: {{{JSONstringify tracks}}}
- Other Trains: {{{JSONstringify otherTrains}}}

Your goal is to generate a new, optimized operational plan by outputting a series of structured commands. Your primary objective is to minimize a "total disruption score", which is calculated based on the following penalties:
- Each minute a train is late to its final destination: +1 point
- Each train that is rerouted: +10 points
- Each train that is held at a station: +5 points

Analyze the cascading impact of the disruption on other trains.
- If the disruption is a 'track_closure', you MUST assume one or more tracks are unavailable. You MUST use the 'findOptimalPath' tool to find new routes for ANY train whose original path is now impossible.
- If the disruption is a 'delay', decide which trains to hold, which to reroute, and which to let pass to mitigate congestion.

Your response MUST be a structured JSON object containing:
1. "summary": A concise, human-readable summary of your plan.
2. "actions": An array of specific, machine-executable commands. For 'reroute' actions, you must provide the complete new path as an array of station IDs.

Example Action for Rerouting:
{ "trainId": "TRN202", "action": "reroute", "newPath": ["NDLS", "TKJ", "ANVT", "GZB"], "reason": "Rerouting to avoid track closure between DLI and DSA." }

Generate the optimal plan now.`,
  customize: (prompt) => {
    prompt.handlebars = {
      helpers: {
        JSONstringify: (obj: any) => JSON.stringify(obj, null, 2),
      },
    };
    return prompt;
  }
});

const optimizeScheduleOnDelayFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleOnDelayFlow',
    inputSchema: OptimizeScheduleOnDelayInputSchema,
    outputSchema: OptimizeScheduleOnDelayOutputSchema,
  },
  async input => {
    const {output} = await optimizeSchedulePrompt({
        ...input,
        stations,
        tracks,
    });
    return output!;
  }
);
