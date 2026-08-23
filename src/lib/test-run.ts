import 'dotenv/config';
import { processNewReport } from './routing';

async function main() {
  console.log('--- Testing Gemini 2.5 Flash & Supabase Database ---');
  const testPhone = '+14155552671';
  const testMessage = 'Urgent: A huge tree has fallen and blocked Main Street near City Hospital, causing complete traffic jam!';

  console.log('Sending citizen message:', testMessage);
  const result = await processNewReport(testPhone, testMessage);
  console.log('\n✅ Pipeline Execution Success!');
  console.log('Incident ID:', result.incident.id);
  console.log('Category:', result.incident.category);
  console.log('Problem Type:', result.incident.problem_type);
  console.log('Workflow Route:', result.incident.workflow_route);
  console.log('Severity:', result.incident.severity);
  console.log('Assigned Entity:', result.incident.responsible_entity);
  console.log('SLA Target:', result.incident.sla_hours, 'hours');
  console.log('Summary:', result.incident.description);
  console.log('Work Order Generated:', result.workOrder ? `Yes (ID: ${result.workOrder.id})` : 'No');
  console.log('Is New Incident:', result.isNewIncident);
}

main().catch(console.error);
