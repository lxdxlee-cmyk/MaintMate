
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Package, ClipboardList, ArrowRight, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const assetResults = useLiveQuery(async () => {
    if (!query) return [];
    const term = query.toLowerCase();
    
    // Enrich and filter locally as Dexie doesn't support complex cross-table joins in a single filter
    const allAssets = await db.assets.toArray();
    const enriched = await Promise.all(allAssets.map(async a => {
      const template = a.templateId ? await db.templates.get(a.templateId) : undefined;
      return { ...a, template };
    }));

    return enriched.filter(a => 
      (a.template?.nomenclature || '').toLowerCase().includes(term) || 
      (a.serialNumber || '').toLowerCase().includes(term) ||
      (a.template?.nsn || '').toLowerCase().includes(term) ||
      (a.template?.tamcn || '').toLowerCase().includes(term) ||
      (a.owner || '').toLowerCase().includes(term)
    );
  }, [query]);

  const logResults = useLiveQuery(async () => {
    if (!query) return [];
    const term = query.toLowerCase();
    const logs = await db.logs
      .filter(l => 
        (l.activityDescription || '').toLowerCase().includes(term) || 
        (l.technician || '').toLowerCase().includes(term) ||
        (l.serviceRequestId || '').toLowerCase().includes(term) ||
        (l.stepsTaken || []).some(step => step.toLowerCase().includes(term))
      )
      .limit(20)
      .toArray();
    
    return Promise.all(logs.map(async log => {
      const asset = await db.assets.get(log.assetId);
      const template = asset?.templateId ? await db.templates.get(asset.templateId) : undefined;
      return { ...log, asset, template };
    }));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Global technical search..." 
          className="pl-11 h-12 text-lg shadow-sm border-2 border-primary/20 focus-visible:border-primary transition-all rounded-none uppercase font-mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-none border-b">
          <TabsTrigger value="all" className="rounded-none text-[10px] font-black uppercase">All Results</TabsTrigger>
          <TabsTrigger value="assets" className="rounded-none text-[10px] font-black uppercase">Equipment</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-none text-[10px] font-black uppercase">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4 space-y-6">
          {query ? (
            <>
              {assetResults && assetResults.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Package className="h-3 w-3" /> Found Assets
                  </h3>
                  <div className="grid gap-2">
                    {assetResults.map(asset => (
                      <Link key={asset.id} href={`/assets/${asset.id}`} className="block p-3 bg-white border-2 border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-tighter">{asset.template?.nomenclature || 'SERIALIZED UNIT'}</span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">SN: {asset.serialNumber}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {logResults && logResults.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="h-3 w-3" /> Found in Logs
                  </h3>
                  <div className="grid gap-3">
                    {logResults.map(log => (
                      <Card key={log.id} className="border-none shadow-sm bg-white overflow-hidden rounded-none border-l-4 border-primary">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-primary truncate max-w-[150px] uppercase tracking-tighter">
                              {log.template?.nomenclature || 'UNIT'} (SN: {log.asset?.serialNumber || 'N/A'})
                            </span>
                            <span className="text-[9px] font-mono font-bold text-muted-foreground">{format(log.timestamp, 'MMM d, yy')}</span>
                          </div>
                          <p className="text-xs font-bold line-clamp-1 uppercase tracking-tight">{log.activityDescription}</p>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground font-bold uppercase">
                            <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" /> {log.technician}</span>
                            <Link href={`/assets/${log.assetId}`} className="text-accent font-black ml-auto flex items-center gap-1 hover:underline">
                              View Asset <ArrowRight className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {(!assetResults || assetResults.length === 0) && (!logResults || logResults.length === 0) && (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-[10px] font-bold uppercase tracking-widest italic">No technical data matches query.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-muted/20 border-2 border-dashed border-border">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-10" />
              <p className="text-[10px] font-bold text-muted-foreground px-8 uppercase tracking-widest leading-loose">
                Input symptoms, serial numbers, or nomenclature to search technical history.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid gap-2 mt-4">
            {assetResults?.map(asset => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="block p-4 bg-white border-2 border-border shadow-sm hover:bg-muted/50 transition-all">
                <p className="font-black text-xs text-primary uppercase tracking-tighter">{asset.template?.nomenclature || 'UNIT'}</p>
                <p className="text-[10px] text-muted-foreground font-mono font-bold uppercase mt-1">SN: {asset.serialNumber} | {asset.owner}</p>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
           <div className="grid gap-3 mt-4">
            {logResults?.map(log => (
              <Card key={log.id} className="border-none shadow-sm rounded-none border-l-4 border-primary bg-white">
                <CardContent className="p-4 space-y-2">
                   <div className="flex justify-between items-start">
                     <p className="text-xs font-black uppercase tracking-tight">{log.activityDescription}</p>
                     <p className="text-[9px] font-mono font-bold text-muted-foreground">{format(log.timestamp, 'MMM d')}</p>
                   </div>
                   <p className="text-[10px] text-muted-foreground italic line-clamp-2 uppercase">
                     {log.stepsTaken?.join(' // ') || 'No steps recorded.'}
                   </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
