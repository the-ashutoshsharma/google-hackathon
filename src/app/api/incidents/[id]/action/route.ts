import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IncidentStatus, WorkOrderStatus } from '@/generated/prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;
    const body = await req.json();
    const { action, response, evidence_image_url } = body;

    const incident = await prisma.civicIncident.findUnique({
      where: { id: incidentId },
      include: {
        work_orders: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    if (action === 'complete_work') {
      // Complete the latest work order
      const latestWorkOrder = incident.work_orders[0];
      const afterImageUrl =
        evidence_image_url ||
        'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800&auto=format&fit=crop&q=80';

      if (latestWorkOrder) {
        await prisma.workOrder.update({
          where: { id: latestWorkOrder.id },
          data: {
            status: WorkOrderStatus.COMPLETED,
            evidence_image_url: afterImageUrl,
            completed_at: new Date(),
          },
        });
      } else {
        // Create completed work order if none existed
        await prisma.workOrder.create({
          data: {
            incident_id: incident.id,
            assigned_to: incident.responsible_entity,
            status: WorkOrderStatus.COMPLETED,
            evidence_image_url: afterImageUrl,
            completed_at: new Date(),
          },
        });
      }

      // Update incident status
      const updatedIncident = await prisma.civicIncident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.IN_PROGRESS,
        },
        include: {
          reports: { include: { citizen: true } },
          work_orders: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Work order marked as completed with visual evidence.',
        incident: updatedIncident,
      });
    }

    if (action === 'verify_citizen') {
      const citizenResponse = (response || '').toUpperCase();

      if (citizenResponse === 'YES') {
        const resolvedIncident = await prisma.civicIncident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.RESOLVED,
          },
          include: {
            reports: { include: { citizen: true } },
            work_orders: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Citizen confirmed resolution. Incident closed successfully.',
          incident: resolvedIncident,
        });
      } else {
        // Citizen answered NO -> Reopen and escalate
        const reopenedIncident = await prisma.civicIncident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.REOPENED,
            report_count: { increment: 1 },
          },
          include: {
            reports: { include: { citizen: true } },
            work_orders: true,
          },
        });

        // Create follow-up rework order
        await prisma.workOrder.create({
          data: {
            incident_id: incident.id,
            assigned_to: `${incident.responsible_entity} (Senior Supervisor Escalate)`,
            status: WorkOrderStatus.IN_PROGRESS,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Citizen reported issue persists. Incident escalated and reopened.',
          incident: reopenedIncident,
        });
      }
    }

    if (action === 'plan_agenda') {
      const updatedIncident = await prisma.civicIncident.update({
        where: { id: incident.id },
        data: {
          description: `[APPROVED FOR MASTER PLAN AGENDA / MPLADS BUDGET] ${incident.description}`,
          status: IncidentStatus.IN_PROGRESS,
        },
        include: {
          reports: { include: { citizen: true } },
          work_orders: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Proposal adopted into Master Plan Agenda.',
        incident: updatedIncident,
      });
    }

    if (action === 'reopen') {
      const updatedIncident = await prisma.civicIncident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.REOPENED,
        },
        include: {
          reports: { include: { citizen: true } },
          work_orders: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Incident marked as reopened.',
        incident: updatedIncident,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action specified' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Error executing incident action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Action execution failed',
      },
      { status: 500 }
    );
  }
}
