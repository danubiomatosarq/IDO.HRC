// ============================================
// SCRIPT: IMPORTADOR DE ORÇAMENTO (v28 - CORREÇÃO VARIÂNCIA MENSAL)
// ============================================
// Source: Provided by User in Chat
// Context: Used to populate 'GrupoxMês' sheet.

/*
DATA SCHEMA INTERPRETATION:
Col 1: UUID
Col 2: idGrupo
Col 3: mes (e.g. "Janeiro/2025")
Col 4: idConta
Col 5: nomeConta
Col 6: plan (Planejado)
Col 7: exec (Executado)
Col 8: varRs
Col 9: varPct
Col 10: status
Col 11: nomeGrupo
Col 12: varianciaGrupoNoMes (Calculated: (TotalPlan - TotalExec) / TotalPlan)
*/

var PASTA_ORC_ID = "1xFpkM_K9gaBssVZks55NZVANnZYdhcBG";
var PLANILHA_DB_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var NOME_ABA_DESTINO = "GrupoxMês";

function importarOrcamentoDoDrive() {
    // ... (logic from chat)
    // Key Logic:
    // 1. Scan files in Drive Folder.
    // 2. Parse "PARCELA: MES/ANO".
    // 3. Parse "Grupo: ID - Name".
    // 4. Parse "Conta: ID - Name".
    // 5. Aggregate totals by Group|Month to calculate 'varianciaGrupoNoMes'.
}
