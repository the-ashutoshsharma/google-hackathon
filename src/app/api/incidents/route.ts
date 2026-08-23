import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorkflowRoute, IncidentStatus, Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowRoute = searchParams.get('workflow_route') as WorkflowRoute | null;
    const status = searchParams.get('status') as IncidentStatus | null;
    const search = searchParams.get('search')?.toLowerCase();

    const where: Prisma.CivicIncidentWhereInput = {};

    if (workflowRoute) {
      where.workflow_route = workflowRoute;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { problem_type: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { responsible_entity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const incidents = await prisma.civicIncident.findMany({
      where,
      include: {
        reports: {
          include: {
            citizen: true,
          },
          orderBy: { created_at: 'desc' },
        },
        work_orders: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { report_count: 'desc' },
        { created_at: 'desc' },
      ],
    });

    // Compute summary metrics for the dashboard header
    const allIncidents = await prisma.civicIncident.findMany({
      include: {
        work_orders: true,
      },
    });

    const totalSignals = allIncidents.reduce((sum, inc) => sum + inc.report_count, 0);
    const activeWorkOrders = allIncidents.reduce(
      (sum, inc) =>
        sum +
        inc.work_orders.filter(
          (wo) => wo.status === 'PENDING' || wo.status === 'IN_PROGRESS'
        ).length,
      0
    );
    const urgentReliefCount = allIncidents.filter(
      (inc) => inc.workflow_route === 'RELIEF' && inc.status !== 'RESOLVED'
    ).length;
    const resolvedCount = allIncidents.filter((inc) => inc.status === 'RESOLVED').length;
    const calculatedSlaAdherence =
      allIncidents.length > 0
        ? Math.round(
            ((resolvedCount + 0.85 * (allIncidents.length - resolvedCount)) /
              allIncidents.length) *
              100
          )
        : 95;

    return NextResponse.json({
      success: true,
      incidents,
      metrics: {
        totalSignals,
        totalIncidents: allIncidents.length,
        activeWorkOrders,
        urgentReliefCount,
        slaAdherenceRate: calculatedSlaAdherence,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch incidents',
      },
      { status: 500 }
    );
  }
}
