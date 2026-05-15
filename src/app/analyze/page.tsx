
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Sparkles, AlertCircle, CheckCircle2, ListChecks, Info, Layers } from 'lucide-react';
import { aiPoweredFaultAnalysis, type AIPoweredFaultAnalysisOutput } from '@/ai/flows/ai-powered-fault-analysis';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function AnalyzePage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [currentFault, setCurrentFault] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIPoweredFaultAnalysisOutput | null>(null);

  const assets = useLiveQuery(() => db.assets.toArray());

  const handleAnalyze = async () => {
    if (!selectedAssetId || !currentFault?.trim()) {
      toast({ title: "Input missing", description: "Select equipment and describe the current fault." });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const asset = await db.assets.get(parseInt(selectedAssetId));
      if (!asset) throw new Error("Equipment asset not found.");

      let technicalKnowledge = '';
      let components: any[] = [];
      
      if (asset.templateId) {
        const template = await db.templates.get(asset.templateId);
        technicalKnowledge = template?.technicalKnowledge || '';
        components = template?.components || [];
      }

      const historicalLogs = await db.logs
        .where('assetId')
        .equals(asset.id!)
        .limit(15)
        .toArray();

      const result = await aiPoweredFaultAnalysis({
        equipmentType: asset.nomenclature,
        nsn: asset.nsn,
        tamcn: asset.tamcn,
        technicalKnowledge,
        components: components.map(c => ({
          name: c.name,
          description: c.description,
          measurements: c.measurements
        })),
        currentFaultDescription: currentFault.trim(),
        historicalMaintenanceLogs: historicalLogs.map(l => ({
          faultObserved: l.activityDescription || 'Maintenance Activity',
          repairActions: l.stepsTaken.join(', ') || 'Observed',
          outcome: l.status || 'Ongoing',
          timestamp: new Date(l.timestamp).toISOString()
        }))
      });

      setAnalysisResult(result);
      toast({ title: "Analysis complete", description: "AI leveraged component specs for diagnostic." });
    } catch (e: any) {
      toast({ title: "Analysis Failed", description: e.message || "Intelligence request error.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          Troubleshooting Agent
        </h1>
        <p className="text-sm text-muted-foreground">AI fault analysis driven by component measurements</p>
      </header>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2">
            <Label>Select Equipment</Label>
            <Select onValueChange={setSelectedAssetId} value={selectedAssetId} disabled={isAnalyzing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets?.map(asset => (
                  <SelectItem key={asset.id} value={asset.id!.toString()}>
                    {asset.nomenclature} (SN: {asset.serialNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Symptoms / Observed Fault</Label>
            <Textarea 
              placeholder="e.g. Low voltage at master switch, won't start..." 
              value={currentFault}
              onChange={(e) => setCurrentFault(e.target.value)}
              className="min-h-[100px]"
              disabled={isAnalyzing}
            />
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedAssetId || !currentFault?.trim()}
          >
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isAnalyzing ? "Analyzing Component Specs..." : "Run AI Diagnostic"}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <div className="space-y-4">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base text-primary">Diagnostic Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Analysis Summary</h4>
                <p className="text-sm leading-relaxed">{analysisResult.summary}</p>
              </div>

              <div className="grid gap-4">
                <section className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-3 w-3" /> Likely Causes
                  </h3>
                  <div className="grid gap-2">
                    {analysisResult.potentialCauses.map((cause, i) => (
                      <div key={i} className="p-2 bg-destructive/5 border-l-2 border-destructive rounded text-xs">
                        {cause}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-accent">
                    <ListChecks className="h-3 w-3" /> Technical Troubleshooting Steps
                  </h3>
                  <div className="grid gap-2">
                    {analysisResult.troubleshootingSteps.map((step, i) => (
                      <div key={i} className="p-2 bg-accent/5 border-l-2 border-accent rounded text-xs flex gap-2">
                        <span className="font-bold shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
