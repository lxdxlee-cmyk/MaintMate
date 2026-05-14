
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ClipboardList, Package, User, Clock, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

export default function LogsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const logsData = useLiveQuery(async () => {
    let logs = await db.logs.orderBy('timestamp').reverse().toArray();
    
    // Enrich with asset data
    const enrichedLogs = await Promise.all(logs.map(async log => {
      const asset = await db.assets.get(log.assetId);
      return { ...log, asset };
    }));

    if (!searchTerm) return enrichedLogs;

    return enrichedLogs.filter(log => 
      log.faultObserved.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.asset?.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.asset?.identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Technical Logs</h1>
        <Badge variant="outline" className="h-6 gap-1">
          <Filter className="h-3 w-3" /> Filters
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search faults, techs, or equipment..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {!logsData?.length ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No maintenance records found.</p>
          </div>
        ) : (
          logsData.map((log) => (
            <Card key={log.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="p-4 bg-muted/40 pb-2 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                      <Package className="h-3 w-3 text-primary" />
                    </div>
                    <Link href={`/assets/${log.assetId}`} className="text-xs font-bold text-primary hover:underline truncate max-w-[150px]">
                      {log.asset?.type} ({log.asset?.identifier})
                    </Link>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {format(log.timestamp, 'MMM d, HH:mm')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold">{log.faultObserved}</p>
                  <Badge variant={log.outcome === 'Resolved' ? 'default' : 'secondary'} className="text-[9px] h-4">
                    {log.outcome}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Maintainer: {log.technician}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{log.repairActions}"
                </p>
                {log.partsUsed.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {log.partsUsed.map((part, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[9px] font-medium">
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
