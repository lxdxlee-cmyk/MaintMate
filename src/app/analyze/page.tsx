
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Sparkles, AlertCircle, CheckCircle2, ListChecks } from 'lucide-react';
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
      if (!asset) throw new Error("Equipment asset not found in local journal.");

      const historicalLogs = await db.logs
        .where('assetId')
        .equals(asset.id!)
        .limit(10)
        .toArray();

      const result = await aiPoweredFaultAnalysis({
        equipmentType: asset.type,
        currentFaultDescription: currentFault.trim(),
        historicalMaintenanceLogs: historicalLogs.map(l => ({
          faultObserved: l.faultObserved || 'Not specified',
          repairActions: l.repairActions || 'Not specified',
          outcome: l.outcome || 'Unknown',
          notes: l.notes || '',
          timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
        }))
      });

      setAnalysisResult(result);
      toast({ title: "Analysis complete", description: "AI pattern recognition finished." });
    } catch (e: any) {
      console.error("Analysis error:", e);
      toast({ 
        title: "Analysis Failed", 
        description: e.message || "There was an error processing the intelligence request.", 
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          Maintenance Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">AI-powered fault analysis and troubleshooting</p>
      </header>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2">
            <Label>Select Equipment</Label>
            <Select onValueChange={setSelectedAssetId} value={selectedAssetId} disabled={isAnalyzing}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose an asset from inventory..." />
              </SelectTrigger>
              <SelectContent>
                {assets === undefined ? (
                  <div className="p-2 text-center text-xs text-muted-foreground">Loading assets...</div>
                ) : assets.length === 0 ? (
                  <div className="p-2 text-center text-xs text-muted-foreground">No assets registered yet.</div>
                ) : (
                  assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id!.toString()}>
                      {asset.type} ({asset.identifier})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Observed Fault / Symptoms</Label>
            <Textarea 
              placeholder="Describe current symptoms or fault details..." 
              value={currentFault}
              onChange={(e) => setCurrentFault(e.target.value)}
              className="min-h-[120px] bg-background"
              disabled={isAnalyzing}
            />
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedAssetId || !currentFault?.trim()}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Knowledgebase...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Start AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 p-4 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base text-primary">Analysis Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Summary</h4>
                <p className="text-sm leading-relaxed text-foreground">
                  {analysisResult.summary}
                </p>
              </div>

              <div className="grid gap-4 pt-2">
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" /> Potential Causes
                  </h3>
                  <div className="grid gap-2">
                    {analysisResult.potentialCauses.map((cause, i) => (
                      <div key={i} className="p-3 bg-destructive/5 border-l-2 border-destructive rounded-r-lg text-sm">
                        {cause}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-accent">
                    <ListChecks className="h-3.5 w-3.5" /> Troubleshooting Steps
                  </h3>
                  <div className="grid gap-2">
                    {analysisResult.troubleshootingSteps.map((step, i) => (
                      <div key={i} className="p-3 bg-accent/5 border-l-2 border-accent rounded-r-lg text-sm flex gap-3">
                        <span className="font-bold text-accent shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Historical Patterns
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.commonProblems.map((prob, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1 font-medium bg-secondary/50">
                        {prob}
                      </Badge>
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
