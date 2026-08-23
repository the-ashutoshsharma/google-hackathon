import { GoogleGenAI, Type, Schema } from '@google/genai';
import { z } from 'zod';

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Zod schema for runtime validation and TypeScript typing
export const CitizenReportAnalysisSchema = z.object({
  category: z.enum([
    'road',
    'sanitation',
    'electrical',
    'drainage',
    'water_supply',
    'public_health',
    'transit',
    'other',
  ]),
  problem_type: z.string(),
  workflow_route: z.enum(['FIX', 'RELIEF', 'PLAN']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.object({
    extracted_address: z.string(),
    landmarks: z.array(z.string()),
  }),
  summary: z.string(),
});

export type CitizenReportAnalysis = z.infer<typeof CitizenReportAnalysisSchema>;

// Strict structured output responseSchema for Gemini 2.5 Flash
const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        'road',
        'sanitation',
        'electrical',
        'drainage',
        'water_supply',
        'public_health',
        'transit',
        'other',
      ],
      description: 'The civic category that best classifies this incident.',
    },
    problem_type: {
      type: Type.STRING,
      description: 'Standardized snake_case or concise identifier for the specific issue (e.g. pothole, broken_streetlight, garbage_dump, water_leakage, open_manhole, fallen_tree, drainage_blockage).',
    },
    workflow_route: {
      type: Type.STRING,
      enum: ['FIX', 'RELIEF', 'PLAN'],
      description: 'FIX for direct repairs/work orders, RELIEF for emergency/humanitarian/safety intervention, PLAN for policy/long-term urban planning projects.',
    },
    severity: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Urgency and impact of the civic issue.',
    },
    location: {
      type: Type.OBJECT,
      properties: {
        extracted_address: {
          type: Type.STRING,
          description: 'Any street names, area names, crossroads, or location text mentioned by the citizen. Return empty string if none.',
        },
        landmarks: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: 'List of nearby landmark names, buildings, shops, or recognizable points of interest.',
        },
      },
      required: ['extracted_address', 'landmarks'],
    },
    summary: {
      type: Type.STRING,
      description: 'A 1-sentence concise English translation and summary of the issue reported.',
    },
  },
  required: [
    'category',
    'problem_type',
    'workflow_route',
    'severity',
    'location',
    'summary',
  ],
};

/**
 * Analyzes a raw citizen report (in any language or informal phrasing) using Gemini 2.5 Flash
 * and extracts structured civic incident metadata with deterministic schema compliance.
 */
export async function analyzeCitizenReport(text: string): Promise<CitizenReportAnalysis> {
  if (!text || text.trim().length === 0) {
    throw new Error('Report text cannot be empty');
  }

  const systemInstruction = `You are an expert Civic Action & Municipal Operations Dispatch AI.
Your job is to analyze incoming citizen complaints/reports sent via WhatsApp or SMS (which may be in any language, slangs, or informal text) and convert them into structured operational data for city administrators.

Guidelines:
1. Category: Map to one of (road, sanitation, electrical, drainage, water_supply, public_health, transit, other).
2. Problem Type: A concise normalized snake_case string (e.g., "pothole", "garbage_overflow", "broken_streetlight", "open_manhole", "water_pipe_leak", "sewage_backup", "traffic_light_failure", "fallen_tree").
3. Workflow Route:
   - FIX: actionable municipal physical repair or cleaning task requiring a field work order.
   - RELIEF: immediate emergency / humanitarian / hazard relief (flooding, hazard gas leak, water tanker relief).
   - PLAN: non-emergency systemic requests (requesting a new flyover, park redesign, long-term policy change).
4. Severity: Assess safety risk and community impact:
   - critical: immediate life safety hazard, open live electric wire, active major flood, uncovered deep manhole on busy road.
   - high: major disruption, large road sinkhole, primary water supply burst, overflowing toxic sewage.
   - medium: standard pothole, uncollected garbage bin, dark streetlight on secondary street.
   - low: minor aesthetic graffiti, overgrown weeds, minor noise.
5. Location: Extract any explicit address, cross-streets, house/shop numbers, and a list of specific landmarks.
6. Summary: Always provide a single, clear, professional 1-sentence English summary describing what is wrong and where.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Citizen Report:\n"""\n${text}\n"""\n\nAnalyze this civic issue and return the structured JSON payload.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: analysisResponseSchema,
        temperature: 0.1, // Low temperature for deterministic output
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedJson = JSON.parse(responseText);
    const validatedData = CitizenReportAnalysisSchema.parse(parsedJson);

    return validatedData;
  } catch (error) {
    console.error('Error in analyzeCitizenReport:', error);
    throw error;
  }
}
