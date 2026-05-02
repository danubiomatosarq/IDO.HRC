import React, { useState } from 'react';
import { Home, BarChart2, AlertTriangle, Lightbulb, Settings, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar({ className }) {
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { icon: Home, label: 'Painel Geral', active: true },
        { icon: BarChart2, label: 'Visão Tática' },
        { icon: AlertTriangle, label: 'Radar de Riscos' },
        { icon: Lightbulb, label: 'Insights & PDSA' },
    ];

    return (
        <div className={cn(
            "h-screen bg-background/50 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col fixed left-0 top-0 z-50",
            collapsed ? "w-20" : "w-64",
            className
        )}>

            {/* Header */}
            <div className="h-20 flex items-center justify-center border-b border-white/5 relative">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    {!collapsed && <span>IDO.HRC</span>}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-8 bg-background border border-white/10 rounded-full p-1 hover:bg-white/5 transition-colors"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Nav */}
            <div className="flex-1 py-6 px-3 space-y-2">
                {navItems.map((item, idx) => (
                    <button
                        key={idx}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                            item.active
                                ? "bg-gradient-to-r from-blue-500/20 to-emerald-500/20 text-white border border-white/5 shadow-lg shadow-blue-500/5"
                                : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <item.icon size={20} className={item.active ? "text-blue-400" : "group-hover:text-blue-300 transition-colors"} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </button>
                ))}
            </div>

            {/* Footer / Config */}
            <div className="p-4 border-t border-white/5">
                <button className={cn("w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-colors", collapsed && "justify-center")}>
                    <Settings size={20} />
                    {!collapsed && <span className="text-sm font-medium">Configurações</span>}
                </button>
            </div>

        </div>
    );
}
