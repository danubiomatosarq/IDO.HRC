import React from 'react';
import { X, Info, FileText, BarChart3, AlertTriangle, Sparkles, UploadCloud, Target } from 'lucide-react';

export function InfoModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-brand-primary text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Info className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Guia do Usuário: Painel de Gestão Orçamentária</h2>
                            <p className="text-sm text-white/80">Entenda como utilizar o painel e interpretar as análises.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/20 transition-colors"
                        title="Fechar (Esc)"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50 text-gray-700">
                    
                    {/* Section 1: Fluxo de Dados */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                            <UploadCloud className="w-5 h-5 text-brand-primary" />
                            <h3 className="text-lg font-bold text-gray-800">Como os dados são extraídos?</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
                            <p className="border-l-4 border-amber-400 pl-3 italic text-gray-600">
                                Para que o dashboard apresente as informações corretamente, é necessário seguir o fluxo mensal de importação orçamentária.
                            </p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>O Líder Orçamentário deve acessar o sistema de orçamento e baixar o relatório <strong>"Acompanhamento de Plano de Trabalho - Consultar"</strong>.</li>
                                <li>Carregar o arquivo na pasta de rede do Drive correspondente, por exemplo: <strong>"OrcadoxMês"</strong>.</li>
                                <li><strong>Importante:</strong> Converter o arquivo importado para o formato do <strong>Google Planilhas</strong>.</li>
                                <li>Certificar-se de que não existem informações ausentes no planejamento ou na execução do orçamento, garantindo a integridade dos dados contábeis.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Section 2: Funcionalidades dos Módulos */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                            <Target className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-bold text-gray-800">O que você encontra neste Painel</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Modulo 1 */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-blue-200 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-2 text-blue-600 font-bold">
                                    <FileText className="w-5 h-5" /> Estratégico
                                </div>
                                <p className="text-sm leading-relaxed">
                                    Visão macro das finanças. Acompanhe a saúde financeira geral (KPIs), comparativo entre orçado x executado dos maiores grupos de contas, e a projeção com a evolução acumulada para o período.
                                </p>
                            </div>

                            {/* Modulo 2 */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                    <BarChart3 className="w-5 h-5" /> Variância - Grupo
                                </div>
                                <p className="text-sm leading-relaxed">
                                    Aprofundamento na variância de cada linha orçamentária. Visualize detalhadamente quais contas, gestores ou centros de custo consumiram mais (ou menos) em relação à verba planejada, de forma analítica.
                                </p>
                            </div>

                            {/* Modulo 3 */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-red-200 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-2 text-red-500 font-bold">
                                    <AlertTriangle className="w-5 h-5" /> Radar de Riscos
                                </div>
                                <p className="text-sm leading-relaxed">
                                    Identificação imediata das falhas orçamentárias. Foca estritamente nas contas com desvio (ex: &gt; 20%), listando "Atenção" e "Criticidade". Conta com uma árvore de ofensores para justificar o motivo do gasto elevado.
                                </p>
                            </div>

                            {/* Modulo 4 */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-purple-200 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-2 text-purple-600 font-bold">
                                    <Sparkles className="w-5 h-5" /> Insights & PDSA
                                </div>
                                <p className="text-sm leading-relaxed">
                                    O núcleo inteligente. Obtenha diagnósticos elaborados por Inteligência Artificial analisando tendências e os últimos 12 meses da conta anômala. Acesso rápido ao cadastro e controle de Planos de Ação (PDSA) para corrigir o rumo.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
                
                {/* Footer Modal */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-primary/90 transition-colors shadow-sm"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
