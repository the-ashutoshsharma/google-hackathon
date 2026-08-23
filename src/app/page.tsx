'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  Compass,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Database,
  Building2,
  Sparkles,
  MapPin,
  Users,
  Search,
  ChevronDown,
  Flame,
  Phone,
  Check,
  RotateCcw,
  TrendingUp,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Interfaces matching Prisma Models
interface Citizen {
  id: string;
  phone_number: string;
}

interface CitizenReport {
  id: string;
  citizen_id: string;
  incident_id: string;
  text_payload: string;
  image_url: string | null;
  created_at: string;
  citizen?: Citizen;
}

interface WorkOrder {
  id: string;
  incident_id: string;
  assigned_to: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  evidence_image_url: string | null;
  created_at: string;
  completed_at: string | null;
}

interface CivicIncident {
  id: string;
  category: string;
  problem_type: string;
  workflow_route: 'FIX' | 'RELIEF' | 'PLAN';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
  lat: number | null;
  lng: number | null;
  address: string | null;
  report_count: number;
  responsible_entity: string;
  sla_hours: number;
  created_at: string;
  updated_at: string;
  reports: CitizenReport[];
  work_orders: WorkOrder[];
}

interface Metrics {
  totalSignals: number;
  totalIncidents: number;
  activeWorkOrders: number;
  urgentReliefCount: number;
  slaAdherenceRate: number;
}

interface SimulateResultPayload {
  result: {
    isNewIncident: boolean;
    incident: CivicIncident;
  };
  replyMessage: string;
}

