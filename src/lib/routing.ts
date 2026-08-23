import { prisma } from './prisma';
import { analyzeCitizenReport, CitizenReportAnalysis } from './gemini';
import { WorkflowRoute, SeverityLevel, IncidentStatus, WorkOrderStatus } from '@/generated/prisma/client';

export interface RouteRule {
  responsible_entity: string;
  default_sla_hours: number;
  critical_sla_hours?: number;
}

// Configurable dictionary mapping specific problem types to departments and SLAs
export const PROBLEM_ROUTING_CONFIG: Record<string, RouteRule> = {
  // Road & Transport
  pothole: { responsible_entity: 'Public Works Department (Roads)', default_sla_hours: 48, critical_sla_hours: 12 },
  road_pothole: { responsible_entity: 'Public Works Department (Roads)', default_sla_hours: 48, critical_sla_hours: 12 },
  sinkhole: { responsible_entity: 'Emergency Road Safety Unit', default_sla_hours: 12, critical_sla_hours: 4 },
  broken_road: { responsible_entity: 'Public Works Department (Roads)', default_sla_hours: 72, critical_sla_hours: 24 },
  damaged_sidewalk: { responsible_entity: 'Urban Pedestrian Infrastructure', default_sla_hours: 96, critical_sla_hours: 48 },
  traffic_light_failure: { responsible_entity: 'Metropolitan Traffic Control', default_sla_hours: 8, critical_sla_hours: 2 },
  traffic_signal: { responsible_entity: 'Metropolitan Traffic Control', default_sla_hours: 8, critical_sla_hours: 2 },
  road_obstruction: { responsible_entity: 'Emergency Road Clearing Team', default_sla_hours: 12, critical_sla_hours: 4 },

  // Sanitation & Waste
  garbage_dump: { responsible_entity: 'Municipal Waste Management Dept', default_sla_hours: 24, critical_sla_hours: 12 },
  garbage_overflow: { responsible_entity: 'Municipal Waste Management Dept', default_sla_hours: 24, critical_sla_hours: 12 },
  illegal_dumping: { responsible_entity: 'Sanitation Enforcement Division', default_sla_hours: 48, critical_sla_hours: 24 },
  dead_animal: { responsible_entity: 'Animal Control & Sanitation Services', default_sla_hours: 12, critical_sla_hours: 6 },
  littered_public_area: { responsible_entity: 'Urban Cleaning Operations', default_sla_hours: 36, critical_sla_hours: 18 },

  // Electrical & Power
  broken_streetlight: { responsible_entity: 'City Electrical Infrastructure Board', default_sla_hours: 48, critical_sla_hours: 12 },
  street_light_broken: { responsible_entity: 'City Electrical Infrastructure Board', default_sla_hours: 48, critical_sla_hours: 12 },
  live_wire_exposed: { responsible_entity: 'Emergency Power Grid Safety Team', default_sla_hours: 4, critical_sla_hours: 2 },
  power_transformer_sparking: { responsible_entity: 'Electricity Board Rapid Response', default_sla_hours: 4, critical_sla_hours: 2 },
  blackout_street: { responsible_entity: 'City Electrical Infrastructure Board', default_sla_hours: 24, critical_sla_hours: 8 },

  // Drainage & Sewerage
  open_manhole: { responsible_entity: 'Urban Sewerage & Safety Rapid Squad', default_sla_hours: 8, critical_sla_hours: 3 },
  drainage_blockage: { responsible_entity: 'Urban Drainage & Flood Control', default_sla_hours: 24, critical_sla_hours: 8 },
  sewage_overflow: { responsible_entity: 'Water & Sewerage Operations', default_sla_hours: 16, critical_sla_hours: 6 },
  storm_drain_clog: { responsible_entity: 'Urban Drainage & Flood Control', default_sla_hours: 24, critical_sla_hours: 12 },

  // Water Supply
  water_pipe_leak: { responsible_entity: 'Municipal Water Board', default_sla_hours: 24, critical_sla_hours: 8 },
  water_leakage: { responsible_entity: 'Municipal Water Board', default_sla_hours: 24, critical_sla_hours: 8 },
  water_pipeline_burst: { responsible_entity: 'Emergency Water Supply Unit', default_sla_hours: 8, critical_sla_hours: 4 },
  contaminated_water: { responsible_entity: 'Water Quality & Public Health Board', default_sla_hours: 12, critical_sla_hours: 6 },
  no_water_supply: { responsible_entity: 'Municipal Water Board', default_sla_hours: 24, critical_sla_hours: 12 },

  // Public Health
  stagnant_water_mosquitoes: { responsible_entity: 'Vector Control & Public Health', default_sla_hours: 48, critical_sla_hours: 24 },
  food_safety_hazard: { responsible_entity: 'Food Safety & Hygiene Directorate', default_sla_hours: 24, critical_sla_hours: 8 },
  hazardous_waste: { responsible_entity: 'Environmental Hazard Division', default_sla_hours: 12, critical_sla_hours: 4 },

  // Transit & Trees
  fallen_tree: { responsible_entity: 'Forestry & Disaster Clearing Squad', default_sla_hours: 12, critical_sla_hours: 4 },
  broken_bus_shelter: { responsible_entity: 'Metropolitan Transit Authority', default_sla_hours: 96, critical_sla_hours: 48 },
};

