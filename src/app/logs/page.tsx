
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ClipboardList, Package, User, Clock, Filter, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { exportMasterLogs } from '@/lib/pdf-export';

export default function LogsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const logsData = useLiveQuery(async () => {
    let logs = await db.logs.orderBy('timestamp').reverse().toArray();
    
    const enrichedLogs = await Promise.all(logs.map(async log => {
      const asset = log.assetId ? await db.assets.get(log.assetId) : undefined;
      const template = asset?.templateId ? await db.templates.get(asset.templateId) : undefined;
      return { ...log, asset, template };
    }));

    if (!searchTerm) return enrichedLogs;

    const term = searchTerm.toLowerCase();
    return enrichedLogs.filter(log => 
      log.activityDescription.toLowerCase().includes(term) ||
      log.technician.toLowerCase().includes(term) ||
      log.template?.nomenclature.toLowerCase().includes(term) ||
      log.asset?.serialNumber.toLowerCase().includes(term) ||
      log.serviceRequestId?.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Technical History (ERO)</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => logsData && exportMasterLogs(logsData as any)} className="h-8 text-[9px] font-bold uppercase gap-1">
            <FileDown className="h-4 w-4" /> Export ERO Log
          </Button>
          <Badge variant="outline" className="h-6 gap-1 uppercase tracking-tighter text-[9px]">
            <Filter className="h-3 w-3" /> All Activities
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by SR#, Serial, or Description..." 
          className="pl-10 uppercase text-xs font-mono"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {!logsData?.length ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-primary/20">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground italic uppercase tracking-widest font-bold">No historical journal entries recorded.</p>
          </div>
        ) : (
          logsData.map((log) => (
            <Card key={log.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow bg-white">
              <CardHeader className="p-3 bg-muted/40 pb-2 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-3 w-3 text-primary shrink-0" />
                    <Link href={`/assets/${log.assetId}`} className="text-[11px] font-black text-primary hover:underline truncate uppercase tracking-tighter">
                      {log.template?.nomenclature || 'Unit'} (SN: {log.asset?.serialNumber || 'N/A'})
                    </Link>
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap font-mono font-bold">
                    {format(log.timestamp, 'MMM d, yy')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-semibold leading-tight">{log.activityDescription}</p>
                  <Badge variant={log.status === 'Resolved' ? 'default' : 'outline'} className="text-[9px] h-4 uppercase font-black">
                    {log.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase font-bold">
                  <div className="flex items-center gap-1">
                    <User className="h-2.5 w-2.5" /> {log.technician || 'Maintainer'}
                  </div>
                  {log.serviceRequestId && (
                    <div className="flex items-center gap-1 font-mono">
                      SR: {log.serviceRequestId}
                    </div>
                  )}
                </div>

                {log.stepsTaken && log.stepsTaken.length > 0 && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 italic border-t pt-1 mt-1">
                    Latest Step: {log.stepsTaken[log.stepsTaken.length - 1]}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
