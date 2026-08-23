import { prisma } from '../src/lib/prisma';
import {
  WorkflowRoute,
  SeverityLevel,
  IncidentStatus,
  WorkOrderStatus,
} from '../src/generated/prisma/client';

export async function seedDatabase() {
  console.log('🌱 Seeding database with realistic civic action dataset...');

  // Create demo citizens
  const citizenA = await prisma.citizen.upsert({
    where: { phone_number: '+919876543210' },
    update: {},
    create: { phone_number: '+919876543210' },
  });

  const citizenB = await prisma.citizen.upsert({
    where: { phone_number: '+919811223344' },
    update: {},
    create: { phone_number: '+919811223344' },
  });

  const citizenC = await prisma.citizen.upsert({
    where: { phone_number: '+919900112233' },
    update: {},
    create: { phone_number: '+919900112233' },
  });

  // 1. P-101 (FIX): Road / Pothole - IN_PROGRESS
  const incidentP101 = await prisma.civicIncident.upsert({
    where: { id: 'incident-p101' },
    update: {},
    create: {
      id: 'incident-p101',
      category: 'road',
      problem_type: 'pothole',
      workflow_route: WorkflowRoute.FIX,
      description: 'Severe pothole cluster causing wheel rim damage and traffic slowdowns during rush hours.',
      severity: SeverityLevel.high,
      status: IncidentStatus.IN_PROGRESS,
      lat: 28.5355,
      lng: 77.3910,
      address: 'Crossroad 4th Avenue & Sector 9 Main Blvd',
      report_count: 17,
      responsible_entity: 'Road Maintenance Zone 4',
      sla_hours: 48,
      created_at: new Date(Date.now() - 14 * 3600 * 1000), // 14 hours ago
    },
  });

  await prisma.citizenReport.createMany({
    data: [
      {
        citizen_id: citizenA.id,
        incident_id: incidentP101.id,
        text_payload: 'Deep pothole right after the 4th Avenue traffic light! 2 cars already got flat tires.',
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 14 * 3600 * 1000),
      },
      {
        citizen_id: citizenB.id,
        incident_id: incidentP101.id,
        text_payload: 'The crater on Sector 9 road is expanding after the rain. Please send road repair team ASAP.',
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 8 * 3600 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.workOrder.upsert({
    where: { id: 'wo-p101' },
    update: {},
    create: {
      id: 'wo-p101',
      incident_id: incidentP101.id,
      assigned_to: 'Road Maintenance Zone 4',
      status: WorkOrderStatus.IN_PROGRESS,
      evidence_image_url: null,
      created_at: new Date(Date.now() - 12 * 3600 * 1000),
    },
  });

  // 2. G-201 (FIX): Sanitation / Illegal Dumping - OPEN
  const incidentG201 = await prisma.civicIncident.upsert({
    where: { id: 'incident-g201' },
    update: {},
    create: {
      id: 'incident-g201',
      category: 'sanitation',
      problem_type: 'illegal_dumping',
      workflow_route: WorkflowRoute.FIX,
      description: 'Uncollected commercial waste and illegal garbage dump attracting stray animals and foul odor.',
      severity: SeverityLevel.medium,
      status: IncidentStatus.OPEN,
      lat: 28.5420,
      lng: 77.3850,
      address: 'Plot 42, Green Park Market Back Alley',
      report_count: 11,
      responsible_entity: 'Sanitation Dept',
      sla_hours: 24,
      created_at: new Date(Date.now() - 6 * 3600 * 1000),
    },
  });

  await prisma.citizenReport.create({
    data: {
      citizen_id: citizenC.id,
      incident_id: incidentG201.id,
      text_payload: 'Commercial food vendors are dumping rotten vegetable cartons and waste in the back alley.',
      image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 6 * 3600 * 1000),
    },
  });

  await prisma.workOrder.upsert({
    where: { id: 'wo-g201' },
    update: {},
    create: {
      id: 'wo-g201',
      incident_id: incidentG201.id,
      assigned_to: 'Sanitation Dept',
      status: WorkOrderStatus.PENDING,
      created_at: new Date(Date.now() - 5 * 3600 * 1000),
    },
  });

  // 3. S-301 (FIX): Electrical / Streetlight - RESOLVED
  const incidentS301 = await prisma.civicIncident.upsert({
    where: { id: 'incident-s301' },
    update: {},
    create: {
      id: 'incident-s301',
      category: 'electrical',
      problem_type: 'broken_streetlight',
      workflow_route: WorkflowRoute.FIX,
      description: 'Streetlight pole fixture repaired, new 90W LED luminaire installed and tested.',
      severity: SeverityLevel.low,
      status: IncidentStatus.RESOLVED,
      lat: 28.5480,
      lng: 77.3780,
      address: 'Street 14, Block C, Residential Colony',
      report_count: 7,
      responsible_entity: 'City Electrical Infrastructure Board',
      sla_hours: 48,
      created_at: new Date(Date.now() - 36 * 3600 * 1000),
    },
  });

  await prisma.citizenReport.create({
    data: {
      citizen_id: citizenA.id,
      incident_id: incidentS301.id,
      text_payload: 'Dark street in front of the community center for 4 nights.',
      image_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 36 * 3600 * 1000),
    },
  });

  await prisma.workOrder.upsert({
    where: { id: 'wo-s301' },
    update: {},
    create: {
      id: 'wo-s301',
      incident_id: incidentS301.id,
      assigned_to: 'City Electrical Infrastructure Board',
      status: WorkOrderStatus.COMPLETED,
      evidence_image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 30 * 3600 * 1000),
      completed_at: new Date(Date.now() - 4 * 3600 * 1000),
    },
  });

  // 4. W-501 (RELIEF): Water Supply / 3-Day Water Outage - CRITICAL
  const incidentW501 = await prisma.civicIncident.upsert({
    where: { id: 'incident-w501' },
    update: {},
    create: {
      id: 'incident-w501',
      category: 'water_supply',
      problem_type: 'water_pipeline_burst',
      workflow_route: WorkflowRoute.RELIEF,
      description: 'Major mainline 300mm pipe rupture. Emergency Track: 2x 5000L Water Tankers Dispatched (ETA 1.5h) | Permanent Track: Excavation & Pipe Replacement Task WO-881.',
      severity: SeverityLevel.critical,
      status: IncidentStatus.IN_PROGRESS,
      lat: 28.5390,
      lng: 77.3820,
      address: 'Blocks D & E, High-Density Urban Sector 4',
      report_count: 32,
      responsible_entity: 'Emergency Water Supply Unit & Water Board',
      sla_hours: 12,
      created_at: new Date(Date.now() - 4 * 3600 * 1000),
    },
  });

  await prisma.citizenReport.create({
    data: {
      citizen_id: citizenB.id,
      incident_id: incidentW501.id,
      text_payload: 'No water supply for 3 days in entire Block D and E. Please dispatch water tankers urgently!',
      image_url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 4 * 3600 * 1000),
    },
  });

  await prisma.workOrder.upsert({
    where: { id: 'wo-w501' },
    update: {},
    create: {
      id: 'wo-w501',
      incident_id: incidentW501.id,
      assigned_to: 'Emergency Tanker Fleet & Mainline Hydraulics',
      status: WorkOrderStatus.IN_PROGRESS,
      created_at: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });

  // 5. H-601 (PLAN): Public Health / Primary Health Center - 428 reports
  const incidentH601 = await prisma.civicIncident.upsert({
    where: { id: 'incident-h601' },
    update: {},
    create: {
      id: 'incident-h601',
      category: 'public_health',
      problem_type: 'lack_of_primary_health_center',
      workflow_route: WorkflowRoute.PLAN,
      description: '428 citizens reporting nearest health center is 14km away. AI Strategic Proposal: Allocate $1.2M MPLADS/Urban Health Mission funding for 24x7 Sub-District Clinic in Sector 4 South Expansion.',
      severity: SeverityLevel.high,
      status: IncidentStatus.OPEN,
      lat: 28.5280,
      lng: 77.3990,
      address: 'Sector 4 South Expansion Zone & Surrounding Wards',
      report_count: 428,
      responsible_entity: 'Health Infrastructure & District Planning Board',
      sla_hours: 720,
      created_at: new Date(Date.now() - 120 * 3600 * 1000),
    },
  });

  await prisma.citizenReport.create({
    data: {
      citizen_id: citizenA.id,
      incident_id: incidentH601.id,
      text_payload: 'Petition from 12 resident welfare associations: We urgently need a Primary Health Centre in Sector 4 South.',
      created_at: new Date(Date.now() - 120 * 3600 * 1000),
    },
  });

  // 6. B-701 (PLAN): Transit / Bus Route & Connectivity Gap - 114 reports
  const incidentB701 = await prisma.civicIncident.upsert({
    where: { id: 'incident-b701' },
    update: {},
    create: {
      id: 'incident-b701',
      category: 'transit',
      problem_type: 'transit_connectivity_gap',
      workflow_route: WorkflowRoute.PLAN,
      description: '114 commuters requesting dedicated electric feeder bus loop during 07:00-10:30 and 17:30-21:00 peak hours to reduce congestion between Sector 4 Metro and IT Park.',
      severity: SeverityLevel.medium,
      status: IncidentStatus.OPEN,
      lat: 28.5310,
      lng: 77.3890,
      address: 'Metro Feeder Corridor Sector 4 to IT Tech Park',
      report_count: 114,
      responsible_entity: 'Metropolitan Transit & Urban Mobility Committee',
      sla_hours: 720,
      created_at: new Date(Date.now() - 96 * 3600 * 1000),
    },
  });

  await prisma.citizenReport.create({
    data: {
      citizen_id: citizenC.id,
      incident_id: incidentB701.id,
      text_payload: 'Need feeder buses connecting Metro Station to IT corridor. Thousands of daily commuters rely on autos.',
      created_at: new Date(Date.now() - 96 * 3600 * 1000),
    },
  });

  console.log('✅ Seeding complete!');
  return {
    success: true,
    seeded: [
      incidentP101.id,
      incidentG201.id,
      incidentS301.id,
      incidentW501.id,
      incidentH601.id,
      incidentB701.id,
    ],
  };
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
