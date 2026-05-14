
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Package, ClipboardList, ArrowRight, User, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const assetResults = useLiveQuery(() => {
    if (!query) return [];
    return db.assets
      .filter(a => a.type.toLowerCase().includes(query.toLowerCase()) || a.identifier.toLowerCase().includes(query.toLowerCase()))
      .limit(20)
      .toArray();
  }, [query]);

  const logResults = useLiveQuery(async () => {
    if (!query) return [];
    const logs = await db.logs
      .filter(l => l.faultObserved.toLowerCase().includes(query.toLowerCase()) || l.repairActions.toLowerCase().includes(query.toLowerCase()) || l.technician.toLowerCase().includes(query.toLowerCase()))
      .limit(20)
      .toArray();
    
    return Promise.all(logs.map(async log => {
      const asset = await db.assets.get(log.assetId);
      return { ...log, asset };
    }));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Global technical search..." 
          className="pl-11 h-12 text-lg shadow-sm border-2 focus-visible:border-primary transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="all">All Results</TabsTrigger>
          <TabsTrigger value="assets">Equipment</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4 space-y-6">
          {query ? (
            <>
              {assetResults && assetResults.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Package className="h-3 w-3" /> Found Assets
                  </h3>
                  <div className="grid gap-2">
                    {assetResults.map(asset => (
                      <Link key={asset.id} href={`/assets/${asset.id}`} className="block p-3 bg-white rounded-lg border border-border/50 hover:bg-muted transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{asset.type}</span>
                          <span className="text-xs font-mono text-muted-foreground">{asset.identifier}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {logResults && logResults.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="h-3 w-3" /> Found in Logs
                  </h3>
                  <div className="grid gap-3">
                    {logResults.map(log => (
                      <Card key={log.id} className="border-none shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                              {log.asset?.type} ({log.asset?.identifier})
                            </span>
                            <span className="text-[10px] text-muted-foreground">{format(log.timestamp, 'MMM d, yy')}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-1">{log.faultObserved}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" /> {log.technician}</span>
                            <Link href={`/assets/${log.assetId}`} className="text-accent font-bold ml-auto flex items-center gap-1">
                              View Asset <ArrowRight className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {!assetResults?.length && !logResults?.length && (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-sm italic">No data matched your query.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-10" />
              <p className="text-sm text-muted-foreground px-8">
                Type symptoms, serial numbers, or technicians to search your local technical journal.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid gap-2 mt-4">
            {assetResults?.map(asset => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="block p-4 bg-white rounded-xl border border-border/50 shadow-sm">
                <p className="font-bold text-primary">{asset.type}</p>
                <p className="text-xs text-muted-foreground font-mono">{asset.identifier}</p>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
           <div className="grid gap-3 mt-4">
            {logResults?.map(log => (
              <Card key={log.id} className="border-none shadow-sm">
                <CardContent className="p-4 space-y-2">
                   <p className="text-sm font-bold">{log.faultObserved}</p>
                   <p className="text-xs text-muted-foreground italic line-clamp-2">"{log.repairActions}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
