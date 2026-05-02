/**
 * GASBackend.js
 * A modern wrapper for google.script.run to support Promises (async/await)
 * and provide mock data when running locally (outside GAS).
 */

const isGAS = typeof google !== 'undefined' && google.script && google.script.run;

// Helper to wrap google.script.run in a Promise
const runGAS = (functionName, ...args) => {
    return new Promise((resolve, reject) => {
        if (!isGAS) {
            console.warn(`[GAS Mock] Calling ${functionName} with args:`, args);
            // Simulate network delay
            setTimeout(() => {
                // Return mock responses locally if needed, or just reject/log
                reject("GAS not available (Local Env)");
            }, 1000);
            return;
        }

        google.script.run
            .withSuccessHandler((response) => {
                // Parse JSON if the backend returns a stringified JSON (common pattern)
                try {
                    const data = typeof response === 'string' ? JSON.parse(response) : response;
                    resolve(data);
                } catch (e) {
                    resolve(response);
                }
            })
            .withFailureHandler((error) => {
                console.error(`[GAS Error] ${functionName}:`, error);
                reject(error);
            })
        [functionName](...args);
    });
};

export const GASBackend = {
    // Dashboard & Finance
    getDashboardData: (monthRef) => runGAS('apiGetDashboardData', monthRef),
    getAnomalies: (monthRef) => runGAS('apiGetAnomalies', monthRef),

    // PDSA & Management
    getPDSAStructure: () => runGAS('apiGetPDSAStructure'),
    getPDSARecord: (grupo, conta, mesRef) => runGAS('apiGetPDSARecord', grupo, conta, mesRef),
    getPDSAList: (filtroGrupo, filtroMes) => runGAS('apiGetPDSAList', filtroGrupo, filtroMes),
    savePDSA: (form) => runGAS('apiSavePDSA', JSON.stringify(form)),
    generateAnalysis: (contexto) => runGAS('apiGenerateAnalysis', contexto),
    generateActions: (dadosPlan) => runGAS('apiGenerateActions', dadosPlan),
    getAvailableMonths: () => runGAS('apiGetAvailableMonths'),

    // Utilities
    isAvailable: isGAS
};
