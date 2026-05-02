export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatPercent = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value);
};

export const getVarianceStatus = (plan, exec) => {
    const diff = exec - plan;
    let varPct = 0;
    if (plan > 0) varPct = diff / plan;
    else if (exec > 0) varPct = 1.0;

    if (varPct > 0.20) return { label: 'CRÍTICO', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    if (varPct >= 0.10) return { label: 'EM ATENÇÃO', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    if (varPct >= -0.20) return { label: 'NA META', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if (varPct < -0.40) return { label: 'SUBUTILIZADO', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };

    return { label: 'NORMAL', color: 'bg-gray-500/10 text-gray-500' };
};
