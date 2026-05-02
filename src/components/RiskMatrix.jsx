import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle, BrainCircuit, X, ChevronRight, Zap } from 'lucide-react';

export default function RiskMatrix({ anomalies, fullPage }) {
    const [selectedGroup, setSelectedGroup] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);

    // 1. Filter Data: Identify Groups with ANY Critical Item
    const { criticalGroups, criticalItems, goodItems, allGroupsList } = useMemo(() => {
        if (!anomalies) return { criticalGroups: [], criticalItems: [], goodItems: [], allGroupsList: [] };

        // Group items by 'grupo'
        const grouped = {};
        anomalies.forEach(item => {
            if (!item || !item.current) return;

            if (!grouped[item.grupo]) grouped[item.grupo] = { name: item.grupo, hasCritical: false, items: [] };

            // Check strict criticality (e.g., > 15% variance)
            const isCritical = item.current.varPct > 0.15;
            if (isCritical) {
                grouped[item.grupo].hasCritical = true;
            }
            grouped[item.grupo].items.push({ ...item, isCritical });
        });

        const cGroups = Object.values(grouped).filter(g => g.hasCritical).map(g => g.name);

        // Default selection logic: If selectedGroup is invalid, pick the first critical one
        const activeGroup = selectedGroup && cGroups.includes(selectedGroup) ? selectedGroup : cGroups[0] || '';

        // Filter items for the Active Group
        const groupData = activeGroup ? grouped[activeGroup] : null;
        const cItems = groupData ? groupData.items.filter(i => i.isCritical) : [];
        const gItems = groupData ? groupData.items.filter(i => !i.isCritical && i.current && Math.abs(i.current.varPct) < 0.10) : []; // "Within Expected" logic mock

        return {
            criticalGroups: cGroups,
            criticalItems: cItems,
            goodItems: gItems,
            allGroupsList: cGroups
        };
    }, [anomalies, selectedGroup]);

    // Ensure selectedGroup is synced with available critical groups on load
    React.useEffect(() => {
        if (!selectedGroup && criticalGroups.length > 0) {
            setSelectedGroup(criticalGroups[0]);
        }
    }, [criticalGroups, selectedGroup]);


    // 2. AI Simulation Handler
    const handleRunAI = () => {
        setAiLoading(true);
        setAiAnalysis(null);

        // Simulate API delay
        setTimeout(() => {
            setAiLoading(false);
            setAiAnalysis({
                critical: `A análise preliminar indica que o grupo "${selectedGroup}" estourou o orçamento principalmente devido a despesas não recorrentes em 'Materiais de Escritório' (+45%) e 'Serviços de Terceiros'. Recomenda-se revisar os contratos de fornecimento imediato.`,
                positive: `Por outro lado, as contas de 'Pessoal' e 'Logística' mantiveram-se estáveis, com uma eficiência de 98% em relação ao planejado. O controle rígido dessas contas compensou parcialmente o desvio.`
            });
        }, 2000);
    };

    if (!anomalies || anomalies.length === 0) return <div className="p-8 text-center text-gray-400">Nenhum dado de risco disponível.</div>;

    return (
        <div className="space-y-6">

            {/* HEADER: SEMAPHORE THEME */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="absolute left-0 top-0 h-full w-2 bg-red-500"></div>

                <div className="flex items-center gap-4 z-10">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                        <AlertOctagon className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Radar de Riscos Críticos</h2>
                        <p className="text-sm text-gray-500">Filtro automático: Apenas grupos com estouro &gt; 15%</p>
                    </div>
                </div>

                {/* CRITICAL GROUP FILTER */}
                <div className="flex items-center gap-2 z-10 w-full md:w-auto">
                    <span className="text-sm font-bold text-gray-600 whitespace-nowrap">Grupo em Risco:</span>
                    <select
                        value={selectedGroup}
                        onChange={(e) => { setSelectedGroup(e.target.value); setAiAnalysis(null); }}
                        className="bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
                    >
                        {criticalGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        {criticalGroups.length === 0 && <option>Nenhum grupo crítico</option>}
                    </select>
                </div>
            </div>

            {criticalGroups.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* LEFT COL: CRITICAL ACCOUNTS LIST */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                                <h3 className="font-bold text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Contas Críticas ({criticalItems.length})
                                </h3>
                                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">Ação Necessária</span>
                            </div>
                            <div className="p-0 overflow-y-auto max-h-[400px] flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Conta</th>
                                            <th className="px-4 py-2 text-right">Executado</th>
                                            <th className="px-4 py-2 text-right">Var %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {criticalItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-700">{item.conta}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtBRL(item.current.exec)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">
                                                    {fmtPct(item.current.varPct)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RIGHT COL: AI ANALYSIS SECTION */}
                        <div className="flex flex-col gap-4">

                            {/* TRIGGER BUTTON */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <BrainCircuit className="w-5 h-5" />
                                        Análise Inteligente
                                    </h3>
                                    <p className="text-indigo-100 text-sm">Identificar causas raiz e pontos positivos deste grupo.</p>
                                </div>
                                <button
                                    onClick={handleRunAI}
                                    disabled={aiLoading}
                                    className="bg-white text-indigo-600 font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                                >
                                    {aiLoading ? (
                                        <><span className="animate-spin">⌛</span> Analisando...</>
                                    ) : (
                                        <><Zap className="w-4 h-4" /> Executar IA</>
                                    )}
                                </button>
                            </div>

                            {/* AI RESULTS PANELS */}
                            {aiAnalysis && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                    {/* NEGATIVE / CRITICAL ANALYSIS */}
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                                        <h4 className="text-red-800 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Pontos de Atenção
                                        </h4>
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            {aiAnalysis.critical}
                                        </p>
                                    </div>

                                    {/* POSITIVE / CONGRATS ANALYSIS */}
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                                        <h4 className="text-green-800 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Dentro do Esperado
                                        </h4>
                                        <p className="text-gray-700 text-sm leading-relaxed mb-3">
                                            {aiAnalysis.positive}
                                        </p>

                                        {/* Mini list of good items */}
                                        {goodItems.length > 0 && (
                                            <div className="text-xs text-green-700 flex flex-wrap gap-2">
                                                {goodItems.slice(0, 3).map(i => (
                                                    <span key={i.conta} className="bg-green-100 px-2 py-1 rounded border border-green-200">
                                                        {i.conta}
                                                    </span>
                                                ))}
                                                {goodItems.length > 3 && <span>+{goodItems.length - 3} contas</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!aiAnalysis && !aiLoading && (
                                <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full">
                                    <BrainCircuit className="w-12 h-12 text-gray-300 mb-2" />
                                    <p className="text-gray-400 text-sm">Clique em "Executar IA" para gerar insights sobre este grupo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-12 text-center bg-green-50 rounded-xl border border-green-100">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-800">Tudo sob controle!</h3>
                    <p className="text-green-600">Nenhum grupo apresenta variância crítica (&gt;15%) neste mês.</p>
                </div>
            )}
        </div>
    );
}

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v);
