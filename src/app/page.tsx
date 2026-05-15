"use client"

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ClipboardList, ArrowRight, History, Clock, Zap, Shield, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Home() {
  const recentLogs = useLiveQuery(() => 
    db.logs.orderBy('timestamp').reverse().limit(5).toArray()
  );
  
  const stats = useLiveQuery(async () => {
    const assetCount = await db.assets.count();
    const logCount = await db.logs.count();
    const deadlineCount = await db.assets.where('isInMaintenance').equals(1).count();
    return { assetCount, logCount, deadlineCount };
  });

  return (
    <div className="space-y-6">
      <header className="border-b-4 border-primary pb-2">
        <h1 className="text-3xl font-black tracking-tighter text-primary flex items-center gap-2">
          <Shield className="h-8 w-8" />
          MAINTAIN-MATE
        </h1>
        <div className="flex justify-between items-center mt-1">
          <Badge variant="outline" className="text-[9px] border-primary text-primary font-mono">
            SECURE LOCAL JOURNAL
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="tactical-card bg-primary text-primary-foreground">
          <CardHeader className="pb-2 space-y-0">
            <Package className="h-5 w-5 mb-2 opacity-80" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Readiness Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{stats ? stats.assetCount - stats.deadlineCount : 0}</span>
              <span className="text-xs font-bold opacity-70">/ {stats?.assetCount ?? 0} FMC</span>
            </div>
            <p className="text-[9px] mt-1 font-mono uppercase">Full Mission Capable</p>
          </CardContent>
        </Card>
        
        <Card className="tactical-card bg-white border-destructive">
          <CardHeader className="pb-2 space-y-0 text-destructive">
            <AlertTriangle className="h-5 w-5 mb-2" />
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-destructive">Deadline List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive">{stats?.deadlineCount ?? 0}</div>
            <p className="text-[9px] mt-1 font-mono uppercase text-destructive font-bold">NMC / Deadlined</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-l-4 border-accent pl-3">
          <h2 className="text-sm font-black flex items-center gap-2 tracking-widest uppercase">
            <History className="h-4 w-4 text-accent" />
            Recent ERO Entries
          </h2>
          <Link href="/logs" className="text-[10px] font-bold text-accent flex items-center gap-1 hover:underline uppercase tracking-tighter">
            Full Log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentLogs === undefined ? (
            <div className="flex justify-center py-12"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-12 bg-white border-2 border-dashed border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No maintenance history detected.</p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <Card key={log.id} className="tactical-card bg-white hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                      {log.technician || 'UNKNOWN TECH'}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">
                      T-{formatDistanceToNow(log.timestamp)}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs mb-1 line-clamp-1">{log.activityDescription}</h3>
                  <div className="flex items-center justify-between">
                    <Badge className={cn(
                      "text-[9px] h-4 rounded-none px-1 font-black uppercase",
                      log.status === 'Resolved' ? "bg-primary" : "bg-accent"
                    )}>
                      {log.status}
                    </Badge>
                    <span className="text-[9px] font-mono text-muted-foreground">SR: {log.serviceRequestId || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2 border-l-4 border-primary pl-3 tracking-widest uppercase">
          <Zap className="h-4 w-4 text-primary" />
          Tactical Operations
        </h2>
        <div className="grid grid-cols-1 gap-2">
          <Link href="/assets" className="flex items-center p-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg">
            <Package className="h-5 w-5 mr-3" />
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest">Inventory Management</p>
              <p className="text-[9px] opacity-70 font-mono">Process new serialized equipment</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/analyze" className="flex items-center p-4 bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-lg">
            <Zap className="h-5 w-5 mr-3" />
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest">Technical Diagnosis</p>
              <p className="text-[9px] opacity-70 font-mono">AI-Driven fault analysis (TM Logic)</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
