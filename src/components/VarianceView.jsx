import React, { useState, useMemo } from 'react';
import { ChevronDown, Filter, AlertCircle, TrendingUp, TrendingDown, DollarSign, Wallet, Activity } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    LineChart, Line
} from 'recharts';

export default function VarianceView({ data, loading }) {
    const [selectedGroup, setSelectedGroup] = useState('TODOS');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = maior desvio

    const { groups, filteredData, kpis, chartData, accumulatedData } = useMemo(() => {
        if (!data) return { groups: [], filteredData: [], kpis: {}, chartData: [], accumulatedData: [] };

        const groupsList = ['TODOS', ...new Set(data.map(d => d.grupo))];

        let fd = data;
        if (selectedGroup !== 'TODOS') {
            fd = data.filter(d => d.grupo === selectedGroup);
        }

        // KPIs
        const totalPlan = fd.reduce((acc, curr) => acc + curr.current.plan, 0);
        const totalExec = fd.reduce((acc, curr) => acc + curr.current.exec, 0);
        const count = fd.length;

        // Chart Data (All items)
        const cd = fd.map(i => ({
            name: i.conta,
            val: i.current.diff,
            absVal: Math.abs(i.current.diff),
            color: i.current.diff > 0 ? '#ef4444' : '#22c55e'
        })).sort((a, b) => b.absVal - a.absVal); // Sort by magnitude for visualization

        // Sort for Table
        fd.sort((a, b) => {
            const valA = Math.abs(a.current.diff);
            const valB = Math.abs(b.current.diff);
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });

        // Accumulated Data Calculation
        const monthlyTotals = {};
        fd.forEach(item => {
            if (!item.historico) return;
            item.historico.forEach(h => {
                if (!monthlyTotals[h.mes]) {
                    monthlyTotals[h.mes] = { mes: h.mes, plan: 0, exec: 0, count: 0 };
                }
                monthlyTotals[h.mes].plan += (h.plan || 0);
                monthlyTotals[h.mes].exec += (h.exec || 0);
                if (h.exec > 0) monthlyTotals[h.mes].count++;
            });
        });

        const sortedMonths = Object.keys(monthlyTotals).sort();
        let accPlan = 0;
        let accExec = 0;

        const accumulatedData = sortedMonths.map(mes => {
            const mt = monthlyTotals[mes];
            accPlan += mt.plan;
            const isFuture = mt.exec === 0 && mt.count === 0;
            if (!isFuture) accExec += mt.exec;

            return {
                mes: new Date(mes + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }),
                Planejado: accPlan,
                Executado: isFuture ? null : accExec,
            };
        });

        return {
            groups: groupsList,
            filteredData: fd,
            kpis: { totalPlan, totalExec, count },
            chartData: cd,
            accumulatedData: accumulatedData
        };
    }, [data, selectedGroup, sortOrder]);

    if (loading) return <div className="p-10 text-center text-gray-400 animate-pulse">Carregando dados...</div>;

    // Safety check for Kpis before rendering
    if (!kpis || !kpis.totalPlan) return <div className="p-10 text-center text-gray-400">Sem dados para exibir.</div>;

    return (
        <div className="space-y-6">

            {/* 1. Header & Title */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden animate-fade-in-up" style={{ animationFillMode: 'both', animationDelay: '0ms' }}>
                <div className="absolute left-0 top-0 h-full w-2 bg-orange-500"></div>
                <h2 className="text-xl font-bold text-gray-800 ml-2 uppercase tracking-tight">Painel Tático - Análise de Variância</h2>

                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-brand-primary" />
                    <span className="font-bold text-gray-600 text-sm">Filtro de Grupo:</span>
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block p-2 min-w-[200px]"
                    >
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. KPI Cards (Added per request) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Total Planejado (Grupo)</p>
                        <p className="text-2xl font-extrabold text-gray-700 mt-1">{fmtBRL(kpis.totalPlan)}</p>
                    </div>
                    <Wallet className="w-10 h-10 text-gray-200" />
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Total Executado (Grupo)</p>
                        <p className="text-2xl font-extrabold text-blue-600 mt-1">{fmtBRL(kpis.totalExec)}</p>
                    </div>
                    <Activity className="w-10 h-10 text-blue-100" />
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Contas Registradas</p>
                        <p className="text-2xl font-extrabold text-indigo-600 mt-1">{kpis.count}</p>
                    </div>
                    <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-bold">#</div>
                </div>
            </div>

            {/* 3. Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[450px]">
                {/* All Deviations Bar Chart - Expanded Height logic could be dynamic, staying fixed for now with scroll if needed */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        Variações (Todas as Contas)
                    </h3>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                        {/* Wrapper for scrolling large charts */}
                        <div style={{ height: Math.max(400, chartData.length * 30) + 'px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip formatter={(val) => fmtBRL(val)} cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="val" radius={[0, 4, 4, 0]} barSize={15}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Accumulated Chart (New Request) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 pl-2 border-l-4 border-orange-500">
                        Evolução da Execução (Grupo Selecionado)
                    </h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={accumulatedData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <Tooltip formatter={(val) => fmtBRL(val)} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line name="Realizado" type="monotone" dataKey="Executado" stroke="#0e7490" strokeWidth={3} dot={{ r: 4 }} />
                                <Line name="Planejado" type="monotone" dataKey="Planejado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. Detailed List (Full Width) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 uppercase">Detalhamento Analítico</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Conta / Subgrupo</th>
                                <th className="px-6 py-3">Grupo</th>
                                <th className="px-6 py-3 text-right">Planejado</th>
                                <th className="px-6 py-3 text-right">Executado</th>
                                <th className="px-6 py-3 text-center">Dif (R$)</th>
                                <th className="px-6 py-3 text-center">Var (%)</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((row) => {
                                const vp = row.current.varPct;
                                let status = 'DENTRO DO ESPERADO';
                                if (vp > 0.20) status = 'CRÍTICA';
                                else if (vp > 0.10 && vp <= 0.20) status = 'EM ATENÇÃO';
                                else if (vp <= -0.40) status = 'SUBEXECUTADO';

                                return (
                                    <tr key={row.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-3 font-medium text-gray-800">{row.conta}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500">{row.grupo}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{fmtBRL(row.current.plan)}</td>
                                        <td className="px-6 py-3 text-right text-gray-800 font-bold">{fmtBRL(row.current.exec)}</td>
                                        <td className={`px-6 py-3 text-right font-medium ${row.current.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {fmtBRL(row.current.diff)}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${vp > 0.15 ? 'bg-red-100 text-red-700' :
                                                vp < -0.15 ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {fmtPct(vp)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap
                                                    ${status === 'CRÍTICA' ? 'bg-red-100 text-red-700' :
                                                    status === 'EM ATENÇÃO' ? 'bg-amber-100 text-amber-700' :
                                                        status === 'SUBEXECUTADO' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {status}
                                            </span>
                                            {(status === 'CRÍTICA' || status === 'EM ATENÇÃO') && <AlertCircle className={`w-4 h-4 mt-1 mx-auto ${status === 'CRÍTICA' ? 'text-red-500' : 'text-amber-500'}`} />}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v);
