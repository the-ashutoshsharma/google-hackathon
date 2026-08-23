import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { processNewReport } from '@/lib/routing';

// Helper to construct Twilio REST client safely
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken && !accountSid.startsWith('ACXXXX')) {
    return twilio(accountSid, authToken);
  }
  return null;
}

/**
 * Generates standard TwiML XML response string
 */
function buildTwiMLResponse(message: string): string {
  const sanitized = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${sanitized}</Message>
</Response>`;
}

export async function POST(req: NextRequest) {
  try {
    let from = '';
    let body = '';
    let to = '';
    let mediaUrl: string | undefined = undefined;
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;
    let address: string | undefined = undefined;

    const contentType = req.headers.get('content-type') || '';

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData();
      from = (formData.get('From') as string) || '';
      body = (formData.get('Body') as string) || '';
      to = (formData.get('To') as string) || '';
      mediaUrl = (formData.get('MediaUrl0') as string) || undefined;

      const latStr = formData.get('Latitude') as string;
      const lngStr = formData.get('Longitude') as string;
      if (latStr && lngStr) {
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
      }
      address = (formData.get('Address') as string) || undefined;
    } else {
      // Fallback for direct JSON testing
      const json = await req.json();
      from = json.From || json.from || '';
      body = json.Body || json.body || '';
      to = json.To || json.to || '';
      mediaUrl = json.MediaUrl0 || json.mediaUrl || undefined;
      if (json.Latitude && json.Longitude) {
        lat = parseFloat(json.Latitude);
        lng = parseFloat(json.Longitude);
      }
      address = json.Address || json.address || undefined;
    }

    if (!from || !body.trim()) {
      return new NextResponse(
        buildTwiMLResponse(
          'Civic Action System: We received an empty report. Please reply with details or a photo of the civic issue.'
        ),
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        }
      );
    }

    // Process the civic report via the intelligent deterministic pipeline
    const locationData = lat && lng ? { lat, lng, address } : address ? { address } : undefined;
    const result = await processNewReport(from, body.trim(), locationData, mediaUrl);

    const { incident, isNewIncident, analysis } = result;

    // Build the citizen response message
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

    // If Twilio client credentials are configured, dispatch via REST API
    const twilioClient = getTwilioClient();
    if (twilioClient && to) {
      try {
        await twilioClient.messages.create({
          body: replyText,
          from: to,
          to: from,
        });
      } catch (twilioErr) {
        console.warn('Twilio REST message send warning (falling back to TwiML):', twilioErr);
      }
    }

    // Always return valid TwiML XML
    return new NextResponse(buildTwiMLResponse(replyText), {
      status: 200,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Error processing Twilio webhook:', error);

    const errorReply =
      '🏛️ [Civic Action System] We received your message, but encountered an error processing the report. Our systems team has logged the error.';

    return new NextResponse(buildTwiMLResponse(errorReply), {
      status: 200,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Civic Action & Resolution System - Twilio Ingestion Webhook',
    timestamp: new Date().toISOString(),
  });
}
