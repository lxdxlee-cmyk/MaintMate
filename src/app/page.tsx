
"use client"

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ClipboardList, ArrowRight, History, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const recentLogs = useLiveQuery(() => 
    db.logs.orderBy('timestamp').reverse().limit(5).toArray()
  );
  
  const stats = useLiveQuery(async () => {
    const assetCount = await db.assets.count();
    const logCount = await db.logs.count();
    return { assetCount, logCount };
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary">MaintainMate</h1>
        <p className="text-muted-foreground">Digital technical journal & equipment tracker</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md bg-accent-gradient text-primary-foreground">
          <CardHeader className="pb-2 space-y-0">
            <Package className="h-5 w-5 mb-2 opacity-80" />
            <CardTitle className="text-sm font-medium opacity-90">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assetCount ?? 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2 space-y-0 text-primary">
            <ClipboardList className="h-5 w-5 mb-2 text-accent" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Log Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.logCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Recent Activity
          </h2>
          <Link href="/logs" className="text-xs font-medium text-accent flex items-center gap-1 hover:underline">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentLogs?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-border">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">No maintenance logs yet.</p>
              <Link href="/logs" className="mt-4 inline-block">
                <Badge variant="outline" className="cursor-pointer">Create First Log</Badge>
              </Link>
            </div>
          ) : (
            recentLogs?.map((log) => (
              <Card key={log.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {log.technician || 'Technician'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(log.timestamp)} ago
                    </span>
                  </div>
                  <h3 className="font-medium text-sm mb-1">{log.faultObserved}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.outcome === 'Resolved' ? 'default' : 'secondary'} className="text-[10px] h-5">
                      {log.outcome}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-2">
          <Link href="/assets" className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:bg-muted transition-colors">
            <Package className="h-5 w-5 text-primary mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium">Add New Equipment</p>
              <p className="text-xs text-muted-foreground">Register new serial/asset identifiers</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/analyze" className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:bg-muted transition-colors">
            <Zap className="h-5 w-5 text-accent mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium">AI Troubleshooting</p>
              <p className="text-xs text-muted-foreground">Analyze faults using historical data</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </div>
  );
}
