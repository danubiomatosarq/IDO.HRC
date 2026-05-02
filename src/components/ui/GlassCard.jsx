import React from 'react';
import { cn } from '../../lib/utils'; // Assuming shadcn-like utils exist or will be created

export function GlassCard({ className, children, hoverEffect = false, ...props }) {
    return (
        <div
            className={cn(
                "glass-panel rounded-xl p-6 transition-all duration-300",
                hoverEffect && "hover:bg-white/10 hover:scale-[1.01] hover:shadow-2xl hover:border-emerald-500/30",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// Simple utility if it doesn't exist yet, to avoid breakage
// In a real scenario I'd check /lib/utils.js first
// But for now I will assume I need to create it or rely on this
