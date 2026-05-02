import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { FinancialService } from '../../../services/dataService';
import { classifyAccount } from '../../../services/logic/auditor';
import { AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function AnomalyMonitor() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            const result = await FinancialService.getDashboardData('2025-06');
            setData(result);
        };
        loadData();
    }, []);

    // Filter only critical/attention for the "Monitor" view
    const anomalies = data.filter(item => {
        const classification = classifyAccount(item.current.plan, item.current.exec);
        return classification.status === 'CRÍTICO' || classification.status === 'EM ATENÇÃO';
    });

    return (
        <Card className="col-span-3 border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-red-500 flex items-center gap-2">
                    <AlertCircle className="animate-pulse" />
                    Monitor de Anomalias
                </CardTitle>
                <span className="text-xs font-bold bg-red-500/20 text-red-500 px-2 py-1 rounded-full">{anomalies.length} Alertas</span>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {anomalies.map((item, idx) => (
                    <div key={idx} className="p-3 bg-background/60 backdrop-blur-sm rounded-lg border border-red-500/20 hover:border-red-500/50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground font-semibold uppercase">{item.grupo}</p>
                                <p className="text-sm font-medium">{item.conta}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold ${item.current.varPct > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {item.current.varPct > 0 ? '+' : ''}{(item.current.varPct * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Plan: R${(item.current.plan / 1000).toFixed(1)}k</span>
                            <span>Exec: R${(item.current.exec / 1000).toFixed(1)}k</span>
                        </div>
                    </div>
                ))}
                {anomalies.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhuma anomalia detectada. 👏
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
