import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { PROBLEM_ROUTING_CONFIG, CATEGORY_FALLBACK_CONFIG } from '@/lib/routing';

export default function HomePage() {
  const routingEntries = Object.entries(PROBLEM_ROUTING_CONFIG);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Civic Action & Resolution System
            </h1>
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
              System Online
            </Badge>
          </div>
          <p className="text-slate-600 mt-1">
            Multimodal AI triage, deterministic municipal routing, and WhatsApp/SMS citizen dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Next.js 14</Badge>
          <Badge variant="outline" className="text-xs">Gemini 2.5 Flash</Badge>
          <Badge variant="outline" className="text-xs">Prisma ORM</Badge>
          <Badge variant="outline" className="text-xs">Twilio WhatsApp</Badge>
        </div>
      </header>

      {/* Quick Status Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Intelligence Layer
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-800">
              Gemini 2.5 Flash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">
              Multimodal parsing, category taxonomy, workflow routing &amp; structured JSON schema.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Routing Engine
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-800">
              Deterministic SLAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">
              Deduplication, severity adjustments, entity assignment &amp; automatic work order dispatch.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Database Core
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-800">
              PostgreSQL / Supabase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">
              Normalized models: Citizen, CivicIncident, CitizenReport, and WorkOrder.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Messaging Channel
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-800">
              Twilio Ingestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">
              Bidirectional WhatsApp Sandbox &amp; SMS webhook with instant TwiML + REST dispatch.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-200">
          <TabsTrigger value="overview">Pipeline Flow</TabsTrigger>
          <TabsTrigger value="routing">SLA &amp; Routing Rules</TabsTrigger>
          <TabsTrigger value="endpoints">API &amp; Webhooks</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">5-Step Civic Resolution Workflow</CardTitle>
              <CardDescription>
                How raw citizen communications are ingested, classified, and resolved deterministically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-blue-600">STEP 1</span>
                  <p className="font-semibold text-slate-900 my-2">Citizen Report</p>
                  <p className="text-xs text-slate-600">WhatsApp / SMS voice, text or photo received via Twilio webhook</p>
                </div>

                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-purple-600">STEP 2</span>
                  <p className="font-semibold text-slate-900 my-2">Gemini 2.5 Flash</p>
                  <p className="text-xs text-slate-600">Strict structured JSON extraction: Category, Problem, Severity &amp; Route</p>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-amber-600">STEP 3</span>
                  <p className="font-semibold text-slate-900 my-2">Deduplication</p>
                  <p className="text-xs text-slate-600">Checks for open incidents nearby to increment priority count</p>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emerald-600">STEP 4</span>
                  <p className="font-semibold text-slate-900 my-2">Routing &amp; WorkOrder</p>
                  <p className="text-xs text-slate-600">Assigns department entity, SLA deadline &amp; field work order</p>
                </div>

                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-indigo-600">STEP 5</span>
                  <p className="font-semibold text-slate-900 my-2">Citizen Confirmation</p>
                  <p className="text-xs text-slate-600">Instant TwiML/SMS reply with reference ID, SLA &amp; summary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Routing Config */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Deterministic Department &amp; SLA Matrix</CardTitle>
              <CardDescription>
                Configured in <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">src/lib/routing.ts</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead className="font-bold">Problem Type</TableHead>
                      <TableHead className="font-bold">Responsible Municipal Entity</TableHead>
                      <TableHead className="font-bold">Standard SLA</TableHead>
                      <TableHead className="font-bold">Critical SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routingEntries.map(([type, rule]) => (
                      <TableRow key={type}>
                        <TableCell className="font-mono text-xs font-semibold text-slate-900">
                          {type}
                        </TableCell>
                        <TableCell className="text-sm">{rule.responsible_entity}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.default_sla_hours} hrs</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.critical_sla_hours ? (
                            <Badge variant="destructive">{rule.critical_sla_hours} hrs</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Endpoints */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Twilio Ingestion Endpoint</CardTitle>
              <CardDescription>
                Configure this webhook URL in your Twilio WhatsApp Sandbox or Phone Number console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-950 text-slate-100 rounded-lg font-mono text-sm flex items-center justify-between">
                <span>POST /api/webhook/twilio</span>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                  x-www-form-urlencoded
                </Badge>
              </div>

              <div className="text-sm text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Expected Twilio Payload Parameters:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><code className="text-xs bg-slate-100 px-1 py-0.5 rounded">From</code>: Citizen identifier (e.g., <code className="text-xs">whatsapp:+1234567890</code>)</li>
                  <li><code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Body</code>: Complaint message or speech-to-text transcript</li>
                  <li><code className="text-xs bg-slate-100 px-1 py-0.5 rounded">MediaUrl0</code> (optional): Image URL submitted by citizen</li>
                  <li><code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Latitude / Longitude</code> (optional): WhatsApp location pin drop</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
