
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Sparkles, AlertCircle, CheckCircle2, ListChecks } from 'lucide-react';
import { aiPoweredFaultAnalysis, type AIPoweredFaultAnalysisOutput } from '@/ai/flows/ai-powered-fault-analysis';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function AnalyzePage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [currentFault, setCurrentFault] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIPoweredFaultAnalysisOutput | null>(null);

  const assets = useLiveQuery(() => db.assets.toArray());

  const handleAnalyze = async () => {
    if (!selectedAssetId || !currentFault) {
      toast({ title: "Input missing", description: "Select equipment and describe the current fault." });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const asset = await db.assets.get(parseInt(selectedAssetId));
      if (!asset) throw new Error("Asset not found");

      const historicalLogs = await db.logs
        .where('assetId')
        .equals(asset.id!)
        .limit(10)
        .toArray();

      const result = await aiPoweredFaultAnalysis({
        equipmentType: asset.type,
        currentFaultDescription: currentFault,
        historicalMaintenanceLogs: historicalLogs.map(l => ({
          faultObserved: l.faultObserved,
          repairActions: l.repairActions,
          outcome: l.outcome,
          notes: l.notes,
          timestamp: new Date(l.timestamp).toISOString()
        }))
      });

      setAnalysisResult(result);
      toast({ title: "Analysis complete", description: "Review suggestions below." });
    } catch (e) {
      toast({ title: "Analysis Failed", description: "There was an error processing the request.", variant: "destructive" });
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
        <p className="text-sm text-muted-foreground">Analyze faults and pattern recognition</p>
      </header>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2">
            <Label>Select Equipment</Label>
            <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets?.map(asset => (
                  <SelectItem key={asset.id} value={asset.id!.toString()}>
                    {asset.type} ({asset.identifier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Observed Fault / Symptoms</Label>
            <Textarea 
              placeholder="Describe current symptoms or fault in detail..." 
              value={currentFault}
              onChange={(e) => setCurrentFault(e.target.value)}
              className="h-24"
            />
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedAssetId || !currentFault}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Knowledgebase...
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
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground p-4">
              <CardTitle className="text-lg">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-white">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysisResult.summary}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary px-1">
                <AlertCircle className="h-4 w-4" /> Potential Causes
              </h3>
              <div className="space-y-2">
                {analysisResult.potentialCauses.map((cause, i) => (
                  <div key={i} className="p-3 bg-white border-l-4 border-destructive rounded-r-lg shadow-sm text-sm">
                    {cause}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary px-1">
                <ListChecks className="h-4 w-4" /> Troubleshooting Steps
              </h3>
              <div className="space-y-2">
                {analysisResult.troubleshootingSteps.map((step, i) => (
                  <div key={i} className="p-3 bg-white border-l-4 border-accent rounded-r-lg shadow-sm text-sm flex gap-2">
                    <span className="font-bold text-accent">{i + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary px-1">
                <CheckCircle2 className="h-4 w-4" /> Common Problems
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.commonProblems.map((prob, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1 font-medium">
                    {prob}
                  </Badge>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
