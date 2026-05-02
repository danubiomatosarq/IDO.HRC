import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Filter, PieChart, Target } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { InfoModal } from './InfoModal';

export default function StrategicView({ data, loading }) {
    const [selectedGroup, setSelectedGroup] = useState('TODOS');
    const [showInfo, setShowInfo] = useState(false);

    // --- FILTERS & DATA PROCESSING ---
    const groups = useMemo(() => {
        if (!data) return ['TODOS'];
        return ['TODOS', ...new Set(data.map(d => d.grupo))];
    }, [data]);

    const { kpis, charts, table } = useMemo(() => processData(data, selectedGroup), [data, selectedGroup]);

    if (loading) return <div className="p-10 text-center text-gray-400 animate-pulse">Carregando dados estratégicos...</div>;
    if (!data || data.length === 0) return <div className="p-10 text-center text-gray-400">Sem dados para o período.</div>;
    return (
        <div className="space-y-6">
            {/* 1. Header & Filter */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden animate-fade-in-up" style={{ animationFillMode: 'both', animationDelay: '0ms' }}>
                <div className="absolute left-0 top-0 h-full w-2 bg-brand-primary"></div>

                <h2 className="text-xl font-bold text-gray-800 ml-2 uppercase tracking-tight flex items-center gap-2">
                    Painel - Visão Estratégica Orçamentária
                </h2>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.open('https://script.google.com/macros/s/AKfycbw20E0J1Bm_BQxCcnJRG2pypN6xF71XXa4SKSmV0mMpINbZLALS5o9plZc-UoviAP7twQ/exec', '_blank')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        title="Importar novo Orçamento/Acompanhamento"
                    >
                        <Wallet className="w-4 h-4" /> Importar Dados
                    </button>

                    <button
                        onClick={() => setShowInfo(true)}
                        className="p-2 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-colors"
                        title="Guia Completo do Painel"
                    >
                        <AlertCircle className="w-5 h-5 border-none" style={{ strokeWidth: 2.5 }} />
                    </button>

                    <Filter className="w-4 h-4 text-gray-500 ml-2" />
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block p-2"
                    >
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

            {/* 2. KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="% Execução Total"
                    value={kpis.execPct}
                    subtext={`R$ ${kpis.totalExecFmt} de R$ ${kpis.totalPlanFmt}`}
                    icon={Wallet}
                    color="text-brand-primary"
                    type="percent"
                    bgClass="bg-white"
                />
                <KPICard
                    title="Variância R$"
                    value={kpis.totalDiffFmt}
                    subtext={`${kpis.varPct} ${kpis.diffPositive ? 'acima' : 'abaixo'} do orçado`}
                    icon={TrendingUp}
                    color={kpis.diffPositive ? "text-red-600" : "text-emerald-600"}
                    type="currency"
                    isAlert={kpis.diffPositive}
                    bgClass="bg-white"
                />
                <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-gray-300 flex items-center justify-between relative overflow-hidden transition-all hover:shadow-lg group">
                    <div className="absolute right-[-10px] top-[-10px] opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                        <Target className="w-24 h-24 text-gray-900" />
                    </div>

                    <div className="z-10 w-full flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status Geral</p>
                        <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border shadow-sm ${kpis.diff > 0
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}>
                            {kpis.diff > 0 ? 'ACIMA DA META' : 'DENTRO DA META'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                {/* Bar Chart: Budget vs Exec by Group (or Account if Group Selected) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 pl-2 border-l-4 border-brand-primary">
                        Orçado x Executado {selectedGroup !== 'TODOS' ? `(${selectedGroup})` : '- Top Grupos'}
                    </h3>
                    <div className="flex-1 w-full min-h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.byGroup} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, angle: -30, textAnchor: 'end' }}
                                    interval={0}
                                    height={50}
                                />

                                {/* Lado Esquerdo (Padrão) */}
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `R$${val / 1000}k`} />

                                {/* Lado Direito (Highlight/Outlier) - Só mostra se tiver outlier */}
                                {charts.hasOutlier && (
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#f97316' }}
                                        tickFormatter={(val) => `R$${val / 1000000}mi`}
                                    />
                                )}

                                <Tooltip formatter={(val) => fmtBRL(val)} />
                                <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />

                                {/* Stack IDs shared to group budget/exec together per axis */}
                                <Bar yAxisId="left" dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar yAxisId="left" dataKey="Executado" fill="#0e7490" radius={[4, 4, 0, 0]} maxBarSize={50} />

                                {charts.hasOutlier && (
                                    <>
                                        <Bar yAxisId="right" dataKey="Orçado_Highlight" name="Orçado (Top 1)" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Bar yAxisId="right" dataKey="Executado_Highlight" name="Executado (Top 1)" fill="#155e75" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Line Chart: Accumulated + Projection */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 pl-2 border-l-4 border-orange-500">
                        Execução Acumulada + Projeção (Mediana)
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.accumulated} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => charts.totalAccPlan ? `${((val / charts.totalAccPlan) * 100).toFixed(0)}%` : '0%'}
                                    domain={[0, charts.totalAccPlan > 0 ? charts.totalAccPlan * 1.1 : 'auto']}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip formatter={(val) => fmtBRL(val)} />
                                <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />
                                <Line name="Realizado" type="monotone" dataKey="Executado" stroke="#0e7490" strokeWidth={3} dot={{ r: 4 }}>
                                </Line>
                                <Line name="Meta Linear" type="monotone" dataKey="Planejado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                <Line name="Projeção (Mediana)" type="monotone" dataKey="Projecao" stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. Scatter Plot & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Scatter Plot: Budget vs Variance % */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-[450px] flex flex-col">
                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 pl-2 border-l-4 border-purple-500">
                        Dispersão: Orçamento x Variância
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="x" name="Orçamento" unit="k" tick={{ fontSize: 10 }} />
                                <YAxis type="number" dataKey="y" name="Variância" unit="%" tick={{ fontSize: 10 }} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Impacto" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(val, name) => name === 'Orçamento' ? `R$${val}k` : `${val}%`} />
                                <Scatter name="Grupos" data={charts.scatter} fill="#8884d8">
                                    {charts.scatter.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.y > 10 ? '#ef4444' : entry.y < -20 ? '#3b82f6' : '#22c55e'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[450px] hover:shadow-lg transition-shadow duration-300">
                    <div className="p-0 bg-gray-400 border-b border-gray-300">
                        <h3 className="text-sm font-bold text-white px-4 py-3 tracking-wide shadow-inner">
                            {selectedGroup === 'TODOS' ? 'Grupos Orçamentários' : 'Contas Orçamentárias'} - Desvio Percentual
                        </h3>
                    </div>
                    <div className="overflow-auto flex-1 bg-white">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead className="bg-[#a3a3a3] text-white font-bold text-xs sticky top-0 z-10 shadow-sm leading-tight">
                                <tr>
                                    <th className="px-4 py-2.5 text-left w-1/3">{selectedGroup === 'TODOS' ? 'NomeGrupo' : 'NomeConta'}</th>
                                    <th className="px-4 py-2.5">Status de Risco</th>
                                    <th className="px-4 py-2.5">Planejado</th>
                                    <th className="px-4 py-2.5">Executado</th>
                                    <th className="px-4 py-2.5">Variância R$</th>
                                    <th className="px-4 py-2.5">Variância {selectedGroup === 'TODOS' ? 'Grupo' : 'Conta'} %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold">
                                {table.map((row, idx) => {
                                    let rowClass = "text-gray-600 hover:bg-gray-50";
                                    if (row.status === 'CRÍTICA') rowClass = "text-[#ef4444] bg-red-50/10 hover:bg-red-50/50";
                                    else if (row.status === 'EM ATENÇÃO') rowClass = "text-[#f59e0b] bg-amber-50/10 hover:bg-amber-50/50";
                                    else if (row.status === 'SUBEXECUTADO') rowClass = "text-[#3b82f6] bg-blue-50/10 hover:bg-blue-50/50";

                                    let statusText = row.status;
                                    if (row.status === 'CRÍTICA') statusText = "1 - Crítico";
                                    else if (row.status === 'EM ATENÇÃO') statusText = "2 - Atenção";
                                    else if (row.status === 'DENTRO DO ESPERADO') statusText = "4 - Dentro do Esperado";
                                    else if (row.status === 'SUBEXECUTADO') statusText = "5 - Subexecutado";

                                    return (
                                        <tr key={idx} className={`transition-colors ${rowClass}`}>
                                            <td className="px-4 py-2 text-left uppercase truncate max-w-[150px]" title={row.name}>{row.name}</td>
                                            <td className="px-4 py-2">{statusText}</td>
                                            <td className="px-4 py-2">{row.planFmt}</td>
                                            <td className="px-4 py-2">{row.execFmt}</td>
                                            <td className="px-4 py-2">{fmtBRL(row.varVal)}</td>
                                            <td className="px-4 py-2">{row.varPctFmt}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* LEGENDA */}
                    <div className="bg-gray-50 p-2.5 text-[9px] font-bold border-t border-gray-200 flex flex-col gap-0.5 leading-tight tracking-wider">
                        <span className="text-gray-800 mb-0.5">LEGENDA:</span>
                        <span className="text-[#ef4444]">CRÍTICO Variância % &gt; 20%</span>
                        <span className="text-[#f59e0b]">EM ATENÇÃO 10% &lt; Variância % &lt;= 20%</span>
                        <span className="text-gray-500">DENTRO DO ESPERADO -40% &lt; Variância % &lt;= 10%</span>
                        <span className="text-[#3b82f6]">SUBEXECUTADO Variância % &lt;= -40%</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

// --- HELPER COMPONENTS ---

function KPICard({ title, value, subtext, icon: Icon, color, type, isAlert, bgClass }) {
    return (
        <div className={`${bgClass} rounded-xl p-6 shadow-md border-l-4 ${color.replace('text-', 'border-')} relative overflow-hidden transition-all hover:shadow-lg group`}>
            {type === 'percent' && (
                <div className="absolute right-[-10px] top-[-10px] opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-24 h-24 text-gray-900" />
                </div>
            )}

            <div className="relative z-10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    {title}
                    {isAlert && <AlertCircle className="w-3 h-3 text-red-500" />}
                </h3>
                <div className={`text-3xl font-black ${color} mb-2 tracking-tight`}>{value}</div>
                <div className="text-xs font-semibold text-gray-500 bg-gray-50 inline-block px-2 py-1 rounded">
                    {subtext}
                </div>
            </div>
        </div>
    )
}

// --- DATA PROCESSING LOGIC ---

function processData(data, selectedGroup) {
    if (!data) return { kpis: {}, charts: { byGroup: [], accumulated: [], scatter: [] }, table: [] };

    // Filter First
    const filtered = selectedGroup === 'TODOS' ? data : data.filter(d => d.grupo === selectedGroup);

    let totalPlan = 0;
    let totalExec = 0;
    const itemsMap = {};

    // 1. Aggregation
    filtered.forEach(item => {
        const p = item.current.plan;
        const e = item.current.exec;
        totalPlan += p;
        totalExec += e;

        // Group by 'grupo' if ALL, otherwise by 'conta'
        const key = selectedGroup === 'TODOS' ? item.grupo : item.conta;

        if (!itemsMap[key]) {
            itemsMap[key] = { plan: 0, exec: 0, name: key, count: 0 };
        }
        itemsMap[key].plan += p;
        itemsMap[key].exec += e;
        itemsMap[key].count += 1;
    });

    // 2. KPIs
    const diff = totalExec - totalPlan;
    const varPct = totalPlan > 0 ? diff / totalPlan : 0;
    const execPct = totalPlan > 0 ? totalExec / totalPlan : 0;

    const kpis = {
        totalPlanFmt: fmtBRL(totalPlan, true),
        totalExecFmt: fmtBRL(totalExec, true),
        totalDiffFmt: fmtBRL(diff, true),
        execPct: fmtPct(execPct),
        varPct: fmtPct(Math.abs(varPct)),
        diffPositive: diff > 0,
        diff
    };

    // 3. Charts: Bar Chart Data - Logic for Dual Axis
    // Identify outlier (Top 1)
    const sortedGroups = Object.values(itemsMap).sort((a, b) => b.plan - a.plan);
    const top1 = sortedGroups[0];
    const top2 = sortedGroups[1];

    // Threshold: If Top 1 is > 2.5x Top 2, treat as outlier
    const hasOutlier = top1 && top2 && (top1.plan > 2.5 * top2.plan);

    const chartsByGroup = sortedGroups.slice(0, 12).map(g => {
        const isOutlier = hasOutlier && g.name === top1.name;
        return {
            name: g.name,
            // Split data keys for dual axis
            "Orçado": isOutlier ? 0 : g.plan,
            "Executado": isOutlier ? 0 : g.exec,
            "Orçado_Highlight": isOutlier ? g.plan : 0,
            "Executado_Highlight": isOutlier ? g.exec : 0,
            isOutlier
        };
    });

    // 4. Charts: Accumulated (Real Data from History)
    // First, gather totals per month across all accounts
    const monthlyTotals = {};
    filtered.forEach(item => {
        if (!item.historico) return;
        item.historico.forEach(h => {
            if (!monthlyTotals[h.mes]) {
                monthlyTotals[h.mes] = { mes: h.mes, plan: 0, exec: 0, count: 0 };
            }
            monthlyTotals[h.mes].plan += (h.plan || 0);
            monthlyTotals[h.mes].exec += (h.exec || 0);
            if (h.exec > 0) monthlyTotals[h.mes].count++; // basic check for actual execution
        });
    });

    // Sort chronologically and accumulate
    const sortedMonths = Object.keys(monthlyTotals).sort();

    let totalAccPlan = 0;
    sortedMonths.forEach(m => totalAccPlan += monthlyTotals[m].plan);

    let accPlan = 0;
    let accExec = 0;

    const accumulated = sortedMonths.map(mes => {
        const mt = monthlyTotals[mes];
        accPlan += mt.plan;
        // If there's 0 execution and we are far in the future, might be pending. Let's just accumulate what we have.
        // Or if it's completely 0, we leave exec as null to break the line?
        // Let's assume if count == 0 and sum == 0, it hasn't happened yet.
        const isFuture = mt.exec === 0 && mt.count === 0;
        if (!isFuture) accExec += mt.exec;

        return {
            mes: new Date(mes + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }),
            Planejado: accPlan,
            Executado: isFuture ? null : accExec,
            Projecao: null // Simple projection could be added if needed
        };
    });

    // Add a simple linear projection for future months based on average execution so far
    if (accumulated.length > 0) {
        const lastExecIdx = accumulated.map(a => a.Executado).findLastIndex(v => v !== null);
        if (lastExecIdx >= 0 && lastExecIdx < accumulated.length - 1) {
            const avgExecPerMonth = accumulated[lastExecIdx].Executado / (lastExecIdx + 1);
            for (let i = lastExecIdx + 1; i < accumulated.length; i++) {
                accumulated[i].Projecao = accumulated[lastExecIdx].Executado + (avgExecPerMonth * (i - lastExecIdx));
            }
        }
    }

    // 5. Charts: Scatter Plot
    const scatter = Object.values(itemsMap).map(g => {
        const vPct = g.plan > 0 ? ((g.exec - g.plan) / g.plan) * 100 : 0;
        return {
            name: g.name,
            x: Math.round(g.plan / 1000),
            y: parseFloat(vPct.toFixed(1)),
            z: Math.abs(g.exec - g.plan)
        };
    });

    // 6. Table... (unchanged)
    const tableData = Object.values(itemsMap).map(g => {
        const d = g.exec - g.plan;
        const vp = g.plan > 0 ? d / g.plan : 0;
        let status = 'DENTRO DO ESPERADO';
        if (vp > 0.20) status = 'CRÍTICA';
        else if (vp > 0.10 && vp <= 0.20) status = 'EM ATENÇÃO';
        else if (vp <= -0.40) status = 'SUBEXECUTADO';

        return {
            name: g.name,
            planFmt: fmtBRL(g.plan),
            execFmt: fmtBRL(g.exec),
            varVal: d,
            varPct: vp,
            varPctFmt: fmtPct(vp),
            status
        };
    }).sort((a, b) => b.varPct - a.varPct);

    return { kpis, charts: { byGroup: chartsByGroup, accumulated, scatter, hasOutlier, totalAccPlan }, table: tableData };
}

// Utils
const fmtBRL = (v, compact = false) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 1
}).format(v);

const fmtPct = (v) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v);
