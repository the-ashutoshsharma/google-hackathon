import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
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
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Civic Action System: Please reply with details or a photo of the civic issue.');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process the civic report via the intelligent deterministic pipeline (Gemini 2.5 Flash + Supabase)
    const locationData = lat && lng ? { lat, lng, address } : address ? { address } : undefined;
    const result = await processNewReport(from, body.trim(), locationData, mediaUrl);

    const { incident } = result;

    const cleanReplyText = `✅ Received! AI categorized this as ${incident.category}. Dispatched to ${incident.responsible_entity}. SLA: ${incident.sla_hours}h.`;

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(cleanReplyText);

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: unknown) {
    console.error('Error processing Twilio webhook:', error);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Civic Action System: We received your report and our systems team has logged it.');

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
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
