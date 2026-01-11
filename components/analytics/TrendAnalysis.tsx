"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3,
  Target,
  Brain,
  RefreshCw
} from 'lucide-react';
import { useTrends } from '@/hooks/use-analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendAnalysisProps {
  className?: string;
}

export function TrendAnalysis({ className = '' }: TrendAnalysisProps) {
  const { isLoading, analyzeTrend, getTrend } = useTrends();
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState('1month');

  const metrics = [
    { id: 'revenue', name: 'Chiffre d\'affaires', icon: TrendingUp, color: 'green' },
    { id: 'orders', name: 'Commandes', icon: BarChart3, color: 'blue' },
    { id: 'customers', name: 'Clients', icon: TrendingUp, color: 'purple' },
    { id: 'delivery_time', name: 'Temps de livraison', icon: Minus, color: 'orange' },
    { id: 'satisfaction', name: 'Satisfaction', icon: Target, color: 'red' }
  ];

  const timeHorizons = [
    { id: '1week', name: '1 semaine' },
    { id: '1month', name: '1 mois' },
    { id: '3months', name: '3 mois' },
    { id: '6months', name: '6 mois' },
    { id: '1year', name: '1 an' }
  ];

  const handleAnalyze = async () => {
    try {
      await analyzeTrend(selectedMetric, selectedTimeHorizon);
    } catch (error) {
      console.error('Erreur analyse tendances:', error);
    }
  };

  const currentTrend = getTrend(selectedMetric, selectedTimeHorizon);
  const selectedMetricData = metrics.find(m => m.id === selectedMetric);

  const generateHistoricalData = (timeHorizon: string) => {
    const days = timeHorizon === '1week' ? 7 : 
                 timeHorizon === '1month' ? 30 :
                 timeHorizon === '3months' ? 90 :
                 timeHorizon === '6months' ? 180 : 365;

    return Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const baseValue = 50000; 
      const variation = (Math.random() - 0.5) * 0.2;
      return {
        date: date.toISOString().split('T')[0],
        value: baseValue * (1 + variation),
        formattedDate: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
      };
    });
  };

  const historicalData = generateHistoricalData(selectedTimeHorizon);

  const getTrendIcon = (direction: string = 'stable') => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une métrique" />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  <div className="flex items-center gap-2">
                    <metric.icon className="h-4 w-4" />
                    {metric.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-40">
          <Select value={selectedTimeHorizon} onValueChange={setSelectedTimeHorizon}>
            <SelectTrigger>
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {timeHorizons.map((horizon) => (
                <SelectItem key={horizon.id} value={horizon.id}>
                  {horizon.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleAnalyze} disabled={isLoading} className="shrink-0">
          {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
          Analyser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Évolution Historique - {selectedMetricData?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="formattedDate" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={selectedMetricData?.color === 'green' ? '#10b981' : '#3b82f6'}
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {currentTrend ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Prédiction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valeur actuelle</span>
                <span className="font-bold">{(currentTrend.current ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valeur prédite</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{(currentTrend.predicted ?? 0).toFixed(2)}</span>
                  {getTrendIcon(currentTrend.trendDirection)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confiance</span>
                <Badge variant="outline">{currentTrend.confidence ?? 0}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" /> Facteurs d'Influence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Principaux facteurs:</h4>
                <div className="space-y-2">
                  {(currentTrend.factors || []).map((factor, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                  {(!currentTrend.factors || currentTrend.factors.length === 0) && (
                    <span className="text-sm text-gray-500">Aucun facteur identifié.</span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Recommandations:</h4>
                <div className="space-y-2">
                  {(currentTrend.recommendations || []).map((rec, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <span className="text-sm text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Analyse de Tendance</h3>
            <p className="text-muted-foreground mb-4">
              Sélectionnez une métrique et cliquez sur "Analyser" pour obtenir des prédictions.
            </p>
            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Lancer l'Analyse
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}