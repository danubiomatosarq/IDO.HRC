import React, { useState, useMemo } from 'react';
import { Bot, Save, Loader2, Sparkles, Target, Settings, Search, CheckCircle2, History, ArrowRight, Calendar, AlertTriangle, PieChart as PieIcon, BarChart3, Filter } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { FinancialService } from '../../../services/dataService';

export function PDSAManager({ data, monthRef }) {
    // --- FORM STATE ---
    const [selectedAccount, setSelectedAccount] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [deadline, setDeadline] = useState('');
    const [pdsa, setPdsa] = useState({ plan: '', do: '', study: '', act: '' });
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(false);

    // --- DASHBOARD STATE ---
    const [dashGroup, setDashGroup] = useState('TODOS');
    const [dashMonth, setDashMonth] = useState('2025-02');

    // --- MOCK DASHBOARD DATA ---
    const criticalAccounts = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(d => {
            // Find execution data for the selected month to determine variance
            let plan = 0, exec = 0, storedVarPct = 0;

            if (monthRef && monthRef !== "TODOS OS MESES") {
                const monthHistory = d.historico?.find(h => h.mes === monthRef);
                if (!monthHistory) return false; // Doesn't exist this month
                plan = Number(monthHistory.plan) || 0;
                exec = Number(monthHistory.exec) || 0;
                storedVarPct = Number(monthHistory.varPct) || 0;
            } else {
                plan = Number(d.plan) || 0;
                exec = Number(d.exec) || 0;
                storedVarPct = Number(d.varPct) || 0;
            }

            // Calculate varPct (treating as percentage e.g., 20.5)
            let varPct = 0;
            if (plan > 0) {
                varPct = ((exec - plan) / plan) * 100;
            } else if (storedVarPct) {
                // Determine if DB gave 0.20 or 20.0 (if very small fraction, multiply by 100)
                varPct = Math.abs(storedVarPct) < 2 ? storedVarPct * 100 : storedVarPct;
            }

            // Atribui o cálculo de volta ao objeto
            d.calcVarPct = varPct;

            // Critical threshold: Somente constas com estouro > 20% (worse than planned by 20%)
            return varPct > 20;
        }).sort((a, b) => Math.abs(b.calcVarPct) - Math.abs(a.calcVarPct));
    }, [data, monthRef]);

    const mockPDSAList = useMemo(() => [
        {
            id: 1, grupo: 'MANUTENCAO', conta: 'Manutenção Predial', prazo: '2025-02-10', status: 'ATRASADO', responsavel: 'Carlos Silva',
            plan: 'Renegociar contrato com fornecedor XPTO para reduzir 15%.',
            do: 'Reunião agendada para 15/02 com diretoria da XPTO.',
            study: 'Aguardando fechamento da fatura de Março.',
            act: 'Pendente validação.'
        },
        {
            id: 2, grupo: 'MANUTENCAO', conta: 'Equipamentos', prazo: '2025-02-20', status: 'EM DIA', responsavel: 'Carlos Silva',
            plan: 'Validar cronograma de preventiva das máquinas de AC.',
            do: 'Cronograma ajustado com equipe técnica.',
            study: 'Verificar índice de quebras em Fev/25.',
            act: 'Em andamento.'
        },
        {
            id: 3, grupo: 'LIMPEZA', conta: 'Material de Limpeza', prazo: '2025-02-15', status: 'EM DIA', responsavel: 'Ana Souza',
            plan: 'Cotar novos fornecedores de químicos concentrados.',
            do: '3 propostas recebidas. Em análise técnica.',
            study: 'Aguardando testes de amostras.',
            act: 'Definir vencedor até 20/02.'
        },
        {
            id: 4, grupo: 'TI', conta: 'Licenças de Software', prazo: '2025-02-05', status: 'CONCLUIDO', responsavel: 'Roberto TI',
            plan: 'Cancelar licenças inativas do Adobe CC.',
            do: 'Cancelamento efetuado no portal admin.',
            study: 'Fatura reduzida em R$ 2k/mês.',
            act: 'Monitorar novas admissões.'
        },
    ], []);

    // --- DASHBOARD LOGIC ---
    const dashboardData = useMemo(() => {
        let filtered = mockPDSAList;
        if (dashGroup !== 'TODOS') filtered = filtered.filter(i => i.grupo === dashGroup);
        // Date filtering could be added here if needed, keeping simple for now

        const total = filtered.length;
        const delayed = filtered.filter(i => i.status === 'ATRASADO').length;
        const onTime = filtered.filter(i => i.status === 'EM DIA').length;
        const inProgress = delayed + onTime;

        // Charts
        const statusData = [
            { name: 'Em Dia', value: onTime, color: '#22c55e' },
            { name: 'Atrasado', value: delayed, color: '#ef4444' },
            { name: 'Concluído', value: filtered.filter(i => i.status === 'CONCLUIDO').length, color: '#94a3b8' }
        ].filter(d => d.value > 0);

        const groupCounts = {};
        filtered.forEach(i => {
            groupCounts[i.grupo] = (groupCounts[i.grupo] || 0) + 1;
        });
        const groupData = Object.entries(groupCounts).map(([k, v]) => ({ name: k, value: v }));

        return { filtered, kpis: { total, delayed, onTime, inProgress }, charts: { status: statusData, groups: groupData } };
    }, [dashGroup, mockPDSAList]);


    // --- HANDLERS ---
    const handleAccountChange = async (e) => {
        const conta = e.target.value;
        setSelectedAccount(conta);
        setAnalysis('');
        setPdsa({ plan: '', do: '', study: '', act: '' });
        setDeadline('');

        if (!conta) return;

        setLoadingAnalysis(true);
        try {
            const result = await FinancialService.generateAnalysis({ conta, mes: '2025-02' });
            setAnalysis(result);
        } catch (error) {
            setAnalysis("Erro ao gerar análise.");
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!selectedAccount) return;
        setLoadingPlan(true);
        try {
            await new Promise(r => setTimeout(r, 2000));
            setPdsa({
                plan: "Negociar redução de 15% no contrato...",
                do: "Agendar reunião com fornecedor...",
                study: "Comparar custos do mês seguinte...",
                act: "Se validado, estender modelo..."
            });
            setDeadline('2025-02-28'); // Suggest a deadline
        } catch (error) {
            alert("Erro ao gerar sugestões.");
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAccount || !pdsa.plan || !deadline) return alert("Preencha a conta, o plano e o prazo!");
        alert("Ciclo PDSA Salvo com sucesso!");
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto pb-20">

            {/* SECTION 1: EDITOR */}
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-2 bg-blue-600"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Novo Ciclo PDSA</h2>
                            <p className="text-sm text-gray-500">Editor de Melhoria Contínua</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Salvar Ciclo
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT SIDEBAR */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Conta com Desvio</label>
                            <div className="relative mb-4">
                                <select
                                    value={selectedAccount}
                                    onChange={handleAccountChange}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 font-medium"
                                >
                                    <option value="">Selecione uma conta crítica...</option>
                                    {criticalAccounts.length === 0 && <option disabled>Nenhuma conta crítica em {monthRef}</option>}
                                    {criticalAccounts.map(acc => (
                                        <option key={acc.idConta} value={acc.conta}>
                                            {acc.conta} ({acc.calcVarPct > 0 ? '+' : ''}{acc.calcVarPct.toFixed(1)}% Var)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Prazo de Execução</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 font-medium"
                                />
                                <Calendar className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* AI Analysis View */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[400px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    Análise & Sugestão
                                </h3>
                                {selectedAccount && !loadingAnalysis && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">AI</span>}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed overflow-y-auto mb-4 border border-gray-100">
                                {loadingAnalysis ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                        <span>Analisando...</span>
                                    </div>
                                ) : analysis ? analysis : <div className="text-center text-gray-400 mt-10">Selecione uma conta.</div>}
                            </div>
                            <button
                                onClick={handleGeneratePlan}
                                disabled={!analysis || loadingPlan}
                                className={`w-full py-3 rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2
                                    ${!analysis ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95'}
                                `}
                            >
                                {loadingPlan ? <Loader2 className="animate-spin w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                {loadingPlan ? 'Criando...' : 'Gerar Plano com IA'}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT MAIN */}
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                            <PDSACard step="P" title="Planejar (Plan)" color="blue" icon={Target} value={pdsa.plan} onChange={(v) => setPdsa(prev => ({ ...prev, plan: v }))} placeholder="Objetivo, data, responsáveis..." />
                            <PDSACard step="D" title="Executar (Do)" color="amber" icon={Settings} value={pdsa.do} onChange={(v) => setPdsa(prev => ({ ...prev, do: v }))} placeholder="Descrição da execução..." />
                            <PDSACard step="S" title="Verificar (Study)" color="purple" icon={Search} value={pdsa.study} onChange={(v) => setPdsa(prev => ({ ...prev, study: v }))} placeholder="Resultados atingidos..." />
                            <PDSACard step="A" title="Agir (Act)" color="green" icon={CheckCircle2} value={pdsa.act} onChange={(v) => setPdsa(prev => ({ ...prev, act: v }))} placeholder="Padronização ou correção..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: DASHBOARD */}
            <div className="border-t border-gray-200 pt-8">

                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-gray-500" />
                        Dashboard de Planos de Ação
                    </h2>

                    {/* Dashboard Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <select value={dashGroup} onChange={(e) => setDashGroup(e.target.value)} className="bg-transparent border-none text-sm text-gray-700 font-medium focus:ring-0 cursor-pointer">
                                <option value="TODOS">Todos os Grupos</option>
                                <option value="MANUTENCAO">MANUTENCAO</option>
                                <option value="LIMPEZA">LIMPEZA</option>
                                <option value="TI">TI</option>
                                <option value="RH">RH</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <select value={dashMonth} onChange={(e) => setDashMonth(e.target.value)} className="bg-transparent border-none text-sm text-gray-700 font-medium focus:ring-0 cursor-pointer">
                                <option value="2025-02">Fev/2025</option>
                                <option value="2025-01">Jan/2025</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <DashboardKPI title="Em Andamento" value={dashboardData.kpis.inProgress} color="blue" icon={Target} />
                    <DashboardKPI title="Atrasados" value={dashboardData.kpis.delayed} color="red" icon={AlertTriangle} />
                    <DashboardKPI title="Em Dia" value={dashboardData.kpis.onTime} color="green" icon={CheckCircle2} />
                    <DashboardKPI title="Total de Planos" value={dashboardData.kpis.total} color="purple" icon={History} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-[300px] flex flex-col">
                        <h4 className="text-sm font-bold text-gray-600 uppercase mb-4">Ciclos por Grupo</h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dashboardData.charts.groups} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-[300px] flex flex-col">
                        <h4 className="text-sm font-bold text-gray-600 uppercase mb-4">Status dos Planos</h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dashboardData.charts.status}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dashboardData.charts.status.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Planos em Vigência</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Conta / Status</th>
                                <th className="px-4 py-3 w-[15%]">P (Plan)</th>
                                <th className="px-4 py-3 w-[15%]">D (Do)</th>
                                <th className="px-4 py-3 w-[15%]">S (Study)</th>
                                <th className="px-4 py-3 w-[15%]">A (Act)</th>
                                <th className="px-6 py-3 text-center">Prazo</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dashboardData.filtered.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-3 font-medium text-gray-800">
                                        <div className="flex flex-col">
                                            <span>{row.conta}</span>
                                            <span className={`text-[10px] uppercase font-bold mt-1 max-w-fit px-2 py-0.5 rounded-full
                                                ${row.status === 'ATRASADO' ? 'bg-red-100 text-red-700' :
                                                    row.status === 'EM DIA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                                            `}>
                                                {row.status}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-xs text-gray-500 italic border-l border-gray-100 align-top">
                                        <div className="line-clamp-3" title={row.plan}>{row.plan || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 italic border-l border-gray-100 align-top">
                                        <div className="line-clamp-3" title={row.do}>{row.do || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 italic border-l border-gray-100 align-top">
                                        <div className="line-clamp-3" title={row.study}>{row.study || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 italic border-l border-gray-100 align-top">
                                        <div className="line-clamp-3" title={row.act}>{row.act || '-'}</div>
                                    </td>

                                    <td className="px-6 py-3 text-center text-gray-600 text-xs font-medium align-top pt-4">
                                        {new Date(row.prazo).toLocaleDateString()}
                                    </td>

                                    <td className="px-6 py-3 text-center align-top pt-4">
                                        <button className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded transition-colors">
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {dashboardData.filtered.length === 0 && (
                        <div className="p-8 text-center text-gray-400">Nenhum plano encontrado para os filtros selecionados.</div>
                    )}
                </div>

            </div>
        </div>
    );
}

// --- Helper Components ---
function PDSACard({ step, title, color, icon: Icon, value, onChange, placeholder }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        green: 'bg-green-50 border-green-200 text-green-700',
    };
    const headerColors = { blue: 'text-blue-600', amber: 'text-amber-600', purple: 'text-purple-600', green: 'text-green-600' }

    return (
        <div className={`rounded-xl border shadow-sm p-5 flex flex-col h-[300px] bg-white transition-all hover:shadow-md ${colors[color].replace('bg-', 'border-')}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg ${colors[color]}`}>{step}</div>
                <h3 className={`font-bold text-gray-700 ${headerColors[color]}`}>{title}</h3>
                <Icon className={`w-4 h-4 ml-auto opacity-50 ${headerColors[color]}`} />
            </div>
            <textarea
                className="flex-1 w-full resize-none outline-none text-sm text-gray-600 leading-relaxed placeholder-gray-300 bg-transparent border-none focus:ring-0 p-0"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}

function DashboardKPI({ title, value, color, icon: Icon }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        red: 'text-red-600 bg-red-50',
        green: 'text-green-600 bg-green-50',
        purple: 'text-purple-600 bg-purple-50',
    };
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase">{title}</p>
                <p className={`text-3xl font-extrabold mt-1 ${colorClasses[color].split(' ')[0]}`}>{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    )
}
