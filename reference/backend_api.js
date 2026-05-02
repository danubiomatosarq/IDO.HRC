// ============================================
// SCRIPT: API BACKEND PARA REACT DASHBOARD
// ============================================
// Copie este código para um novo arquivo .gs no seu projeto Google Apps Script

var SPREADSHEET_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";

// Função especial para servir requisições Web (GET)
function doGet(e) {
    var action = e.parameter.action;

    // Roteamento simples
    if (action == "getDashboardData") {
        return responseJSON(getDadosFinanceiros());
    }
    else if (action == "getAnomalies") {
        return responseJSON(getDadosAuditoria());
    }
    else {
        return responseJSON({ status: "error", message: "Ação não reconhecida" });
    }
}

function responseJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// === 1. LEITURA FINANCEIRA (IDO HRC) ===
function getDadosFinanceiros() {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("GrupoxMês");
    var dados = sheet.getDataRange().getValues();

    // Pula cabeçalho
    var output = [];
    for (var i = 1; i < dados.length; i++) {
        var row = dados[i];
        // Schema baseado no seu Script 1
        output.push({
            id: row[0], // UUID
            grupo: row[10], // Nome Grupo
            conta: row[4], // Nome Conta
            mes: row[2], // Mês Ref
            plan: row[5], // Planejado
            exec: row[6], // Executado
            varPct: row[8] // Variação %
        });
    }
    return output;
}

// === 2. LEITURA AUDITORIA (Monitor IA) ===
function getDadosAuditoria() {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("AI_Auditoria_Automatica");
    if (!sheet) return [];

    var dados = sheet.getDataRange().getValues();
    var output = [];
    for (var i = 1; i < dados.length; i++) {
        var row = dados[i];
        output.push({
            mes: row[1],
            grupo: row[2],
            conta: row[3],
            status: row[7], // Icone
            tipo: row[8], // Critico/Atenção
            resumoIA: row[9] // Texto IA
        });
    }
    return output;
}

// === SUPORTE A CORS (Para rodar localmente) ===
// Adicione isso se for testar do localhost
function doOptions(e) {
    var headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
