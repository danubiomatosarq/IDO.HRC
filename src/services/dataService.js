import { v4 as uuidv4 } from 'uuid';
import { GASBackend } from './GASBackend';

// --- SERVICE EXPORT ---

export const FinancialService = {
    getDashboardData: async (monthRef) => {
        try {
            if (GASBackend.isAvailable) {
                // Remove o filtro do backend via parâmetro para resgatar todos os meses e gerar o histórico
                const rawData = await GASBackend.getDashboardData("");
                return transformApiData(rawData, monthRef);
            } else {
                console.warn("Using Local Mock Data (GAS unavailable)");
                await new Promise(r => setTimeout(r, 800));
                return transformApiData(RAW_DATA_MOCK, monthRef);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            return [];
        }
    },

    getAnomalies: async (monthRef) => {
        try {
            if (GASBackend.isAvailable) {
                return await GASBackend.getAnomalies(monthRef);
            }
            // Mock anomalies for local dev
            return RAW_ANOMALIES_MOCK.filter(a => !monthRef || a.mes === monthRef);
        } catch (error) {
            console.error("Error fetching anomalies:", error);
            return [];
        }
    },

    getAvailableMonths: async () => {
        try {
            if (GASBackend.isAvailable) {
                return await GASBackend.getAvailableMonths();
            }
            return ['2024-01', '2024-02', '2025-01']; // Mock
        } catch (error) {
            console.error("Error fetching months:", error);
            return [];
        }
    },

    // --- PDSA Methods ---

    getPDSAStructure: async () => {
        if (GASBackend.isAvailable) return await GASBackend.getPDSAStructure();
        return { grupos: GROUPS_MOCK, contas: CONTAS_MOCK };
    },

    getPDSARecord: async (grupo, conta, mesRef) => {
        if (GASBackend.isAvailable) return await GASBackend.getPDSARecord(grupo, conta, mesRef);
        return null;
    },

    getPDSAList: async (filtroGrupo, filtroMes) => {
        if (GASBackend.isAvailable) return await GASBackend.getPDSAList(filtroGrupo, filtroMes);
        // Fallback Mock for Dashboard
        return [];
    },

    savePDSA: async (form) => {
        if (GASBackend.isAvailable) return await GASBackend.savePDSA(form);
        console.log("[Mock] Saved PDSA:", form);
        return "Sucesso (Mock)";
    },

    generateAnalysis: async (contexto) => {
        if (GASBackend.isAvailable) return await GASBackend.generateAnalysis(contexto);
        return "Análise Mock: A conta apresenta desvio devido a sazonalidade...";
    },

    generateActions: async (dadosPlan) => {
        if (GASBackend.isAvailable) return await GASBackend.generateActions(dadosPlan);
        return { do: "Ação sugerida 1", study: "Estudar impacto", act: "Revisar meta" };
    }
};


// --- TRANSFORMERS ---

function transformApiData(apiData, monthRef) {
    if (!Array.isArray(apiData)) return [];

    const accountsMap = {};

    apiData.forEach(row => {
        const key = (row.idGrupo || row.grupo) + "||" + (row.idConta || row.conta);

        if (!accountsMap[key]) {
            accountsMap[key] = {
                id: row.id || uuidv4(),
                grupo: row.grupo || row.nomeGrupo,
                conta: row.conta || row.nomeConta,
                historico: []
            };
        }

        accountsMap[key].historico.push({
            mes: row.mes,
            plan: Number(row.plan) || 0,
            exec: Number(row.exec) || 0,
            varPct: Number(row.varPct) || 0
        });
    });

    return Object.values(accountsMap).map(item => {
        item.historico.sort((a, b) => (a.mes > b.mes ? 1 : -1));

        let plan = 0;
        let exec = 0;

        if (monthRef) {
            // Se tem mês específico, pega só ele (ou o último se não achar)
            const monthData = item.historico.find(h => h.mes === monthRef) || item.historico[item.historico.length - 1];
            plan = monthData ? monthData.plan : 0;
            exec = monthData ? monthData.exec : 0;
        } else {
            // ACUMULADO "Todos os Meses": soma o histórico inteiro
            item.historico.forEach(h => {
                plan += h.plan;
                exec += h.exec;
            });
        }

        const diff = exec - plan;

        let varPct = 0;
        if (plan > 0) varPct = diff / plan;
        else if (exec > 0) varPct = 1.0;

        // Classification Logic (Sync with Visio)
        let status = 'DENTRO DO ESPERADO';
        let statusColor = 'text-green-500';

        if (varPct > 0.20) { status = 'CRÍTICA'; statusColor = 'text-red-500'; }
        else if (varPct > 0.10) { status = 'EM ATENÇÃO'; statusColor = 'text-yellow-500'; }
        else if (varPct <= -0.40) { status = 'SUBEXECUTADO'; statusColor = 'text-blue-400'; }

        return {
            ...item,
            current: { plan, exec, diff, varPct },
            status,
            statusColor
        };
    });
}

// --- MOCK DATA (Fallback for Local Dev) ---
const GROUPS_MOCK = [
    { id: '1', nome: 'RECEITA OPERACIONAL' },
    { id: '2', nome: 'PESSOAL' },
    { id: '3', nome: 'MATERIAIS' }
];
const CONTAS_MOCK = {
    '1': ['RECEITA SUS', 'RECEITA PART.'],
    '2': ['SALÁRIOS', 'ENCARGOS'],
    '3': ['MEDICAMENTOS', 'DESCARTÁVEIS']
};
const RAW_ANOMALIES_MOCK = [
    { mes: '2025-02', grupo: 'PESSOAL', conta: 'SALÁRIOS', desvioPct: 0.25, status: 'CRÍTICO', resumoIA: 'Aumento não previsto em plantões.' }
];

const RAW_DATA_MOCK = [
    // Consolidated Mock Data for testing logic
    { id: '1', grupo: 'RECEITA OPERACIONAL', conta: 'RECEITA SUS', mes: '2025-01', plan: 1000, exec: 950 },
    { id: '1', grupo: 'RECEITA OPERACIONAL', conta: 'RECEITA SUS', mes: '2025-02', plan: 1000, exec: 1050 },
    { id: '2', grupo: 'PESSOAL', conta: 'SALÁRIOS', mes: '2025-02', plan: 500, exec: 600 },
];
