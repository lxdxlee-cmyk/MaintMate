
"use client"

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ClipboardList, ArrowRight, History, Clock, Zap, Shield, AlertTriangle, Database, FileDown, Info, FileStack } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { exportReadinessReport, exportFullUnitJournal } from '@/lib/pdf-export';
import { toast } from '@/hooks/use-toast';

const APP_VERSION = "v1.3.2-SECURE";

export default function Home() {
  const recentLogs = useLiveQuery(async () => {
    const logs = await db.logs.orderBy('timestamp').reverse().limit(3).toArray();
    return Promise.all(logs.map(async log => {
      const asset = log.assetId ? await db.assets.get(log.assetId) : undefined;
      const template = asset?.templateId ? await db.templates.get(asset.templateId) : undefined;
      return { ...log, asset, template };
    }));
  });
  
  const stats = useLiveQuery(async () => {
    const assetCount = await db.assets.count();
    const logCount = await db.logs.count();
    const deadlineCount = await db.assets.where('isInMaintenance').equals(1).count();
    const fmcCount = assetCount - deadlineCount;
    return { assetCount, logCount, deadlineCount, fmcCount };
  });

  const handleMasterExport = async () => {
    if (!stats || stats.assetCount === 0) {
      toast({ title: "No Data", description: "Induct gear before exporting journal.", variant: "destructive" });
      return;
    }

    try {
      toast({ title: "Generating Journal", description: "Compiling local history..." });
      
      const assets = await db.assets.toArray();
      const logs = await db.logs.toArray();
      const templates = await db.templates.toArray();
      
      const enrichedAssets = await Promise.all(assets.map(async a => {
        const template = a.templateId ? await db.templates.get(a.templateId) : undefined;
        return { ...a, template };
      }));

      const enrichedLogs = await Promise.all(logs.map(async l => {
        const asset = await db.assets.get(l.assetId);
        const template = asset?.templateId ? await db.templates.get(asset.templateId) : undefined;
        return { ...l, asset, template };
      }));

      await exportFullUnitJournal({
        assets: enrichedAssets as any,
        logs: enrichedLogs as any,
        templates,
        stats
      });

      toast({ title: "Export Complete", description: "Master Technical Journal generated." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not compile PDF report.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      <header className="border-b-4 border-primary pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-black tracking-tighter text-primary">MAINTAIN-MATE</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/60 font-mono py-0 uppercase tracking-widest">
                BUILD: {APP_VERSION}
              </Badge>
              <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-600 border-green-200 font-mono py-0 uppercase">
                SECURE
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 cursor-help uppercase tracking-tighter">
                    <Database className="h-3 w-3" />
                    On-Device Only
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">No cloud sync. Data stored on this device only.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex justify-between items-center bg-muted/30 p-2 border border-dashed border-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Status</span>
          <div className="flex gap-1">
             <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-600 border-green-200 font-mono font-black">
              DEPLOYMENT OK
            </Badge>
            <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-200 font-mono font-black">
              LOCAL READINESS: {(stats && stats.assetCount > 0) ? `${Math.round((stats.fmcCount / stats.assetCount) * 100)}%` : '0%'}
            </Badge>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Readiness Snapshot</h2>
          <Button variant="ghost" size="sm" onClick={() => stats && exportReadinessReport(stats)} className="h-6 text-[9px] font-bold uppercase gap-1 tracking-widest p-0">
            <FileDown className="h-3 w-3" /> PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="tactical-card bg-primary text-primary-foreground border-none shadow-lg">
            <CardHeader className="p-3 pb-0 space-y-0">
              <Package className="h-4 w-4 mb-2 opacity-80" />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest">FMC Units</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black">{stats ? stats.fmcCount : 0}</span>
                <span className="text-[10px] font-bold opacity-70 uppercase">Ready</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(
            "tactical-card bg-white border-2 shadow-lg",
            (stats?.deadlineCount ?? 0) > 0 ? "border-destructive text-destructive" : "border-border"
          )}>
            <CardHeader className="p-3 pb-0 space-y-0">
              <AlertTriangle className={cn("h-4 w-4 mb-2", (stats?.deadlineCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground")} />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest">NMC Deadlined</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-4xl font-black">{stats?.deadlineCount ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quick Operations</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/assets" className="flex flex-col items-start p-4 bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-md gap-3">
            <Package className="h-6 w-6" />
            <div className="space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wider">Unit Gear</p>
              <p className="text-[8px] opacity-70 font-mono uppercase">Inventory</p>
            </div>
          </Link>
          <Link href="/analyze" className="flex flex-col items-start p-4 bg-accent text-accent-foreground hover:brightness-110 transition-all shadow-md gap-3">
            <Zap className="h-6 w-6" />
            <div className="space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wider">AI Diag</p>
              <p className="text-[8px] opacity-70 font-mono uppercase">Logic</p>
            </div>
          </Link>
          <Link href="/logs" className="flex flex-col items-start p-4 bg-white text-primary border-2 border-primary hover:bg-muted/50 transition-all shadow-md gap-3">
            <ClipboardList className="h-6 w-6" />
            <div className="space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wider">ERO Logs</p>
              <p className="text-[8px] opacity-70 font-mono uppercase">History</p>
            </div>
          </Link>
          <Button 
            variant="outline" 
            onClick={handleMasterExport}
            className="flex flex-col items-start p-4 h-auto bg-white text-accent border-2 border-accent hover:bg-accent/10 transition-all shadow-md gap-3 text-left rounded-none"
          >
            <FileStack className="h-6 w-6" />
            <div className="space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-wider">Export</p>
              <p className="text-[8px] opacity-70 font-mono uppercase">Master Journal</p>
            </div>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-l-4 border-accent pl-3">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <History className="h-3 w-3 text-accent" />
            Recent Activity
          </h2>
          <Link href="/logs" className="text-[10px] font-bold text-accent hover:underline uppercase tracking-tighter flex items-center gap-1">
            Full Log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentLogs === undefined ? (
            <div className="flex justify-center py-8"><Clock className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 bg-white border-2 border-dashed border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">No maintenance history recorded.</p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <Card key={log.id} className="tactical-card bg-white hover:bg-muted/30 transition-colors shadow-sm">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1">
                      {log.technician || 'MAINTAINER'}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">
                      {formatDistanceToNow(new Date(log.timestamp))} ago
                    </span>
                  </div>
                  <h3 className="font-bold text-[11px] mb-1 line-clamp-1 uppercase tracking-tight">
                    {log.template?.nomenclature || 'Unit'}: {log.activityDescription}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                    <Badge variant={log.status === 'Resolved' ? 'default' : 'outline'} className="text-[8px] h-4 rounded-none px-1.5 font-black uppercase tracking-tighter">
                      {log.status}
                    </Badge>
                    <span className="text-[9px] font-mono text-muted-foreground font-bold">SN: {log.asset?.serialNumber || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <footer className="pt-10 pb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-muted/40 rounded-none border border-border/50">
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em]">
            MAINTAINMATE TACTICAL // {APP_VERSION}
          </span>
        </div>
      </footer>
    </div>
  );
}
