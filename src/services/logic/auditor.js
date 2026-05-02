export const AUDIT_THRESHOLDS = {
    CRITICO: 0.20,
    ATENCAO_MIN: 0.10,
    META_MAX: 0.10,
    META_MIN: -0.20,
    SUBUTILIZADO: -0.40
};

export const classifyAccount = (plan, exec) => {
    const diff = exec - plan;
    let varPct = 0;

    if (plan > 0) {
        varPct = diff / plan;
    } else if (exec > 0) {
        varPct = 1.0; // 100% burst if no budget
    }

    if (varPct > AUDIT_THRESHOLDS.CRITICO) {
        return { status: 'CRÍTICO', icon: '🚨', color: 'text-red-500', bg: 'bg-red-500/10' };
    }
    if (varPct >= AUDIT_THRESHOLDS.ATENCAO_MIN) {
        return { status: 'EM ATENÇÃO', icon: '⚠️', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    }
    if (varPct >= AUDIT_THRESHOLDS.META_MIN && varPct <= AUDIT_THRESHOLDS.META_MAX) {
        return { status: 'DENTRO DA META', icon: '👏', color: 'text-green-500', bg: 'bg-emerald-500/10' };
    }
    if (varPct < AUDIT_THRESHOLDS.SUBUTILIZADO) {
        return { status: 'SUBUTILIZADO', icon: '📉', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }

    return { status: 'NORMAL', icon: '⚪', color: 'text-gray-500', bg: 'bg-gray-500/10' };
};
