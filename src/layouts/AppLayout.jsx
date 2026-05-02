import React from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }) {
    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-foreground font-sans selection:bg-blue-500/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            <main className="relative z-10 pl-20 md:pl-64 min-h-screen transition-all duration-300">
                <div className="container mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
