import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { FinancialService } from '../../../services/dataService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function StrategicView() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const result = await FinancialService.getDashboardData('2025-06');
            if (result.length > 0) {
                // Find the account with most data points to use as chart demo
                // In reality we would aggregate all.
                const demoHistory = result[2].historico; // Using Account 3 (Pessoal) as base
                setData(demoHistory);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    return (
        <Card className="col-span-1 md:col-span-4 transition-all duration-500 border-t-4 border-t-emerald-500 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader>
                <CardTitle className="text-emerald-500">Evolução Orçamentária (Visão Estratégica)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="mes" stroke="#888" tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="exec" stroke="#10b981" fillOpacity={1} fill="url(#colorExec)" strokeWidth={3} name="Executado" />
                            <Area type="monotone" dataKey="plan" stroke="#6366f1" fillOpacity={1} fill="url(#colorPlan)" strokeDasharray="5 5" name="Planejado" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
