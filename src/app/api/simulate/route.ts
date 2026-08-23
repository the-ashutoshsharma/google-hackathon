import { NextRequest, NextResponse } from 'next/server';
import { processNewReport } from '@/lib/routing';

export async function POST(req: NextRequest) {
  try {
    const { text, phone = '+919988776655', imageUrl, address } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Complaint message is required' },
        { status: 400 }
      );
    }

    const location = address ? { address } : undefined;
    const result = await processNewReport(phone, text.trim(), location, imageUrl);

    const { incident, isNewIncident } = result;

    // Generate formatted WhatsApp confirmation message
    let replyText = '';
    if (isNewIncident) {
      replyText =
        `🏛️ [Civic Action & Resolution System]\n\n` +
        `Thank you for reporting. Your issue has been registered.\n\n` +
        `• Reference ID: #${incident.id.slice(-6).toUpperCase()}\n` +
        `• Category: ${incident.category.toUpperCase()} (${incident.problem_type})\n` +
        `• Assigned Entity: ${incident.responsible_entity}\n` +
        `• Expected Resolution SLA: ${incident.sla_hours} hours\n` +
        `• Priority: ${incident.severity.toUpperCase()}\n` +
        `• Action Mode: ${incident.workflow_route}\n\n` +
        `Summary: "${incident.description}"\n\n` +
        `Our field operations team has been notified. You will receive updates as the status changes.`;
    } else {
      replyText =
        `🏛️ [Civic Action & Resolution System]\n\n` +
        `Thank you. An active report for this issue is already in progress.\n\n` +
        `• Incident ID: #${incident.id.slice(-6).toUpperCase()}\n` +
        `• Category: ${incident.category.toUpperCase()}\n` +
        `• Total Citizen Reports: ${incident.report_count}\n` +
        `• Assigned Entity: ${incident.responsible_entity}\n` +
        `• SLA Target: ${incident.sla_hours} hours\n` +
        `• Status: ${incident.status}\n\n` +
        `Your submission has boosted the incident priority score.`;
    }

    return NextResponse.json({
      success: true,
      result,
      replyMessage: replyText,
    });
  } catch (error: unknown) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
      },
      { status: 500 }
    );
  }
}
