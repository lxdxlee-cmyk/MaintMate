
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Sparkles, AlertCircle, ListChecks } from 'lucide-react';
import { aiPoweredFaultAnalysis } from '@/ai/flows/ai-powered-fault-analysis';
import { toast } from '@/hooks/use-toast';

export default function AnalyzePage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [currentFault, setCurrentFault] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const assetsData = useLiveQuery(async () => {
    const assets = await db.assets.toArray();
    return Promise.all(assets.map(async a => {
      const template = a.templateId ? await db.templates.get(a.templateId) : undefined;
      return { ...a, template };
    }));
  });

  const handleAnalyze = async () => {
    if (!selectedAssetId || !currentFault?.trim()) {
      toast({ title: "Input missing", description: "Select gear and describe symptoms." });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const asset = await db.assets.get(parseInt(selectedAssetId));
      if (!asset) throw new Error("Asset record not found.");
      
      const template = asset.templateId ? await db.templates.get(asset.templateId) : undefined;
      if (!template) throw new Error("Technical doctrine (PUBS) missing.");

      const historicalLogs = await db.logs.where('assetId').equals(asset.id!).limit(10).toArray();

      const result = await aiPoweredFaultAnalysis({
        equipmentType: template.nomenclature,
        nsn: template.nsn,
        tamcn: template.tamcn,
        technicalKnowledge: template.technicalKnowledge,
        assemblies: (template.assemblies || []).map(asm => ({
          name: asm.name,
          description: asm.description,
          components: asm.components.map(c => ({
            name: c.name,
            alias: c.alias,
            purpose: c.purpose,
            measurements: (c.expectedMeasurements || []).map(m => `${m.name}: ${m.value}`).join(', '),
            knownFaults: c.knownFaults
          }))
        })),
        currentFaultDescription: currentFault.trim(),
        historicalMaintenanceLogs: historicalLogs.map(l => ({
          faultObserved: l.activityDescription,
          repairActions: l.stepsTaken.join(', '),
          outcome: l.status,
          timestamp: new Date(l.timestamp).toISOString()
        }))
      });

      setAnalysisResult(result);
      toast({ title: "Analysis complete", description: "Diagnostic mapped against doctrine." });
    } catch (e: any) {
      toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Zap className="h-6 w-6 text-accent" /> Technical Diagnosis</h1>
        <p className="text-sm text-muted-foreground tracking-tighter uppercase font-bold">Doctrine-Driven Fault Analysis</p>
      </header>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2">
            <Label className="text-[10px] uppercase font-bold text-primary">Identify Unit (Serial)</Label>
            <Select onValueChange={setSelectedAssetId} value={selectedAssetId} disabled={isAnalyzing}>
              <SelectTrigger><SelectValue placeholder="Choose serialized gear..." /></SelectTrigger>
              <SelectContent>
                {assetsData?.map(item => (
                  <SelectItem key={item.id} value={item.id!.toString()}>SN: {item.serialNumber} ({item.template?.nomenclature || 'UNCATEGORIZED'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px] uppercase font-bold text-primary">Observed Symptoms / Fault Codes</Label>
            <Textarea placeholder="Describe the fault..." value={currentFault} onChange={(e) => setCurrentFault(e.target.value)} className="min-h-[100px]" disabled={isAnalyzing} />
          </div>
          <Button className="w-full bg-accent text-accent-foreground font-bold uppercase tracking-widest" onClick={handleAnalyze} disabled={isAnalyzing || !selectedAssetId || !currentFault?.trim()}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isAnalyzing ? "Processing Technical Specs..." : "Run AI Diagnostic"}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="bg-primary/5 p-4 border-b">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><CardTitle className="text-base text-primary uppercase font-black">AI Technical Report</CardTitle></div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1"><h4 className="text-[10px] font-bold text-muted-foreground uppercase">Diagnostic Summary</h4><p className="text-sm">{analysisResult.summary}</p></div>
            <div className="grid gap-4">
              <section className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase flex items-center gap-2 text-destructive"><AlertCircle className="h-3 w-3" /> Potential Root Causes</h3>
                <div className="grid gap-2">{analysisResult.potentialCauses.map((cause: string, i: number) => <div key={i} className="p-2 bg-destructive/5 border-l-2 border-destructive rounded text-xs">{cause}</div>)}</div>
              </section>
              <section className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase flex items-center gap-2 text-accent"><ListChecks className="h-3 w-3" /> Action Steps (Doctrine)</h3>
                <div className="grid gap-2">{analysisResult.troubleshootingSteps.map((step: string, i: number) => <div key={i} className="p-2 bg-accent/5 border-l-2 border-accent rounded text-xs flex gap-2"><span className="font-bold">{i + 1}.</span><span>{step}</span></div>)}</div>
              </section>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
