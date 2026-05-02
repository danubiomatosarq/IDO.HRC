import React, { useState, useMemo, useEffect } from 'react';
import { Bot, Save, Loader2, Sparkles, Target, Settings, Search, CheckCircle2, History, Calendar, AlertTriangle, BarChart3, Filter, Stethoscope, Brain, FlaskConical, ShieldCheck, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { FinancialService } from '../../../services/dataService';

export function PDSAManager({ data, monthRef }) {
    // --- FORM STATE ---
    const [formGroup, setFormGroup] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [managerNote, setManagerNote] = useState('');
    const [deadline, setDeadline] = useState('');
    const [pdsa, setPdsa] = useState({ plan: '', do: '', study: '', act: '' });
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(false);

    // --- EDIT MODAL STATE ---
    const [editingPlan, setEditingPlan] = useState(null);
    const [editFields, setEditFields] = useState({ plan: '', do: '', study: '', act: '', prazo: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: '' }

    // --- DASHBOARD STATE ---
    const [pdsaList, setPdsaList] = useState(null); // null = not yet loaded, [] = loaded
    const [dashGroup, setDashGroup] = useState('TODOS');
    const [dashMonth, setDashMonth] = useState('2025-02');

    // --- ACCORDION STATE ---
    const [isPdsaOpen, setIsPdsaOpen] = useState(false);
    const [isDashOpen, setIsDashOpen] = useState(false);
    const [isPlansOpen, setIsPlansOpen] = useState(false);

    // --- WORKFLOW DECISION STATE ---
    const [wantsPDSA, setWantsPDSA] = useState(null); // null | 'sim' | 'nao'

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // Carrega lista de planos ao montar o componente
    useEffect(() => {
        FinancialService.getPDSAList('TODOS', '')
            .then(lista => {
                console.log('[PDSA Dashboard] Lista recebida:', lista?.length, 'itens');
                setPdsaList(Array.isArray(lista) ? lista : []);
            })
            .catch(err => {
                console.error('[PDSA Dashboard] Erro:', err);
            });
    }, []);


    // --- MOCK DASHBOARD DATA ---

    const formAvailableGroups = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return [...new Set(data.map(d => d.grupo))].sort();
    }, [data]);

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

            // Critical threshold removed to show all accounts
            return true;
        }).sort((a, b) => Math.abs(b.calcVarPct) - Math.abs(a.calcVarPct));
    }, [data, monthRef]);

    const filteredCriticalAccounts = useMemo(() => {
        if (!formGroup) return [];
        return criticalAccounts.filter(a => a.grupo === formGroup);
    }, [criticalAccounts, formGroup]);

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
        let filtered = pdsaList !== null ? pdsaList : mockPDSAList;
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
    }, [dashGroup, mockPDSAList, pdsaList]);


    // --- HANDLERS ---
    const isCriticalAccount = useMemo(() => {
        if (!selectedAccount) return false;
        const contaObj = criticalAccounts.find(a => a.conta === selectedAccount);
        return contaObj ? contaObj.calcVarPct > 20 : false;
    }, [selectedAccount, criticalAccounts]);

    const handleAccountChange = (e) => {
        const conta = e.target.value;
        setSelectedAccount(conta);
        setAnalysis('');
        setManagerNote('');
        setPdsa({ plan: '', do: '', study: '', act: '' });
        setDeadline('');
        setWantsPDSA(null);
        if (conta) setIsPdsaOpen(true);
    };

    const handleSaveSuccessStrategy = async () => {
        if (!selectedAccount || !managerNote) return;
        setSaving(true);
        try {
            const contaObj = criticalAccounts.find(a => a.conta === selectedAccount);
            await FinancialService.savePDSA({
                mesRef: monthRef,
                grupo: contaObj?.grupo || '',
                conta: selectedAccount,
                respName: '',
                respSetor: '',
                aiSuggestion: '',
                planTarefas: managerNote,
                planResult: '',
                planMedidas: '',
                doDesc: '',
                studyDesc: '',
                actType: 'Justificativa de Gestão',
                actDetails: managerNote,
                prazo: new Date().toISOString().split('T')[0],
                estrategiaGestor: managerNote
            });
            showToast('success', 'Estratégia registrada com sucesso!');
            try {
                const lista = await FinancialService.getPDSAList('TODOS', '');
                if (lista && Array.isArray(lista)) setPdsaList(lista);
            } catch (_) { }
            setSelectedAccount('');
            setManagerNote('');
            setWantsPDSA(null);
            setIsPdsaOpen(false);
        } catch (err) {
            showToast('error', 'Erro ao salvar: ' + (err?.message || err));
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!selectedAccount || !managerNote) return;
        setLoadingPlan(true);
        try {
            // Chama a API passando a 'Receita Médica' gerada para construção do ciclo
            const result = await FinancialService.generateActions({
                // A IA usa o texto do GESTOR como base para o PDSA (não mais a análise bruta)
                analise: managerNote
            });

            if (result && result.plan) {
                setPdsa({
                    plan: result.plan || "",
                    do: result.do || "",
                    study: result.study || "",
                    act: result.act || ""
                });

                // Adiciona o Foco do Tratamento e a Dica na caixa de análise
                const appendExtraInfo = `\n\n=== ESTRATÉGIA PDSA SUGERIDA ===\n\n${result.resumo ? result.resumo + '\n\n' : ''}${result.dica ? result.dica : ''}`;
                setAnalysis(prev => (prev || '') + appendExtraInfo);

                // Sugere um prazo de 15 dias pra frente
                const dt = new Date();
                dt.setDate(dt.getDate() + 15);
                setDeadline(dt.toISOString().split('T')[0]);
            } else {
                throw new Error("A IA não retornou parâmetros válidos.");
            }
        } catch (error) {
            showToast('error', 'Erro clínico ao gerar plano PDSA: ' + error.message);
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAccount || !pdsa.plan || !deadline) {
            showToast('error', 'Preencha a conta, o plano e o prazo antes de salvar.');
            return;
        }
        setSaving(true);
        try {
            const contaObj = criticalAccounts.find(a => a.conta === selectedAccount);
            await FinancialService.savePDSA({
                mesRef: monthRef,
                grupo: contaObj?.grupo || '',
                conta: selectedAccount,
                respName: '',
                respSetor: '',
                aiSuggestion: analysis,
                planTarefas: pdsa.plan,
                planResult: '',
                planMedidas: '',
                doDesc: pdsa.do,
                studyDesc: pdsa.study,
                actType: '',
                actDetails: pdsa.act,
                prazo: deadline
            });
            showToast('success', '💉 Vacina aplicada! Ciclo PDSA registrado com sucesso na planilha.');
            // Refresh dashboard list
            try {
                const lista = await FinancialService.getPDSAList('TODOS', '');
                if (lista && Array.isArray(lista)) setPdsaList(lista);
            } catch (_) { }
            // Reset form
            setSelectedAccount('');
            setAnalysis('');
            setManagerNote('');
            setDeadline('');
            setPdsa({ plan: '', do: '', study: '', act: '' });
        } catch (err) {
            showToast('error', 'Erro ao salvar: ' + (err?.message || err));
        } finally {
            setSaving(false);
        }
    };

    // --- EDIT HANDLERS ---
    const handleEditOpen = (row) => {
        setEditingPlan(row);
        setEditFields({ plan: '', do: '', study: '', act: '', prazo: row.prazo || '' });
    };

    const handleEditSave = async () => {
        if (!editingPlan) return;
        setEditSaving(true);
        try {
            const stamp = `\n\n--- Atualização ${new Date().toLocaleDateString('pt-BR')} ---\n`;
            // Acumula: preserva o histórico e adiciona o novo conteúdo abaixo
            const merged = {
                id: editingPlan.id,
                mesRef: editingPlan.mesRef,
                grupo: editingPlan.grupo,
                conta: editingPlan.conta,
                respName: editingPlan.responsavel || '',
                respSetor: editingPlan.setor || '',
                aiSuggestion: editingPlan.aiSuggestion || '',
                planTarefas: editFields.plan ? (editingPlan.plan || '') + stamp + editFields.plan : (editingPlan.plan || ''),
                planResult: '',
                planMedidas: '',
                doDesc: editFields.do ? (editingPlan.do || '') + stamp + editFields.do : (editingPlan.do || ''),
                studyDesc: editFields.study ? (editingPlan.study || '') + stamp + editFields.study : (editingPlan.study || ''),
                actType: editingPlan.actType || '',
                actDetails: editFields.act ? (editingPlan.act || '') + stamp + editFields.act : (editingPlan.act || ''),
                prazo: editFields.prazo || editingPlan.prazo || ''
            };
            await FinancialService.savePDSA(merged);
            setEditingPlan(null);
            showToast('success', '✅ Plano evoluído! O histórico foi preservado e a nova atualização registrada.');
        } catch (err) {
            showToast('error', 'Erro ao salvar: ' + (err?.message || err));
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <>

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm transition-all animate-fade-in border`,
                    toast.type === 'success'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400/30 text-white'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400/30 text-white'
                }>
                    <span className="text-2xl mt-0.5 shrink-0">{toast.type === 'success' ? '✅' : '❌'}</span>
                    <div>
                        <p className="font-bold text-sm">{toast.type === 'success' ? 'Operação realizada!' : 'Atenção'}</p>
                        <p className="text-sm text-white/90 mt-0.5 leading-relaxed">{toast.msg}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-auto text-white/60 hover:text-white text-xl leading-none font-bold shrink-0">✕</button>
                </div>
            )}

            {/* SECTION 1: EDITOR */}
            <div className="space-y-6">
                {/* Header com tema IA + Consultório */}
                <div className="relative rounded-xl overflow-hidden shadow-md border border-indigo-200">
                    {/* Fundo animado com gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900" />
                    {/* Partículas decorativas de IA */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="absolute rounded-full bg-white/5"
                                style={{ width: `${20 + i * 15}px`, height: `${20 + i * 15}px`, top: `${10 + i * 9}%`, left: `${5 + i * 12}%`, animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                    <div className="relative z-10 p-5 flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            {/* Ícone pulsante de IA */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-30" />
                                <div className="relative bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-full shadow-lg">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    🏥 Consultório de Análise Orçamentária
                                    <span className="text-[10px] bg-white/20 text-white/80 px-2 py-0.5 rounded-full font-semibold border border-white/20">IA · Anamnese Financeira</span>
                                </h2>
                                <p className="text-sm text-indigo-200 mt-0.5">Powered by Groq · Llama 3.3 70B · Ciclo PDSA Assistido por IA</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 1: Seletor de Grupo e Conta */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Filtro de Grupo */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Filter className="w-3 h-3" /> 1. Escolha o Grupo</label>
                            <select
                                value={formGroup}
                                onChange={(e) => {
                                    setFormGroup(e.target.value);
                                    setSelectedAccount('');
                                    setAnalysis('');
                                    setManagerNote('');
                                    setPdsa({ plan: '', do: '', study: '', act: '' });
                                    setDeadline('');
                                    setWantsPDSA(null);
                                }}
                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 font-medium"
                            >
                                <option value="">Selecione um grupo orçamentário...</option>
                                {formAvailableGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Conta */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">🫐 2. Selecione a Conta</label>
                            {!formGroup ? (
                                <div className="p-3 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg italic">
                                    Selecione um grupo primeiro.
                                </div>
                            ) : filteredCriticalAccounts.length === 0 ? (
                                <div className="p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="w-4 h-4" /> Nenhuma conta encontrada para este grupo neste período.
                                </div>
                            ) : (
                                <select
                                    value={selectedAccount}
                                    onChange={handleAccountChange}
                                    className="w-full bg-purple-50 border border-purple-200 text-purple-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 font-bold shadow-sm"
                                >
                                    <option value="">Selecione uma conta para análise...</option>
                                    {filteredCriticalAccounts.map(acc => {
                                        let icon = '🟢'; // Esperado
                                        if (acc.calcVarPct > 20) icon = '🔴'; // Crítico
                                        else if (acc.calcVarPct > 10) icon = '🟡'; // Atenção
                                        
                                        return (
                                            <option key={acc.idConta} value={acc.conta}>
                                                {icon} {acc.conta} ({acc.calcVarPct > 0 ? '+' : ''}{acc.calcVarPct.toFixed(1)}% Var)
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* ACCORDION ÚNICO: ANAMNESE E PDSA */}
                <div className="border border-indigo-100 rounded-xl bg-white shadow-sm overflow-hidden">
                    <button 
                        onClick={() => setIsPdsaOpen(!isPdsaOpen)}
                        className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            <span className="font-bold text-indigo-800 text-lg">Anamnese Financeira & Construção do PDSA</span>
                        </div>
                        {isPdsaOpen ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-indigo-500" />}
                    </button>
                    
                    {isPdsaOpen && (
                        <div className="p-5 border-t border-indigo-100 space-y-6">
                            {/* ROW 2: Caixa de Análise IA — ANAMNESE */}
                            <div className="relative rounded-xl overflow-hidden shadow-sm border border-purple-200">
                                {/* Header da caixa de anamnese */}
                                <div className="bg-gradient-to-r from-purple-900 to-indigo-800 px-5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-40" />
                                            <Stethoscope className="relative w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                                🧬 Anamnese Financeira da Conta
                                            </h3>
                                            <p className="text-purple-300 text-[10px]">Diagnóstico gerado pelo Assistente Estratégico de Controladoria</p>
                                        </div>
                                    </div>
                                </div>

                    {/* Footer: caixa do gestor + botão */}
                    <div className="bg-white px-5 pt-4 pb-5 border-t border-purple-100 space-y-3">

                        {/* Caixa de estratégia do Gestor — agora aparece ao selecionar conta, sem depender de IA */}
                        {selectedAccount && (
                            <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                                <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span className="text-base">📝</span> Suas Estratégias para o Ciclo
                                </label>
                                <p className="text-[11px] text-indigo-400 mb-2 leading-relaxed">
                                    Descreva a estratégia que deseja adotar para esta conta. A IA usará <strong>este texto</strong> para elaborar a Receita Médica caso opte por um ciclo de melhoria.
                                </p>
                                <textarea
                                    value={managerNote}
                                    onChange={e => setManagerNote(e.target.value)}
                                    placeholder="Ex: Acredito que o aumento foi causado por compras emergenciais no fim do mês. Quero testar um processo de aprovação prévia para fretes acima de R$500 durante 15 dias na ala de Suprimentos..."
                                    rows={4}
                                    className="w-full text-sm text-gray-700 bg-white border border-indigo-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-indigo-200 leading-relaxed"
                                />
                            </div>
                        )}

                        {/* Pergunta: Deseja encaminhar para proposta de ciclo de melhoria? — APENAS PARA CONTAS CRÍTICAS */}
                        {selectedAccount && isCriticalAccount && managerNote && (
                            <div className="rounded-xl border-2 border-gray-200 bg-gray-50/80 p-4">
                                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-base">🔄</span>
                                    Deseja encaminhar sua estratégia para proposta de ciclo de melhoria (PDSA)?
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setWantsPDSA('sim')}
                                        className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 border-2 ${
                                            wantsPDSA === 'sim'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Sim, quero propor melhoria
                                    </button>
                                    <button
                                        onClick={() => setWantsPDSA('nao')}
                                        className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 border-2 ${
                                            wantsPDSA === 'nao'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400'
                                        }`}
                                    >
                                        <Trophy className="w-4 h-4" /> Não, apenas registrar estratégia
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fluxo SIM: Mostra botão Sugerir Receita Médica (para contas críticas) */}
                        {isCriticalAccount && wantsPDSA === 'sim' && (
                            <button
                                onClick={handleGeneratePlan}
                                disabled={!managerNote || loadingPlan}
                                className={`w-full py-1.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2
                                    ${!managerNote || loadingPlan
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                                        : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 active:scale-[0.98] shadow-indigo-300 shadow-lg'}
                                `}
                            >
                                {loadingPlan
                                    ? <><Loader2 className="animate-spin w-4 h-4" /> Preparando Prescrição Clínica...</>
                                    : <><FlaskConical className="w-4 h-4" /> 💊 Sugerir Receita Médica para a Conta Crítica</>}
                            </button>
                        )}

                        {/* Para CONTAS NÃO CRÍTICAS ou fluxo NÃO: Mostra botão Registrar Estratégia de Eficiência directly if not critical or if chose NO */}
                        {((!isCriticalAccount && selectedAccount && managerNote) || (isCriticalAccount && wantsPDSA === 'nao')) && (
                            <button
                                onClick={handleSaveSuccessStrategy}
                                disabled={!managerNote || saving}
                                className={`w-full py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2
                                    ${!managerNote || saving 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' 
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] shadow-emerald-200 border-b-4 border-emerald-800'
                                    }`}
                            >
                                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                                {saving ? 'Registrando...' : 'Registrar Estratégia de Eficiência'}
                            </button>
                        )}
                    </div>
                            </div>

                            {/* ROW 3: Cards PDSA com fases clínicas — só aparece se o gestor escolheu SIM */}
                            {wantsPDSA === 'sim' && (
                            <div className="pt-4 border-t border-indigo-100">
                                <h3 className="font-bold text-indigo-800 text-lg mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                    Construção do PDSA Assistido por IA
                                </h3>
                            {/* Badge Gemini AI */}
                            {(pdsa.plan || pdsa.do || pdsa.study || pdsa.act) && (
                                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-30 scale-75" />
                                        <Brain className="relative w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-700">✨ Plano de Reabilitação Financeira gerado por Groq Llama 3.3 70B</span>
                                    <span className="ml-auto text-[10px] text-indigo-400 italic">· Protocolo PDSA Assistido por IA</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PDSACard step="P" title="Planejar (Plan)" clinicPhase="🩺 Diagnóstico & Intervenção" color="blue" icon={Stethoscope} value={pdsa.plan} onChange={(v) => setPdsa(prev => ({ ...prev, plan: v }))} placeholder="Objetivo, data, responsáveis..." />
                                <PDSACard step="D" title="Executar (Do)" clinicPhase="💉 Aplicação do Tratamento" color="amber" icon={FlaskConical} value={pdsa.do} onChange={(v) => setPdsa(prev => ({ ...prev, do: v }))} placeholder="Descrição da execução..." />
                                <PDSACard step="S" title="Verificar (Study)" clinicPhase="📟 Monitoramento dos Sinais Vitais" color="purple" icon={Brain} value={pdsa.study} onChange={(v) => setPdsa(prev => ({ ...prev, study: v }))} placeholder="Resultados atingidos..." />
                                <PDSACard step="A" title="Agir (Act)" clinicPhase="🏥 Alta ou Ajuste de Protocolo" color="green" icon={ShieldCheck} value={pdsa.act} onChange={(v) => setPdsa(prev => ({ ...prev, act: v }))} placeholder="Padronização ou correção..." />
                            </div>

                            {/* Disclaimer de reavaliação */}
                            {(pdsa.plan || pdsa.do || pdsa.study || pdsa.act) && (
                                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-700 mb-0.5">⚠️ Revisão Clínica Necessária</p>
                                        <p className="text-xs text-amber-600 leading-relaxed">
                                            As sugestões acima foram elaboradas pela IA com base nos dados financeiros disponíveis e no contexto hospitalar, mas <strong>podem não refletir com precisão a realidade operacional da sua instituição</strong>. Recomenda-se que o gestor responsável revise, adapte e valide cada etapa do ciclo antes de implementar — assim como um médico confirma o diagnóstico antes de prescrever o tratamento. 🩺
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* PRAZO + BOTÃO APLICAR */}
                            {(pdsa.plan || pdsa.do || pdsa.study || pdsa.act) && (
                                <div className="mt-5 rounded-xl border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                        <p className="text-xs font-bold text-indigo-700">📅 Defina o prazo e aplique o protocolo de tratamento</p>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Prazo de Execução do Ciclo
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={deadline}
                                                    onChange={(e) => setDeadline(e.target.value)}
                                                    className="w-full bg-white border-2 border-indigo-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 block p-3 font-medium"
                                                />
                                                <Calendar className="absolute right-3 top-3.5 w-4 h-4 text-indigo-300 pointer-events-none" />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={!deadline || saving}
                                            className={`flex-none flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${!deadline ? "bg-gray-100 text-gray-400 cursor-not-allowed" : saving ? "bg-emerald-400 text-white cursor-wait" : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] shadow-green-200 shadow-lg"}`}
                                        >
                                            <Save className="w-4 h-4" />
                                            {saving ? <><Loader2 className="animate-spin w-4 h-4" /> Aplicando Protocolo...</> : <>💉 Aplicar a Vacina Contra Alta Variância</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 2: DASHBOARD */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 mt-8 mb-8 overflow-hidden shadow-sm">
                <button 
                    onClick={() => setIsDashOpen(!isDashOpen)}
                    className="w-full flex flex-col md:flex-row items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors text-left border-b border-gray-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Dashboard de Planos de Ação</h2>
                    </div>

                    <div className="flex items-center gap-4 mt-3 md:mt-0">
                        {/* Only show filters if dashboard is open, or keep them inside the open state. Let's keep filters right here so they are visible, but stop event propagation if clicked */}
                    </div>
                    {isDashOpen ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                </button>

                {isDashOpen && (
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-end mb-6 gap-3">
                            {/* Dashboard Filters */}
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

                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <DashboardKPI title="Em Andamento" value={dashboardData.kpis.inProgress} color="blue" icon={Target} />
                            <DashboardKPI title="Atrasados" value={dashboardData.kpis.delayed} color="red" icon={AlertTriangle} />
                            <DashboardKPI title="Em Dia" value={dashboardData.kpis.onTime} color="green" icon={CheckCircle2} />
                            <DashboardKPI title="Total de Planos" value={dashboardData.kpis.total} color="purple" icon={History} />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    </div>
                )}
            </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <button 
                        onClick={() => setIsPlansOpen(!isPlansOpen)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors text-left"
                    >
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Planos em Vigência</h3>
                        {isPlansOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    
                    {isPlansOpen && (
                        <div className="overflow-x-auto">
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
                                                <button
                                                    onClick={() => handleEditOpen(row)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                                                >
                                                    ✏️ Evoluir Ciclo
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
                    )}
                </div>

            {/* MODAL DE EVOLUCAO DO CICLO */}
            {editingPlan && (
                <EditPlanModal
                    plan={editingPlan}
                    fields={editFields}
                    setFields={setEditFields}
                    onSave={handleEditSave}
                    onClose={() => setEditingPlan(null)}
                    saving={editSaving}
                />
            )}
        </>
    );
}


// --- Markdown Renderer minimal (sem dependências externas) ---
function MarkdownText({ text }) {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let listBuffer = [];

    const flushList = () => {
        if (listBuffer.length > 0) {
            elements.push(
                <ul key={elements.length} className="list-none space-y-1 mb-3">
                    {listBuffer.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-purple-400 mt-0.5 shrink-0">▸</span>
                            <span dangerouslySetInnerHTML={{ __html: item }} />
                        </li>
                    ))}
                </ul>
            );
            listBuffer = [];
        }
    };

    const styleLine = (txt) =>
        txt
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-800">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-purple-50 text-purple-700 px-1 rounded text-xs">$1</code>');

    lines.forEach((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) { flushList(); elements.push(<div key={idx} className="h-2" />); return; }

        // H3 / H4 headings (### ou ####)
        if (/^#{1,4}\s/.test(line)) {
            flushList();
            const txt = line.replace(/^#+\s/, '');
            const isSection = line.startsWith('###');
            elements.push(
                <div key={idx} className={`flex items-center gap-2 mt-4 mb-2 ${isSection ? '' : 'mt-2'}`}>
                    <div className={`h-px flex-1 ${isSection ? 'bg-purple-200' : 'bg-gray-100'}`} />
                    <span className={`font-bold ${isSection ? 'text-purple-700 text-sm' : 'text-gray-500 text-xs'}`}
                        dangerouslySetInnerHTML={{ __html: styleLine(txt) }} />
                    <div className={`h-px flex-1 ${isSection ? 'bg-purple-200' : 'bg-gray-100'}`} />
                </div>
            );
            return;
        }

        // Numbered list (1. 2. etc)
        if (/^\d+\.\s/.test(line)) {
            listBuffer.push(styleLine(line.replace(/^\d+\.\s/, '')));
            return;
        }

        // Bullet list (- ou *)
        if (/^[-*]\s/.test(line)) {
            listBuffer.push(styleLine(line.replace(/^[-*]\s/, '')));
            return;
        }

        // Normal paragraph
        flushList();
        elements.push(
            <p key={idx} className="text-sm text-gray-600 leading-relaxed mb-1"
                dangerouslySetInnerHTML={{ __html: styleLine(line) }} />
        );
    });

    flushList();
    return <div className="space-y-0.5">{elements}</div>;
}

// --- Helper Components ---
function PDSACard({ step, title, clinicPhase, color, icon: Icon, value, onChange, placeholder }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        green: 'bg-green-50 border-green-200 text-green-700',
    };
    const headerColors = { blue: 'text-blue-600', amber: 'text-amber-600', purple: 'text-purple-600', green: 'text-green-600' };
    const borderColors = { blue: 'border-blue-300', amber: 'border-amber-300', purple: 'border-purple-300', green: 'border-green-300' };

    return (
        <div className={`rounded-xl border-2 shadow-sm flex flex-col h-[310px] bg-white transition-all hover:shadow-md ${borderColors[color]}`}>
            {/* Header clínico */}
            <div className={`px-4 py-3 rounded-t-xl ${colors[color].replace('text-', 'bg-').split(' ')[0]} border-b ${borderColors[color].replace('border-', 'border-')}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-base ${colors[color]}`}>{step}</div>
                    <div className="flex-1">
                        <div className={`font-bold text-sm ${headerColors[color]}`}>{title}</div>
                        {clinicPhase && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{clinicPhase}</div>}
                    </div>
                    <Icon className={`w-4 h-4 opacity-40 ${headerColors[color]}`} />
                </div>
            </div>
            <textarea
                className="flex-1 w-full resize-none outline-none text-sm text-gray-600 leading-relaxed placeholder-gray-300 bg-transparent border-none focus:ring-0 p-4"
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

// --- Componente Modal de Evolução do Ciclo PDSA ---
function EditPlanModal({ plan, fields, setFields, onSave, onClose, saving }) {

    const setField = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

    const steps = [
        { key: 'plan', label: 'P – Planejar (Plan)', phase: '🩺 Diagnóstico & Intervenção', hist: plan.plan, color: 'blue' },
        { key: 'do', label: 'D – Executar (Do)', phase: '💉 Aplicação do Tratamento', hist: plan.do, color: 'amber' },
        { key: 'study', label: 'S – Verificar (Study)', phase: '📟 Monitoramento dos Sinais Vitais', hist: plan.study, color: 'purple' },
        { key: 'act', label: 'A – Agir (Act)', phase: '🏥 Alta ou Ajuste de Protocolo', hist: plan.act, color: 'green' },
    ];

    const borderMap = { blue: 'border-blue-200', amber: 'border-amber-200', purple: 'border-purple-200', green: 'border-green-200' };
    const headerMap = { blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', purple: 'bg-purple-50 text-purple-700', green: 'bg-green-50 text-green-700' };
    const ringMap = { blue: 'focus:ring-blue-400', amber: 'focus:ring-amber-400', purple: 'focus:ring-purple-400', green: 'focus:ring-green-400' };

    const hasNewContent = Object.entries(fields).some(([k, v]) => k !== 'prazo' && v.trim());

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col">

                {/* Header do modal */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-t-2xl p-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-black text-lg flex items-center gap-2">
                            🔄 Evoluir Ciclo PDSA
                            <span className="text-[10px] bg-white/20 text-white/80 px-2 py-0.5 rounded-full font-semibold border border-white/20">Histórico Preservado</span>
                        </h2>
                        <p className="text-indigo-300 text-xs mt-0.5">
                            📋 <strong className="text-white">{plan.conta}</strong> · Ciclo iniciado em {plan.prazo ? new Date(plan.prazo).toLocaleDateString('pt-BR') : '–'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none font-bold">✕</button>
                </div>

                {/* Aviso de boas práticas */}
                <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                    <span className="text-amber-500 text-sm shrink-0">⚠️</span>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        <strong>Boas Práticas PDSA:</strong> O histórico abaixo é <strong>somente leitura e não pode ser apagado</strong>. Use os campos de atualização para registrar novos aprendizados, mudanças de estratégia ou resultados. A data de hoje será marcada automaticamente em cada campo atualizado.
                    </p>
                </div>

                {/* Corpo: etapas */}
                <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                    {steps.map(({ key, label, phase, hist, color }) => (
                        <div key={key} className={`rounded-xl border-2 ${borderMap[color]}`}>
                            {/* Label da etapa */}
                            <div className={`px-4 py-2 rounded-t-xl ${headerMap[color]} flex items-center justify-between`}>
                                <span className="font-bold text-sm">{label}</span>
                                <span className="text-[10px] opacity-70">{phase}</span>
                            </div>

                            {/* Histórico read-only */}
                            {hist && (
                                <div className="px-4 pt-3 pb-0">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        🔒 Histórico registrado <span className="font-normal normal-case">(somente leitura)</span>
                                    </label>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto mb-2 italic">
                                        {hist}
                                    </div>
                                </div>
                            )}

                            {/* Nova atualização */}
                            <div className="px-4 pb-3 pt-2">
                                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    ✏️ Nova atualização <span className="font-normal text-gray-400 normal-case">(deixe em branco para manter)</span>
                                </label>
                                <textarea
                                    value={fields[key]}
                                    onChange={e => setField(key, e.target.value)}
                                    placeholder={hist
                                        ? `Adicione novos aprendizados ou mudança de estratégia para esta etapa...`
                                        : `Registre o que foi planejado/executado nesta etapa...`}
                                    rows={3}
                                    className={`w-full text-sm text-gray-700 bg-white border border-indigo-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 ${ringMap[color]} placeholder-gray-300 leading-relaxed`}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Prazo revisado */}
                    <div className="rounded-xl border-2 border-gray-200 p-4">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            📅 Prazo de Conclusão (revisado)
                        </label>
                        <input
                            type="date"
                            value={fields.prazo}
                            onChange={e => setField('prazo', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 font-semibold text-sm px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!hasNewContent || saving}
                        className={`flex items-center gap-2 font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-md
                            ${!hasNewContent || saving
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] shadow-indigo-200'
                            }`}
                    >
                        {saving ? <><Loader2 className="animate-spin w-4 h-4" /> Salvando...</> : <>💾 Salvar Evolução do Ciclo</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