export default function CommandCenter() {
  const [incidents, setIncidents] = useState<CivicIncident[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalSignals: 611,
    totalIncidents: 7,
    activeWorkOrders: 4,
    urgentReliefCount: 1,
    slaAdherenceRate: 87,
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activePath, setActivePath] = useState<'FIX' | 'RELIEF' | 'PLAN'>('FIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<CivicIncident | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Simulator Dialog state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simText, setSimText] = useState('');
  const [simPhone, setSimPhone] = useState('+91 98765 43210');
  const [simAddress, setSimAddress] = useState('Sector 4, Near Metro Station Gate 1');
  const [simLoading, setSimLoading] = useState(false);
  const [simResponse, setSimResponse] = useState<SimulateResultPayload | null>(null);

  // Demo simulation templates
  const demoTemplates = [
    {
      title: 'Pothole on Main Road (FIX)',
      text: 'Huge deep pothole right outside Metro Gate 2 on 4th Avenue. Several two-wheelers slipping!',
      address: '4th Avenue, Sector 4',
    },
    {
      title: 'Water Pipe Burst (RELIEF)',
      text: 'Main drinking water pipeline has burst and flooded the entire street, no water in Block E for 2 days!',
      address: 'Block E Central Road, Sector 4',
    },
    {
      title: 'Healthcare Shortage (PLAN)',
      text: 'Over 500 residents here have to travel 15km just for primary health checks and vaccinations. We need a local Primary Health Centre in South Sector!',
      address: 'Sector 4 South Expansion',
    },
  ];

  // Fetch incidents from API
  const fetchIncidents = useCallback(async (preferredId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents');
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents);
        setMetrics(data.metrics);

        // Update selected incident reference if open in Sheet
        if (preferredId) {
          const updated = data.incidents.find((i: CivicIncident) => i.id === preferredId);
          if (updated) setSelectedIncident(updated);
        } else {
          setSelectedIncident((prev) => {
            if (!prev) return null;
            return data.incidents.find((i: CivicIncident) => i.id === prev.id) || null;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Seed demo dataset
  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(' Demo dataset seeded successfully with realistic closed-loop incidents.');
        await fetchIncidents();
      }
    } catch (err) {
      console.error('Seeding error:', err);
    } finally {
      setSeeding(false);
    }
  };

  // Handle workflow actions (complete work, verify citizen, plan agenda)
  const handleIncidentAction = async (incidentId: string, action: string, payload: Record<string, unknown> = {}) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/incidents/${incidentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Action executed successfully.');
        await fetchIncidents(incidentId);
        setSelectedIncident(data.incident);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Run live simulation
  const handleSimulate = async () => {
    if (!simText.trim()) return;
    try {
      setSimLoading(true);
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: simText,
          phone: simPhone,
          address: simAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResponse(data);
        showToast(' Citizen signal processed & classified via Gemini 2.5 Flash!');
        await fetchIncidents(data.result.incident.id);
        setSelectedIncident(data.result.incident);
      } else {
        alert(data.error || 'Simulation failed');
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  // Counts for each path
  const fixCount = useMemo(() => incidents.filter((i) => i.workflow_route === 'FIX').length, [incidents]);
  const reliefCount = useMemo(() => incidents.filter((i) => i.workflow_route === 'RELIEF').length, [incidents]);
  const planCount = useMemo(() => incidents.filter((i) => i.workflow_route === 'PLAN').length, [incidents]);

  // Filtered incidents for the active path
  const activePathIncidents = useMemo(() => {
    return incidents.filter(
      (inc) =>
        inc.workflow_route === activePath &&
        (statusFilter === 'ALL' || inc.status === statusFilter) &&
        (!searchQuery ||
          inc.problem_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inc.address && inc.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          inc.responsible_entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [incidents, activePath, statusFilter, searchQuery]);

  // ID Formatter (e.g. #T-G201, #VNKM1)
  const formatIncidentId = (id: string) => {
    if (id.startsWith('incident-')) {
      return `#T-${id.replace('incident-', '').toUpperCase()}`;
    }
    if (id.length > 8) {
      return `#${id.slice(-5).toUpperCase()}`;
    }
    return `#${id.toUpperCase()}`;
  };

  // Dynamic SLA Countdown Badge Helper
  const getSLABadge = (createdAt: string, slaHours: number, status: string) => {
    if (status === 'RESOLVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 border border-emerald-800 text-emerald-400">
          <Check className="w-3 h-3" /> SLA Met
        </span>
      );
    }

    const createdTime = new Date(createdAt).getTime();
    const expiryTime = createdTime + slaHours * 3600 * 1000;
    const now = Date.now();
    const remainingMs = expiryTime - now;
    const remainingHours = Math.round(remainingMs / (3600 * 1000));

    if (remainingHours <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 border border-rose-800 text-rose-300 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Breached ({Math.abs(remainingHours)}h over)
        </span>
      );
    } else if (remainingHours <= 12) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/70 border border-amber-800 text-amber-300">
          <Clock className="w-3 h-3" /> {remainingHours}h remaining
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 border border-zinc-700 text-zinc-300">
          <Clock className="w-3 h-3" /> {remainingHours}h remaining
        </span>
      );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-rose-600 text-white font-bold text-[10px] uppercase">Critical</Badge>;
      case 'high':
        return <Badge className="bg-amber-600 text-white text-[10px] uppercase">High</Badge>;
      case 'medium':
        return <Badge className="bg-blue-600 text-white text-[10px] uppercase">Medium</Badge>;
      default:
        return <Badge className="bg-zinc-700 text-zinc-300 text-[10px] uppercase">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="text-amber-400 border-amber-500/40 bg-amber-950/30 text-[10px] uppercase font-semibold">OPEN</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="text-sky-400 border-sky-500/40 bg-sky-950/30 text-[10px] uppercase font-semibold">IN PROGRESS</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-950/30 text-[10px] uppercase font-semibold">RESOLVED</Badge>;
      case 'REOPENED':
        return <Badge variant="outline" className="text-rose-400 border-rose-500/40 bg-rose-950/30 text-[10px] uppercase font-semibold">REOPENED</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-400 text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-zinc-800 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#121215] border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* MOBILE TOP BAR (Hidden on Desktop) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0e0e12] border-b border-[#1e1e24] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-200">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Civic Action Platform</h1>
            <p className="text-[10px] text-zinc-400">Municipal Ops v2.4</p>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg bg-[#141419] border border-[#27272e] text-zinc-300"
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* LEFT SIDEBAR (Fixed w-64 on Desktop, Dark Theme) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0e0e12] border-r border-[#1e1e24] flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#1e1e24]">
            <div className="h-10 w-10 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-200 shadow-inner shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white tracking-tight">Civic Action</h2>
                <span className="px-1.5 py-0.5 rounded bg-[#18181f] border border-[#27272f] text-[9px] font-mono text-zinc-400">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Command Center</p>
            </div>
          </div>

          {/* Navigation Section: The 3 Core Paths */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 block">
              MUNICIPAL PATHWAYS
            </span>

            {/* Path A: Operational Fixes */}
            <button
              onClick={() => {
                setActivePath('FIX');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-all ${
                activePath === 'FIX'
                  ? 'bg-[#181822] border-[#383848] text-white shadow-sm'
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-[#141419] hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${activePath === 'FIX' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-[#141419] text-zinc-400'}`}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-xs">PATH A: Fixes</span>
                  <span className="text-[10px] text-zinc-400 block font-normal">Physical Work Orders</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#1c1c24] border border-[#2a2a36] text-[10px] font-mono text-zinc-300">
                {fixCount}
              </span>
            </button>

            {/* Path B: Emergency Relief */}
            <button
              onClick={() => {
                setActivePath('RELIEF');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-all ${
                activePath === 'RELIEF'
                  ? 'bg-[#221316] border-[#552528] text-rose-200 shadow-sm'
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-[#141419] hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${activePath === 'RELIEF' ? 'bg-rose-600/30 text-rose-300' : 'bg-[#141419] text-zinc-400'}`}>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-xs">PATH B: Relief</span>
                  <span className="text-[10px] text-zinc-400 block font-normal">Emergency Response</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#1c1c24] border border-[#2a2a36] text-[10px] font-mono text-rose-300">
                {reliefCount}
              </span>
            </button>

            {/* Path C: Policy & Planning */}
            <button
              onClick={() => {
                setActivePath('PLAN');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-all ${
                activePath === 'PLAN'
                  ? 'bg-[#112217] border-[#204a32] text-emerald-200 shadow-sm'
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-[#141419] hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${activePath === 'PLAN' ? 'bg-emerald-600/30 text-emerald-300' : 'bg-[#141419] text-zinc-400'}`}>
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-xs">PATH C: Policy</span>
                  <span className="text-[10px] text-zinc-400 block font-normal">Strategic Planning</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#1c1c24] border border-[#2a2a36] text-[10px] font-mono text-emerald-300">
                {planCount}
              </span>
            </button>
          </div>

          {/* Developer / Operations Actions */}
          <div className="space-y-2 pt-2 border-t border-[#1e1e24]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 block">
              OPERATIONS &amp; TOOLS
            </span>

            {/* Live WhatsApp Simulator */}
            <button
              onClick={() => {
                setSimulatorOpen(true);
                setSimResponse(null);
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#141419] hover:bg-[#1a1a22] border border-[#27272e] text-xs font-medium text-zinc-200 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>WhatsApp Simulator</span>
            </button>

            {/* Seed Demo Data */}
            <button
              onClick={() => {
                handleSeed();
                setMobileSidebarOpen(false);
              }}
              disabled={seeding}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#141419] hover:bg-[#1a1a22] border border-[#27272e] text-xs font-medium text-zinc-200 transition-colors"
            >
              <Database className={`w-4 h-4 ${seeding ? 'animate-spin text-indigo-400' : 'text-zinc-400'} shrink-0`} />
              <span>{seeding ? 'Seeding...' : 'Seed Demo Data'}</span>
            </button>

            {/* Refresh System Data */}
            <button
              onClick={() => {
                fetchIncidents();
                setMobileSidebarOpen(false);
              }}
              disabled={loading}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#141419] hover:bg-[#1a1a22] border border-[#27272e] text-xs font-medium text-zinc-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : 'text-zinc-400'} shrink-0`} />
              <span>Refresh Incidents</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Jurisdiction Switcher */}
        <div className="pt-4 border-t border-[#1e1e24] space-y-2">
          <div className="p-3 rounded-xl bg-[#141419] border border-[#27272e] text-xs space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span className="font-semibold uppercase tracking-wider">Active Jurisdiction</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <Radio className="w-3 h-3 animate-pulse" /> Live
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-200 font-medium text-xs pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Sector 4 — Demo Constituency</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (Flex-1, Scrollable, Spacious) */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-w-[1600px] mx-auto">
        {/* TOP ROW: 4 HORIZONTAL KPI CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Citizen Signals */}
          <div className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-300 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  CITIZEN SIGNALS RECEIVED
                </span>
                <div className="text-2xl font-bold text-white mt-0.5 flex items-baseline gap-1.5">
                  {metrics.totalSignals} <span className="text-xs font-normal text-zinc-400">reports</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              {metrics.totalIncidents} deduplicated incidents across constituency
            </p>
          </div>

          {/* Card 2: Active Work Orders */}
          <div className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-300 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  ACTIVE WORK ORDERS
                </span>
                <div className="text-2xl font-bold text-white mt-0.5 flex items-baseline gap-1.5">
                  {metrics.activeWorkOrders} <span className="text-xs font-normal text-zinc-400">field tasks</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Dispatched to municipal departments with SLA trackers
            </p>
          </div>

          {/* Card 3: Urgent Relief */}
          <div className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-300 shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  URGENT RELIEF DISPATCHED
                </span>
                <div className="text-2xl font-bold text-rose-300 mt-0.5 flex items-baseline gap-1.5">
                  {metrics.urgentReliefCount} <span className="text-xs font-normal text-rose-400/80">critical</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Water tankers &amp; emergency hazard response teams
            </p>
          </div>

          {/* Card 4: SLA Adherence */}
          <div className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl border border-[#27272e] bg-[#141419] flex items-center justify-center text-zinc-300 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  AVG SLA ADHERENCE
                </span>
                <div className="text-2xl font-bold text-white mt-0.5">
                  {metrics.slaAdherenceRate}%
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Closed-loop resolution verified by citizen confirmation
            </p>
          </div>
        </section>

        {/* MIDDLE ROW: CONTROLS & HEADER */}
        <section className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {activePath === 'FIX' && <Wrench className="w-4 h-4 text-indigo-400" />}
                  {activePath === 'RELIEF' && <Flame className="w-4 h-4 text-rose-400" />}
                  {activePath === 'PLAN' && <Compass className="w-4 h-4 text-emerald-400" />}
                  {activePath === 'FIX' && 'PATH A: Municipal Work Orders & Field Fixes'}
                  {activePath === 'RELIEF' && 'PATH B: Urgent Emergency & Disruption Relief'}
                  {activePath === 'PLAN' && 'PATH C: Strategic Policy & Infrastructure Planning'}
                </h2>
                <Badge variant="outline" className="text-[10px] bg-[#141419] border-[#272733] text-zinc-300">
                  {activePathIncidents.length} Incident{activePathIncidents.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activePath === 'FIX' && 'Physical repair tasks assigned deterministically to maintenance crews. Click any row to open the closed-loop detail drawer.'}
                {activePath === 'RELIEF' && 'High-severity disruptions running parallel immediate relief and permanent engineering repair tracks.'}
                {activePath === 'PLAN' && 'Aggregated citizen petitions translated into actionable policy agendas for municipal and MPLADS funding.'}
              </p>
            </div>

            {/* Search & Status Filters */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by problem, street, dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121216] border border-[#22222a] rounded-xl text-xs h-9 pl-9 pr-3 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#383848]"
                />
              </div>

              <div className="relative w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#121216] border border-[#22222a] rounded-xl text-xs h-9 px-3 text-zinc-200 focus:outline-none focus:border-[#383848] appearance-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REOPENED">REOPENED</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* MAIN VIEW: FULL WIDTH DATA TABLE / CARD GRID */}
        {activePath === 'FIX' ? (
          /* PATH A: FULL-WIDTH TABLE */
          <div className="rounded-2xl bg-[#0e0e12] border border-[#1e1e24] overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#1e1e24] hover:bg-transparent bg-[#111116]">
                  <TableHead className="text-zinc-400 text-xs font-bold py-3.5 pl-5">Incident Reference &amp; Location</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">Category &amp; Problem</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">Signals</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">Severity</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">Assigned Department</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">SLA Tracker</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 text-xs font-bold pr-5">Drawer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePathIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-zinc-500 text-xs">
                      No operational fix incidents matching your filter. Click &ldquo;Seed Demo Data&rdquo; in the sidebar to populate.
                    </TableCell>
                  </TableRow>
                ) : (
                  activePathIncidents.map((inc) => (
                    <TableRow
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className="border-b border-[#1e1e24]/60 hover:bg-[#13131a] cursor-pointer transition-colors"
                    >
                      <TableCell className="py-3.5 pl-5">
                        <div className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                          <span className="text-indigo-400">{formatIncidentId(inc.id)}</span>
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1 mt-1 max-w-xs sm:max-w-sm truncate">
                          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span className="truncate">{inc.address || 'Detected Location'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#181822] border border-[#272733] text-[11px] capitalize text-zinc-300">
                            {inc.category}
                          </span>
                          <span className="text-xs font-mono text-zinc-300">
                            {inc.problem_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-semibold text-zinc-300">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>{inc.report_count} citizens</span>
                        </div>
                      </TableCell>

                      <TableCell>{getSeverityBadge(inc.severity)}</TableCell>

                      <TableCell>
                        <span className="text-xs text-zinc-300 font-medium">
                          {inc.responsible_entity}
                        </span>
                      </TableCell>

                      <TableCell>
                        {getSLABadge(inc.created_at, inc.sla_hours, inc.status)}
                      </TableCell>

                      <TableCell>{getStatusBadge(inc.status)}</TableCell>

                      <TableCell className="text-right pr-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 h-8 gap-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : activePath === 'RELIEF' ? (
          /* PATH B: EMERGENCY RELIEF DUAL-TRACK CARDS */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activePathIncidents.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-zinc-500 text-xs rounded-2xl bg-[#0e0e12] border border-[#1e1e24]">
                No active emergency relief incidents.
              </div>
            ) : (
              activePathIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="rounded-2xl bg-[#0e0e12] border border-rose-900/50 hover:border-rose-700/80 p-5 space-y-4 cursor-pointer transition-all shadow-lg shadow-rose-950/10"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#1e1e24]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-rose-400 font-bold">
                        {formatIncidentId(inc.id)}
                      </span>
                      <Badge className="bg-rose-600 text-white font-bold text-[10px] uppercase animate-pulse">
                        CRITICAL RELIEF
                      </Badge>
                    </div>
                    {getSLABadge(inc.created_at, inc.sla_hours, inc.status)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white capitalize">
                      {inc.category.replace(/_/g, ' ')}: {inc.problem_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      {inc.address} &bull; <strong className="text-rose-300 font-medium">{inc.report_count} citizens affected</strong>
                    </p>
                  </div>

                  {/* Dual-Track Box */}
                  <div className="space-y-2.5">
                    {/* Track 1: Immediate Relief */}
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          Track 1: Immediate Relief Action
                        </span>
                        <Badge variant="outline" className="text-[9px] border-rose-700 text-rose-300">
                          Active Dispatch
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-rose-100">
                        2x 5000L Water Tankers Dispatched &bull; Water Distribution Point Activated
                      </p>
                      <p className="text-[11px] text-rose-300/80">
                        Assigned: Emergency Water Fleet Unit (ETA 45 mins)
                      </p>
                    </div>

                    {/* Track 2: Permanent Fix */}
                    <div className="p-3.5 rounded-xl bg-[#141419] border border-[#272733] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Track 2: Permanent Engineering Repair
                        </span>
                        <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-300">
                          Task WO-881
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-zinc-200">
                        Mainline 300mm Valve Excavation &amp; Pipe Replacement Task Active
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Target Resolution SLA: 12 Hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-400 font-mono">
                      Status: {inc.status}
                    </span>
                    <Button
                      size="sm"
                      className="bg-rose-700 hover:bg-rose-600 text-white text-xs h-8 gap-1"
                    >
                      <span>Open Emergency Drawer</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* PATH C: STRATEGIC POLICY CARDS */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activePathIncidents.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-zinc-500 text-xs rounded-2xl bg-[#0e0e12] border border-[#1e1e24]">
                No policy proposals created yet.
              </div>
            ) : (
              activePathIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="rounded-2xl bg-[#0e0e12] border border-emerald-900/40 hover:border-emerald-700/80 p-5 space-y-4 cursor-pointer transition-all shadow-lg shadow-emerald-950/10"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#1e1e24]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        {formatIncidentId(inc.id)}
                      </span>
                      <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                        POLICY SIGNAL
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold">
                      <Users className="w-3.5 h-3.5" />
                      <span>{inc.report_count} Citizen Petitions</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white capitalize">
                      {inc.category.replace(/_/g, ' ')}: {inc.problem_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {inc.address}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#141419] border border-[#272733] space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Strategic Justification
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-400 font-mono">
                      Review Cycle: 30-Day Master Plan
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIncidentAction(inc.id, 'plan_agenda');
                      }}
                      disabled={actionLoading}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-8 gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Add to Master Plan Agenda</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* INCIDENT DETAIL DRAWER (SHEET) */}
      <Sheet open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-[#0e0e12] border-l border-[#1e1e24] text-zinc-100 p-0 overflow-y-auto flex flex-col justify-between"
        >
          {selectedIncident && (
            <div className="p-6 space-y-6">
              {/* Drawer Header */}
              <SheetHeader className="p-0 space-y-3 pb-4 border-b border-[#1e1e24]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-indigo-400">
                      {formatIncidentId(selectedIncident.id)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#181822] border border-[#272733] text-xs capitalize text-zinc-300">
                      {selectedIncident.category}
                    </span>
                    {getSeverityBadge(selectedIncident.severity)}
                    {getStatusBadge(selectedIncident.status)}
                  </div>
                  <div>
                    {getSLABadge(selectedIncident.created_at, selectedIncident.sla_hours, selectedIncident.status)}
                  </div>
                </div>

                <SheetTitle className="text-lg font-bold text-white capitalize text-left">
                  {selectedIncident.problem_type.replace(/_/g, ' ')}
                </SheetTitle>

                <SheetDescription className="text-xs text-zinc-400 flex items-center gap-1.5 text-left">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>{selectedIncident.address || 'Address unverified'}</span>
                  <span>&bull;</span>
                  <span>Assigned: <strong className="text-zinc-200">{selectedIncident.responsible_entity}</strong></span>
                </SheetDescription>
              </SheetHeader>

              {/* 5-Step Closed-Loop Lifecycle Progress */}
              <div className="p-4 rounded-xl bg-[#121217] border border-[#1e1e24] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Closed-Loop Lifecycle Progress
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {selectedIncident.report_count} Signal{selectedIncident.report_count > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {/* Step 1 */}
                  <div className="p-2 rounded-lg bg-[#181820] border border-[#272733] text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <p className="font-bold text-[10px]">1. Reported</p>
                    <p className="text-[9px] text-zinc-400">Citizen Ingest</p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-2 rounded-lg bg-[#181820] border border-[#272733] text-zinc-200">
                    <Sparkles className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                    <p className="font-bold text-[10px]">2. AI Triage</p>
                    <p className="text-[9px] text-zinc-400">Gemini 2.5</p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-2 rounded-lg bg-[#181820] border border-[#272733] text-zinc-200">
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <p className="font-bold text-[10px]">3. Dispatched</p>
                    <p className="text-[9px] text-zinc-400">{selectedIncident.sla_hours}h SLA</p>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-2 rounded-lg border ${selectedIncident.work_orders.some((w) => w.status === 'COMPLETED') ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-[#181820] border-[#272733] text-zinc-400'}`}>
                    <FileCheck className="w-4 h-4 mx-auto mb-1" />
                    <p className="font-bold text-[10px]">4. Completed</p>
                    <p className="text-[9px]">{selectedIncident.work_orders.some((w) => w.status === 'COMPLETED') ? 'Evidence Done' : 'In Progress'}</p>
                  </div>

                  {/* Step 5 */}
                  <div className={`p-2 rounded-lg border ${selectedIncident.status === 'RESOLVED' ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300' : selectedIncident.status === 'REOPENED' ? 'bg-rose-950/70 border-rose-600 text-rose-300' : 'bg-[#181820] border-[#272733] text-zinc-400'}`}>
                    <RotateCcw className="w-4 h-4 mx-auto mb-1" />
                    <p className="font-bold text-[10px]">5. Verified</p>
                    <p className="text-[9px]">{selectedIncident.status === 'RESOLVED' ? 'Citizen Verified' : selectedIncident.status === 'REOPENED' ? 'Escalated' : 'Awaiting Reply'}</p>
                  </div>
                </div>
              </div>

              {/* Operational Summary Description */}
              <div className="p-4 rounded-xl bg-[#141419] border border-[#272733] text-xs text-zinc-300 leading-relaxed space-y-1">
                <span className="font-semibold text-zinc-400 block">Operational Summary:</span>
                <p>{selectedIncident.description}</p>
              </div>

              {/* Visual Evidence View (Before vs After) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Visual Evidence Verification (Before vs After)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before Photo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> Citizen Report Photo
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">BEFORE</span>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#272733] bg-[#09090c] relative">
                      {selectedIncident.reports[0]?.image_url ? (
                        <img
                          src={selectedIncident.reports[0].image_url}
                          alt="Before report evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                          No initial photo attached
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Photo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Field Completion Proof
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">AFTER</span>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#272733] bg-[#09090c] relative">
                      {selectedIncident.work_orders.find((w) => w.evidence_image_url)?.evidence_image_url ? (
                        <img
                          src={selectedIncident.work_orders.find((w) => w.evidence_image_url)!.evidence_image_url!}
                          alt="After repair evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs p-3 text-center">
                          <span className="font-semibold text-zinc-400">Work in Progress</span>
                          <span className="text-[10px] text-zinc-600 mt-0.5">Crew has not uploaded proof photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Trigger Panels */}
              <div className="space-y-3 pt-2">
                {/* 1. Field Worker Portal */}
                <div className="p-4 rounded-xl bg-[#141419] border border-[#272733] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                      Field Worker Portal
                    </span>
                    <Badge variant="outline" className="text-[9px]">Crew Action</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Simulate field technician repairing the issue, uploading completion proof, and marking task completed.
                  </p>
                  <Button
                    onClick={() => handleIncidentAction(selectedIncident.id, 'complete_work')}
                    disabled={actionLoading}
                    className="w-full bg-[#22222b] hover:bg-[#2b2b36] border border-[#333342] text-zinc-100 text-xs font-semibold h-9 gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Upload Completion Evidence &amp; Mark Done
                  </Button>
                </div>

                {/* 2. Citizen WhatsApp Confirmation */}
                <div className="p-4 rounded-xl bg-[#141419] border border-[#272733] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Citizen WhatsApp Confirmation
                    </span>
                    <Badge variant="outline" className="text-[9px] border-emerald-800 text-emerald-300">
                      Closed Loop
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-100 space-y-1 font-sans">
                    <p className="font-semibold text-emerald-300">WhatsApp Notification sent to Citizen:</p>
                    <p className="italic text-zinc-300 bg-[#09090c] p-2 rounded border border-[#272733]">
                      &ldquo;Municipal team has completed repair on {formatIncidentId(selectedIncident.id)}. Did this satisfactorily resolve the issue? Reply YES or NO.&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleIncidentAction(selectedIncident.id, 'verify_citizen', { response: 'YES' })}
                      disabled={actionLoading}
                      className="flex-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-semibold h-8 gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Simulate Reply YES (Resolve)
                    </Button>

                    <Button
                      onClick={() => handleIncidentAction(selectedIncident.id, 'verify_citizen', { response: 'NO' })}
                      disabled={actionLoading}
                      className="flex-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-xs font-semibold h-8 gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Simulate Reply NO (Reopen)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="p-4 border-t border-[#1e1e24] bg-[#0e0e12] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              Created: {selectedIncident ? new Date(selectedIncident.created_at).toLocaleString() : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIncident(null)}
              className="border-[#272733] bg-[#141419] text-zinc-300 text-xs"
            >
              Close Drawer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* LIVE WHATSAPP SIMULATOR MODAL */}
      <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
        <DialogContent className="max-w-2xl bg-[#0e0e12] border-[#22222a] text-zinc-100">
          <DialogHeader className="border-b border-[#1e1e24] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-white">
                Live WhatsApp / SMS Citizen Simulator
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              Submit realistic complaint text in any natural language. The system invokes Gemini 2.5 Flash live, extracts structured JSON, routes to responsible entity, and replies with SLA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Quick Test Templates */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-300">Quick Test Templates:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {demoTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSimText(tpl.text);
                      setSimAddress(tpl.address);
                    }}
                    className="p-2 text-left rounded-xl bg-[#141419] hover:bg-[#1a1a22] border border-[#272733] text-xs text-zinc-200 transition-colors"
                  >
                    <strong className="block text-indigo-300 text-[11px]">{tpl.title}</strong>
                    <span className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{tpl.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Citizen Phone Number:
                </label>
                <Input
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="bg-[#09090c] border-[#22222a] text-xs h-8 text-zinc-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Location / Landmarks:
                </label>
                <Input
                  value={simAddress}
                  onChange={(e) => setSimAddress(e.target.value)}
                  placeholder="e.g. Sector 4, Opposite Metro Station"
                  className="bg-[#09090c] border-[#22222a] text-xs h-8 text-zinc-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  WhatsApp Message Payload (Natural Language / Slang / Voice Transcription):
                </label>
                <Textarea
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Type any complaint, e.g.: 'Broken live wire sparking on the street pole near children playground! Please fix fast!'"
                  className="bg-[#09090c] border-[#22222a] text-xs text-zinc-200 min-h-[80px]"
                />
              </div>
            </div>

            {/* Live Response Card */}
            {simResponse && (
              <div className="p-4 rounded-xl bg-[#09090c] border border-indigo-500/40 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini 2.5 Flash Structured Output:
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    {simResponse.result.isNewIncident ? 'New Incident Created' : 'Deduplicated & Linked'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#141419] border border-[#272733]">
                    <span className="text-[10px] text-zinc-400 block">Category:</span>
                    <strong className="text-zinc-100 capitalize">{simResponse.result.incident.category}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141419] border border-[#272733]">
                    <span className="text-[10px] text-zinc-400 block">Problem:</span>
                    <strong className="text-zinc-100 font-mono text-[11px]">{simResponse.result.incident.problem_type}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141419] border border-[#272733]">
                    <span className="text-[10px] text-zinc-400 block">Workflow Route:</span>
                    <strong className="text-indigo-400">{simResponse.result.incident.workflow_route}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141419] border border-[#272733]">
                    <span className="text-[10px] text-zinc-400 block">SLA Target:</span>
                    <strong className="text-emerald-400">{simResponse.result.incident.sla_hours} Hours</strong>
                  </div>
                </div>

                {/* WhatsApp Citizen Reply Preview */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300">
                    Citizen WhatsApp Reply Dispatched:
                  </span>
                  <pre className="text-[11px] text-zinc-300 font-sans whitespace-pre-wrap">
                    {simResponse.replyMessage}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#1e1e24] pt-3 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setSimulatorOpen(false)}
              className="border-[#272733] bg-[#141419] text-zinc-300 text-xs"
            >
              Close
            </Button>
            <Button
              onClick={handleSimulate}
              disabled={simLoading || !simText.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5"
            >
              <Send className={`w-3.5 h-3.5 ${simLoading ? 'animate-spin' : ''}`} />
              {simLoading ? 'Processing with Gemini...' : 'Send Citizen WhatsApp Signal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
