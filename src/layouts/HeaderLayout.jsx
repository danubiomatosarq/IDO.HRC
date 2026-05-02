import React from 'react';
import { cn } from '../lib/utils';
import { LayoutDashboard, BarChart3, AlertTriangle, Sparkles, FileText } from 'lucide-react';

export function HeaderLayout({ children, activeTab, onTabChange, monthRef, onMonthChange, availableMonths = [] }) {

    const navItems = [
        { id: 'strategic', label: 'Estratégico', icon: LayoutDashboard },
        { id: 'variance', label: 'Variância - Grupo', icon: BarChart3 },
        { id: 'risk', label: 'Radar de Riscos', icon: AlertTriangle },
        { id: 'pdsa', label: 'Insights & PDSA', icon: Sparkles },
    ];

    return (
        <div className="min-h-screen bg-[#f0f4f7] font-sans">

            {/* 1. Official Header (Logos & Brand) */}
            <header className="print:hidden bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-center shadow-sm sticky top-0 z-50">
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">IDO<span className="text-brand-primary">.HRC</span></h1>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Painel de Gestão Orçamentária</span>
                </div>
            </header>

            {/* 2. Teal Navigation Bar */}
            <div className="print:hidden bg-brand-primary shadow-md sticky top-[73px] z-40">
                <div className="w-[98%] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">

                        {/* Nav Tabs - Centralized */}
                        <nav className="flex flex-1 justify-center space-x-6 overflow-x-auto no-scrollbar">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={cn(
                                            "flex items-center px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                                            isActive
                                                ? "bg-white text-brand-primary shadow-md scale-105"
                                                : "text-white/80 hover:bg-white/15 hover:text-white hover:scale-105"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Configs / Month Selector aligned right in the sub-header */}
                        <div className="flex items-center gap-2 ml-4 absolute right-4 sm:right-6 lg:right-8">
                            <label className="text-white/80 text-xs font-semibold uppercase hidden sm:block">Período:</label>
                            <select
                                value={monthRef}
                                onChange={onMonthChange}
                                className="bg-brand-secondary text-white text-sm rounded border border-white/20 p-1.5 focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer"
                            >
                                <option value="">TODOS OS MESES</option>
                                {availableMonths.length > 0 ? (
                                    availableMonths.map(m => (
                                        <option key={m} value={m}>
                                            {new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>Carregando...</option>
                                )}
                            </select>
                        </div>

                    </div>
                </div>
            </div>

            {/* 3. Main Content Area */}
            <main className="w-[98%] max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </main>

        </div>
    );
}
