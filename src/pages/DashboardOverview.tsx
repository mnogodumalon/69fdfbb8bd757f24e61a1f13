import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBuchung } from '@/lib/enrich';
import type { EnrichedBuchung } from '@/types/enriched';
import type { CreateBuchung } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconCalendar, IconUser,
  IconMoon, IconCurrencyEuro, IconSearch, IconBed
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BuchungDialog } from '@/components/dialogs/BuchungDialog';
import { GastDialog } from '@/components/dialogs/GastDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '69fdfbb8bd757f24e61a1f13';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLS = [
  { key: 'offen', label: 'Offen', color: 'bg-amber-50 border-amber-200', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', dotClass: 'bg-amber-400' },
  { key: 'bestaetigt', label: 'Bestätigt', color: 'bg-emerald-50 border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  { key: 'storniert', label: 'Storniert', color: 'bg-rose-50 border-rose-200', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200', dotClass: 'bg-rose-400' },
] as const;

type StatusKey = 'offen' | 'bestaetigt' | 'storniert';

export default function DashboardOverview() {
  const {
    gast, buchung,
    gastMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBuchung = enrichBuchung(buchung, { gastMap });

  // All hooks before early returns
  const [search, setSearch] = useState('');
  const [createBuchungOpen, setCreateBuchungOpen] = useState(false);
  const [createWithStatus, setCreateWithStatus] = useState<StatusKey | null>(null);
  const [editBuchung, setEditBuchung] = useState<EnrichedBuchung | null>(null);
  const [deleteBuchung, setDeleteBuchung] = useState<EnrichedBuchung | null>(null);
  const [createGastOpen, setCreateGastOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const confirmed = enrichedBuchung.filter(b => b.fields.status?.key === 'bestaetigt');
    const activeToday = confirmed.filter(b => {
      const an = b.fields.anreise ? new Date(b.fields.anreise) : null;
      const ab = b.fields.abreise ? new Date(b.fields.abreise) : null;
      if (!an || !ab) return false;
      return an <= today && ab >= today;
    });
    const umsatz = enrichedBuchung.reduce((sum, b) => sum + (b.fields.brutto ?? b.fields.gesamtpreis ?? 0), 0);
    return {
      total: buchung.length,
      confirmed: confirmed.length,
      activeToday: activeToday.length,
      umsatz,
    };
  }, [enrichedBuchung, buchung.length, today]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enrichedBuchung;
    const q = search.toLowerCase();
    return enrichedBuchung.filter(b =>
      b.gastName.toLowerCase().includes(q) ||
      (b.fields.buchungsnummer ?? '').toLowerCase().includes(q) ||
      (b.fields.notizen ?? '').toLowerCase().includes(q)
    );
  }, [enrichedBuchung, search]);

  const byStatus = useMemo(() => {
    const map: Record<StatusKey, EnrichedBuchung[]> = { offen: [], bestaetigt: [], storniert: [] };
    for (const b of filtered) {
      const key = (b.fields.status?.key ?? 'offen') as StatusKey;
      if (key in map) map[key].push(b);
      else map['offen'].push(b);
    }
    return map;
  }, [filtered]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreateBuchung = async (fields: CreateBuchung) => {
    await LivingAppsService.createBuchungEntry(fields);
    setCreateBuchungOpen(false);
    setCreateWithStatus(null);
    fetchAll();
  };

  const handleEditBuchung = async (fields: CreateBuchung) => {
    if (!editBuchung) return;
    await LivingAppsService.updateBuchungEntry(editBuchung.record_id, fields);
    setEditBuchung(null);
    fetchAll();
  };

  const handleDeleteBuchung = async () => {
    if (!deleteBuchung) return;
    await LivingAppsService.deleteBuchungEntry(deleteBuchung.record_id);
    setDeleteBuchung(null);
    fetchAll();
  };

  const handleCreateGast = async (fields: Parameters<typeof LivingAppsService['createGastEntry']>[0]) => {
    await LivingAppsService.createGastEntry(fields);
    setCreateGastOpen(false);
    fetchAll();
  };

  const getStatusDefaultValues = (status: StatusKey) => {
    const opt = LOOKUP_OPTIONS['buchung']?.['status']?.find(o => o.key === status);
    return opt ? { status: opt } : undefined;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buchungsübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle Buchungen auf einen Blick</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCreateGastOpen(true)} className="gap-1.5">
            <IconUser size={15} className="shrink-0" />
            <span className="hidden sm:inline">Neuer Gast</span>
            <span className="sm:hidden">Gast</span>
          </Button>
          <Button size="sm" onClick={() => setCreateBuchungOpen(true)} className="gap-1.5">
            <IconPlus size={15} className="shrink-0" />
            <span className="hidden sm:inline">Neue Buchung</span>
            <span className="sm:hidden">Buchung</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Buchungen gesamt"
          value={String(stats.total)}
          description="Alle Buchungen"
          icon={<IconBed size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestätigt"
          value={String(stats.confirmed)}
          description="Aktive Buchungen"
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Heute belegte Zimmer"
          value={String(stats.activeToday)}
          description="Aktueller Aufenthalt"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtumsatz"
          value={stats.umsatz > 0 ? formatCurrency(stats.umsatz) : '—'}
          description="Alle Buchungen"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <Input
          placeholder="Gast, Buchungsnummer suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLS.map(col => {
          const items = byStatus[col.key];
          return (
            <div key={col.key} className={`rounded-2xl border-2 ${col.color} flex flex-col overflow-hidden`}>
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-current border-opacity-20">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotClass} shrink-0`} />
                  <span className="font-semibold text-sm text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">{items.length}</Badge>
                </div>
                <button
                  onClick={() => {
                    setCreateWithStatus(col.key);
                    setCreateBuchungOpen(true);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-muted-foreground hover:text-foreground"
                  title={`${col.label} Buchung erstellen`}
                >
                  <IconPlus size={15} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <IconBed size={28} stroke={1.5} className="text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Keine Buchungen</p>
                  </div>
                ) : (
                  items.map(b => (
                    <BuchungCard
                      key={b.record_id}
                      buchung={b}
                      col={col}
                      onEdit={() => setEditBuchung(b)}
                      onDelete={() => setDeleteBuchung(b)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <BuchungDialog
        open={createBuchungOpen}
        onClose={() => { setCreateBuchungOpen(false); setCreateWithStatus(null); }}
        onSubmit={handleCreateBuchung}
        defaultValues={createWithStatus ? getStatusDefaultValues(createWithStatus) : undefined}
        gastList={gast}
        enablePhotoScan={AI_PHOTO_SCAN['Buchung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchung']}
      />

      {editBuchung && (
        <BuchungDialog
          open={!!editBuchung}
          onClose={() => setEditBuchung(null)}
          onSubmit={handleEditBuchung}
          defaultValues={editBuchung.fields}
          gastList={gast}
          enablePhotoScan={AI_PHOTO_SCAN['Buchung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Buchung']}
        />
      )}

      <GastDialog
        open={createGastOpen}
        onClose={() => setCreateGastOpen(false)}
        onSubmit={handleCreateGast}
        enablePhotoScan={AI_PHOTO_SCAN['Gast']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Gast']}
      />

      <ConfirmDialog
        open={!!deleteBuchung}
        title="Buchung löschen"
        description={`Buchung von "${deleteBuchung?.gastName || 'Unbekannt'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDeleteBuchung}
        onClose={() => setDeleteBuchung(null)}
      />
    </div>
  );
}

interface BuchungCardProps {
  buchung: EnrichedBuchung;
  col: typeof STATUS_COLS[number];
  onEdit: () => void;
  onDelete: () => void;
}

function BuchungCard({ buchung: b, onEdit, onDelete }: BuchungCardProps) {
  const naechte = b.fields.naechte;
  const preis = b.fields.brutto ?? b.fields.gesamtpreis;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-white/80 p-3 space-y-2 hover:shadow-md transition-shadow">
      {/* Guest name + booking number */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {b.gastName || <span className="text-muted-foreground italic">Kein Gast</span>}
          </p>
          {b.fields.buchungsnummer && (
            <p className="text-xs text-muted-foreground truncate">#{b.fields.buchungsnummer}</p>
          )}
        </div>
        {preis != null && (
          <span className="text-xs font-semibold text-primary shrink-0">{formatCurrency(preis)}</span>
        )}
      </div>

      {/* Dates */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <IconCalendar size={13} className="shrink-0" />
        <span>{formatDate(b.fields.anreise)}</span>
        <span>→</span>
        <span>{formatDate(b.fields.abreise)}</span>
        {naechte != null && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <IconMoon size={12} className="shrink-0" />
            <span>{naechte} Nächte</span>
          </>
        )}
      </div>

      {/* Notes */}
      {b.fields.notizen && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{b.fields.notizen}</p>
      )}

      {/* Actions */}
      <div className="flex gap-1 pt-1">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <IconPencil size={13} className="shrink-0" />
          Bearbeiten
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
        >
          <IconTrash size={13} className="shrink-0" />
          Löschen
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
