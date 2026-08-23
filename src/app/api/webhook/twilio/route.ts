import { NextRequest, NextResponse } from 'next/server';
import { processNewReport } from '@/lib/routing';

export async function POST(req: NextRequest) {
  try {
    let from = '';
    let body = '';
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
      mediaUrl = json.MediaUrl0 || json.mediaUrl || undefined;
      if (json.Latitude && json.Longitude) {
        lat = parseFloat(json.Latitude);
        lng = parseFloat(json.Longitude);
      }
      address = json.Address || json.address || undefined;
    }

    if (!from || !body.trim()) {
      const emptyReplyTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Civic Action System: Please reply with details or a photo of the civic issue.</Message></Response>`;
      return new NextResponse(emptyReplyTwiml, {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Process the civic report via the intelligent deterministic pipeline
    const locationData = lat && lng ? { lat, lng, address } : address ? { address } : undefined;
    const result = await processNewReport(from, body.trim(), locationData, mediaUrl);

    const { incident } = result;

    const cleanReplyText = `✅ Received! AI categorized this as ${incident.category}. Dispatched to ${incident.responsible_entity}. SLA: ${incident.sla_hours}h.`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${cleanReplyText}</Message></Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Error processing Twilio webhook:', error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Civic Action System: We received your report and our systems team has logged it.</Message></Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-store, max-age=0',
      },
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