// Category-level fallback routing rules
export const CATEGORY_FALLBACK_CONFIG: Record<string, RouteRule> = {
  road: { responsible_entity: 'Public Works Department (Roads)', default_sla_hours: 48, critical_sla_hours: 18 },
  sanitation: { responsible_entity: 'Municipal Waste Management Dept', default_sla_hours: 24, critical_sla_hours: 12 },
  electrical: { responsible_entity: 'City Electrical Infrastructure Board', default_sla_hours: 48, critical_sla_hours: 12 },
  drainage: { responsible_entity: 'Urban Drainage & Sewerage Authority', default_sla_hours: 24, critical_sla_hours: 8 },
  water_supply: { responsible_entity: 'Municipal Water Board', default_sla_hours: 24, critical_sla_hours: 8 },
  public_health: { responsible_entity: 'Public Health & Sanitation Directorate', default_sla_hours: 36, critical_sla_hours: 12 },
  transit: { responsible_entity: 'Metropolitan Transit Authority', default_sla_hours: 72, critical_sla_hours: 24 },
  other: { responsible_entity: 'General Municipal Action Services', default_sla_hours: 72, critical_sla_hours: 24 },
};

/**
 * Resolves the responsible entity and SLA hours based on problem type and severity.
 */
export function resolveRouting(
  problemType: string,
  category: string,
  severity: SeverityLevel
): { responsible_entity: string; sla_hours: number } {
  const normalizedType = problemType.toLowerCase().replace(/[\s-]+/g, '_');
  
  const rule = PROBLEM_ROUTING_CONFIG[normalizedType] ||
    CATEGORY_FALLBACK_CONFIG[category.toLowerCase()] ||
    CATEGORY_FALLBACK_CONFIG['other'];

  const sla_hours =
    severity === 'critical' && rule.critical_sla_hours
      ? rule.critical_sla_hours
      : rule.default_sla_hours;

  return {
    responsible_entity: rule.responsible_entity,
    sla_hours,
  };
}

export interface ProcessReportLocation {
  lat?: number;
  lng?: number;
  address?: string;
}

export interface ProcessReportResult {
  isNewIncident: boolean;
  incident: any;
  citizenReport: any;
  workOrder?: any | null;
  analysis: CitizenReportAnalysis;
}

/**
 * Core deterministic orchestration pipeline:
 * 1. Upserts Citizen.
 * 2. Runs Gemini multimodal/text structured analysis.
 * 3. Checks for similar OPEN CivicIncident.
 * 4. Deduplicates and groups or creates new CivicIncident with assigned SLA and department.
 * 5. Creates WorkOrder for FIX workflow routes.
 */
export async function processNewReport(
  citizenPhone: string,
  rawText: string,
  location?: ProcessReportLocation,
  imageUrl?: string
): Promise<ProcessReportResult> {
  // Normalize phone number
  const normalizedPhone = citizenPhone.replace(/^whatsapp:/i, '').trim();

  // 1. Find or create the Citizen
  const citizen = await prisma.citizen.upsert({
    where: { phone_number: normalizedPhone },
    update: {},
    create: { phone_number: normalizedPhone },
  });

  // 2. Call Gemini extraction
  const analysis = await analyzeCitizenReport(rawText);

  // 3. Check if a similar OPEN CivicIncident exists nearby (MVP: check matching problem_type & status OPEN)
  const existingIncident = await prisma.civicIncident.findFirst({
    where: {
      problem_type: analysis.problem_type,
      status: IncidentStatus.OPEN,
    },
    orderBy: { created_at: 'desc' },
  });

  if (existingIncident) {
    // Increment report count & link new citizen report to the existing incident
    const updatedIncident = await prisma.civicIncident.update({
      where: { id: existingIncident.id },
      data: {
        report_count: { increment: 1 },
      },
    });

    const citizenReport = await prisma.citizenReport.create({
      data: {
        citizen_id: citizen.id,
        incident_id: existingIncident.id,
        text_payload: rawText,
        image_url: imageUrl || null,
      },
    });

    return {
      isNewIncident: false,
      incident: updatedIncident,
      citizenReport,
      workOrder: null,
      analysis,
    };
  }

  // 4. Create new incident using deterministic routing dictionary
  const routing = resolveRouting(
    analysis.problem_type,
    analysis.category,
    analysis.severity as SeverityLevel
  );

  const finalAddress =
    location?.address ||
    analysis.location.extracted_address ||
    (analysis.location.landmarks.length > 0
      ? `Near ${analysis.location.landmarks.join(', ')}`
      : null);

  const newIncident = await prisma.civicIncident.create({
    data: {
      category: analysis.category,
      problem_type: analysis.problem_type,
      workflow_route: analysis.workflow_route as WorkflowRoute,
      description: analysis.summary,
      severity: analysis.severity as SeverityLevel,
      status: IncidentStatus.OPEN,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      address: finalAddress,
      report_count: 1,
      responsible_entity: routing.responsible_entity,
      sla_hours: routing.sla_hours,
    },
  });

  // Create CitizenReport
  const citizenReport = await prisma.citizenReport.create({
    data: {
      citizen_id: citizen.id,
      incident_id: newIncident.id,
      text_payload: rawText,
      image_url: imageUrl || null,
    },
  });

  // 5. For FIX workflows, generate a WorkOrder
  let workOrder = null;
  if (analysis.workflow_route === 'FIX') {
    workOrder = await prisma.workOrder.create({
      data: {
        incident_id: newIncident.id,
        assigned_to: routing.responsible_entity,
        status: WorkOrderStatus.PENDING,
        evidence_image_url: imageUrl || null,
      },
    });
  }

  return {
    isNewIncident: true,
    incident: newIncident,
    citizenReport,
    workOrder,
    analysis,
  };
}
