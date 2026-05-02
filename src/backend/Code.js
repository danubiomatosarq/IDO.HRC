// ============================================
// 🚀 IDO DASHBOARD & PDSA - UNIFIED BACKEND
// ============================================

// --- CONFIGURAÇÃO ---
var SPREADSHEET_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var GROQ_API_KEY = "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"; // console.groq.com → Create API Key

// --- ROTAS (SERVIR HTML E API) ---

function doGet(e) {
    // Se vier com ?action=..., comporta-se como API JSON (útil para testes ou apps externos)
    if (e && e.parameter && e.parameter.action) {
        return handleApiRequest(e);
    }

    // Caso contrário, serve o SPA (Single Page Application)
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('IDO Dashboard & PDSA')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}

/**
 * Roteador de API para chamadas via GET (fetch)
 */
function handleApiRequest(e) {
    var action = e.parameter.action;
    var params = e.parameter;

    try {
        if (action == "getDashboardData") {
            return responseJSON(getDadosFinanceiros(params.mes));
        }
        else if (action == "getAnomalies") {
            return responseJSON(getDadosAuditoria(params.mes));
        }
        else if (action == "getPDSAStructure") {
            return responseJSON(getDataEstrutura());
        }
        else if (action == "getPDSAHistory") {
            return responseJSON(getHistoricoPDSA(params.grupo, params.conta));
        }
        else {
            return responseJSON({ status: "error", message: "Ação desconhecida: " + action });
        }
    } catch (err) {
        return responseJSON({ status: "error", message: err.toString() });
    }
}

function responseJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// --- INTEGRAÇÃO COM FRONTEND (GOOGLE.SCRIPT.RUN) ---
// Estas funções são chamadas diretamente pelo React via google.script.run

function apiGetDashboardData(mesRef) { return getDadosFinanceiros(mesRef); }
function apiGetAnomalies(mesRef) { return getDadosAuditoria(mesRef); }
function apiGetPDSAStructure() { return getDataEstrutura(); }
function apiGetPDSARecord(grupo, conta, mesRef) { return getRegistroExistente(grupo, conta, mesRef); }
function apiSavePDSA(form) { return salvarRegistroPDSA(form); }
function apiGetPDSAList(filtroGrupo, filtroMes) { return getListaPDSA(filtroGrupo, filtroMes); }
function apiGenerateAnalysis(contexto) { return gerarAnaliseIA(contexto); }
function apiGenerateActions(dadosPlan) { return sugerirTextosIA(dadosPlan); }
function apiGetAvailableMonths() { return getMesesDisponiveis(); }
function apiGetDadosRadar(mesRef, filtroGrupo) { return getDadosRadar(mesRef, filtroGrupo); }

// ============================================
// MÓDULO 1: DADOS FINANCEIROS (VISÃO ESTRATÉGICA)
// FONTE: Aba "CONSOLIDADO" (dados já organizados, importação antiga removida)
// ============================================

function getMesesDisponiveis() {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
        if (!sheet) return [];

        var dados = sheet.getDataRange().getValues();
        var mesesSet = {};

        // Coleta meses únicos (Aba Nova: Coluna 'Mês' é O / Index 14)
        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            var colMesIndex = 14; 
            if (!row[colMesIndex]) continue;
            var mesNorm = normalizarMesPlanilha(row[colMesIndex]);
            if (mesNorm) mesesSet[mesNorm] = true;
        }

        // Ordenação numérica de ano-mês para evitar problemas lexicográficos
        var mesesOrdenados = Object.keys(mesesSet).sort(function(a, b) {
            var pa = a.split('-'), pb = b.split('-');
            var ya = parseInt(pa[0], 10) || 0, ma = parseInt(pa[1], 10) || 0;
            var yb = parseInt(pb[0], 10) || 0, mb = parseInt(pb[1], 10) || 0;
            if (ya !== yb) return ya - yb;
            return ma - mb;
        });

        return mesesOrdenados.reverse(); // Mais recente primeiro
    } catch (e) {
        Logger.log("Erro getMesesDisponiveis: " + e);
        return [];
    }
}

function getDadosFinanceiros(filtroMes) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
        if (!sheet) return [];
        
        var dados = sheet.getDataRange().getValues();
        var output = [];
        var agrupamentosMap = {}; 
        var mesFiltroLimpo = filtroMes ? normalizarMesPlanilha(filtroMes) : null;

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            var mesCru = row[14]; 
            if (!mesCru || String(mesCru).trim() === "") continue;

            var mesRow = normalizarMesPlanilha(mesCru);
            if (mesFiltroLimpo && mesRow !== mesFiltroLimpo) continue;

            // --- INÍCIO DA LEITURA BLINDADA ---
            var grupoCru = String(row[0] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            var contaCru = String(row[1] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (!grupoCru && !contaCru) continue;

            var grupo = grupoCru.toUpperCase() || "NÃO IDENTIFICADO";
            var conta = contaCru.toUpperCase() || "(SEM DESCRIÇÃO)";
            // --- FIM DA LEITURA BLINDADA ---

            var idGrupo = limparTexto(grupo);
            var idConta = limparTexto(conta);

            var planNum = parseNumberBR(row[2]);
            var execNum = parseNumberBR(row[3]);

            var chave = idGrupo + "_" + idConta + "_" + mesRow;

            if (!agrupamentosMap[chave]) {
                agrupamentosMap[chave] = {
                    id: idGrupo + "_" + idConta,
                    idGrupo: idGrupo, 
                    mes: mesRow, 
                    idConta: idGrupo + "_" + idConta,
                    conta: conta, 
                    plan: planNum,
                    exec: execNum,
                    grupo: grupo 
                };
            } else {
                agrupamentosMap[chave].plan += planNum;
                agrupamentosMap[chave].exec += execNum;
            }
        }

        for (var key in agrupamentosMap) {
            var item = agrupamentosMap[key];
            var diff = item.exec - item.plan;
            item.varVal = diff;
            item.varPct = item.plan > 0 ? (diff / item.plan) * 100 : (item.exec > 0 ? 100 : 0);
            item.status = item.exec > item.plan ? "ACIMA" : "DENTRO";
            item.varGrupoPct = 0;
            output.push(item);
        }
        return output;
    } catch (err) { throw err; }
}


// ============================================
// MÓDULO 2: MONITOR DE ANOMALIAS
// FONTE: Aba "AI_Auditoria_Automatica"
// ============================================

function getDadosAuditoria(filtroMes) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("AI_Auditoria_Automatica");
        if (!sheet) return [];

        var dados = sheet.getDataRange().getValues();
        var output = [];

        // Colunas esperadas:
        // 0:Data, 1:MêsRef, 2:Grupo, 3:Conta, 4:Plan, 5:Exec, 6:Desvio%, 
        // 7:Icone, 8:Tipo, 9:Resumo, 10:Fator

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            var mesRow = row[1];

            // Normalize Date Object if necessary
            if (Object.prototype.toString.call(mesRow) === '[object Date]') {
                mesRow = Utilities.formatDate(mesRow, Session.getScriptTimeZone(), "yyyy-MM");
            }

            if (!mesRow) continue;
            if (filtroMes && mesRow != filtroMes) continue;

            var planVal = parseNumberBR(row[4]);
            var execVal = parseNumberBR(row[5]);
            var diffVal = execVal - planVal;
            var desvioRaw = row[6];
            var desvioNum = parseNumberBR(desvioRaw);
            if (desvioNum === 0 && planVal > 0) {
                desvioNum = diffVal / planVal;
            } else if (Math.abs(desvioNum) > 1 && Math.abs(desvioNum) <= 100) {
                desvioNum = desvioNum / 100;
            }

            output.push({
                dataAudit: row[0],
                mes: mesRow,
                grupo: row[2],
                conta: row[3],
                plan: planVal,
                exec: execVal,
                desvioPct: desvioNum,
                icone: row[7],
                tipo: row[8], // Corrected mapping name
                resumoIA: row[9],
                fatorIA: row[10],
                current: {
                    plan: planVal,
                    exec: execVal,
                    diff: diffVal,
                    varPct: desvioNum
                }
            });
        }
        return output;
    } catch (err) {
        Logger.log("Erro getDadosAuditoria: " + err);
        return [];
    }
}


// ============================================
// MÓDULO 3: PDSA & GESTÃO
// FONTE: "Contas Orçamentárias", "PDSA_Registros"
// ============================================

function getDataEstrutura() {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
        if (!sheet) return { grupos: [], contas: {} };

        var gruposMap = {};
        var contasMap = {};
        var dados = sheet.getDataRange().getValues();

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            
            // --- INÍCIO DA LEITURA BLINDADA ---
            var grupoCru = String(row[0] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            var contaCru = String(row[1] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (!grupoCru && !contaCru) continue;

            var grupo = grupoCru.toUpperCase() || "NÃO IDENTIFICADO";
            var conta = contaCru.toUpperCase();
            // --- FIM DA LEITURA BLINDADA ---

            // ID limpo para o filtro cruzar os dados
            var idGrupo = limparTexto(grupo);

            if (!gruposMap[idGrupo]) {
                gruposMap[idGrupo] = {
                    id: idGrupo,
                    nome: grupo,
                    resp: "Não Identificado",
                    setor: grupo
                };
            }
            
            if (conta) {
                if (!contasMap[idGrupo]) contasMap[idGrupo] = [];
                if (contasMap[idGrupo].indexOf(conta) === -1) {
                    contasMap[idGrupo].push(conta);
                }
            }
        }

        var gruposArray = Object.values(gruposMap).sort(function (a, b) {
            return a.nome.localeCompare(b.nome);
        });

        return { grupos: gruposArray, contas: contasMap };
    } catch (e) { throw new Error("Erro carregar estrutura: " + e.message); }
}

function getRegistroExistente(grupo, conta, mesRef) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaLog = ss.getSheetByName("PDSA_Registros");
        if (!abaLog) return null;

        var dados = abaLog.getDataRange().getValues();
        if (dados.length <= 1) return null;

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            // Normalização para comparação
            var mesPlanilha = normalizarMesPlanilha(row[2]);
            var grupoPlanilha = limparTexto(row[3]);
            var contaPlanilha = limparTexto(row[4]);

            var alvoGrupo = limparTexto(grupo);
            var alvoConta = limparTexto(conta);
            var alvoMes = String(mesRef).trim();

            if (grupoPlanilha === alvoGrupo && contaPlanilha === alvoConta && mesPlanilha === alvoMes) {
                return {
                    id: row[0],
                    mesRef: mesPlanilha,
                    grupo: row[3],
                    conta: row[4],
                    respName: row[5],
                    respSetor: row[6],
                    aiSuggestion: String(row[7] || ""),
                    planTarefas: String(row[8] || ""),
                    planResult: String(row[9] || ""),
                    planMedidas: String(row[10] || ""),
                    doDesc: String(row[11] || ""),
                    studyDesc: String(row[12] || ""),
                    actType: String(row[13] || ""),
                    actDetails: String(row[14] || ""),
                    estrategiaGestor: String(row[16] || "")
                };
            }
        }
        return null;
    } catch (e) { throw new Error("Erro ao buscar registro: " + e.message); }
}

function getListaPDSA(filtroGrupo, filtroMes) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaLog = ss.getSheetByName("PDSA_Registros");
        if (!abaLog) return [];

        var dados = abaLog.getDataRange().getValues();
        if (dados.length <= 1) return [];

        var output = [];
        // Colunas: 0:ID, 1:Data, 2:Mês Ref, 3:Grupo, 4:Conta, 5:Resp, 6:Setor, 7:IA, 8:PLAN, 9:PLAN_RES, 10:PLAN_MED, 11:DO, 12:STUDY, 13:ACT_DEC, 14:ACT_DET, 15:PRAZO

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];

            // Filtros Opcionais
            if (filtroGrupo && filtroGrupo !== 'TODOS' && limparTexto(row[3]) !== limparTexto(filtroGrupo)) continue;
            if (filtroMes && normalizarMesPlanilha(row[2]) !== normalizarMesPlanilha(filtroMes)) continue;

            var prazoRaw = row[15];
            var prazoStr = '';
            if (prazoRaw instanceof Date) prazoStr = Utilities.formatDate(prazoRaw, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            else if (prazoRaw) prazoStr = String(prazoRaw);

            // Determinar Status pelo prazo
            var hoje = new Date();
            var status = 'DATA_PENDENTE';
            if (prazoRaw instanceof Date) {
                if (prazoRaw < hoje) status = 'ATRASADO';
                else status = 'EM DIA';
            } else if (prazoStr) {
                var prazoDate = new Date(prazoStr);
                if (!isNaN(prazoDate)) status = prazoDate < hoje ? 'ATRASADO' : 'EM DIA';
            }
            if (row[13] && String(row[13]).length > 2) status = 'CONCLUIDO';

            output.push({
                id: String(row[0] || ''),
                dataCriacao: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[1] || ''),
                mesRef: String(row[2] || ''),
                grupo: String(row[3] || ''),
                conta: String(row[4] || ''),
                responsavel: String(row[5] || ''),
                setor: String(row[6] || ''),
                aiSuggestion: String(row[7] || ''),
                plan: String(row[8] || ''),
                do: String(row[11] || ''),
                study: String(row[12] || ''),
                act: String(row[14] || ''),
                actType: String(row[13] || ''),
                prazo: prazoStr,
                status: status,
                estrategiaGestor: String(row[16] || '')
            });
        }
        return JSON.parse(JSON.stringify(output)); // garante serialização limpa

    } catch (e) { throw new Error("Erro ao listar PDSA: " + e.message); }
}

function salvarRegistroPDSA(formJson) {
    try {
        var form = (typeof formJson === 'string') ? JSON.parse(formJson) : formJson;
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaLog = ss.getSheetByName("PDSA_Registros");
        if (!abaLog) {
            abaLog = ss.insertSheet("PDSA_Registros");
            abaLog.appendRow(["ID", "Data", "Mês Ref", "Grupo", "Conta", "Resp", "Setor", "IA", "PLAN", "PLAN_RES", "PLAN_MED", "DO", "STUDY", "ACT_DEC", "ACT_DET", "PRAZO", "ESTRATEGIA_GESTOR"]);
        }

        var id = form.id || Utilities.getUuid();
        var nl = [
            id,
            new Date(),
            form.mesRef,
            form.grupo,
            form.conta,
            form.respName,
            form.respSetor,
            form.aiSuggestion,
            form.planTarefas, // Plan
            form.planResult,  // (Legacy/Extra)
            form.planMedidas, // (Legacy/Extra)
            form.doDesc,
            form.studyDesc,
            form.actType,
            form.actDetails,
            form.prazo, // Nova Coluna 15
            form.estrategiaGestor // Nova Coluna 16
        ];

        // Se for edição (ID existe)
        if (form.id) {
            var dados = abaLog.getDataRange().getValues();
            for (var i = 1; i < dados.length; i++) {
                if (dados[i][0] == form.id) {
                    abaLog.getRange(i + 1, 1, 1, nl.length).setValues([nl]);
                    return "Editado com Sucesso";
                }
            }
        }

        // Novo registro
        abaLog.appendRow(nl);
        return "Sucesso";
    } catch (e) { throw new Error("Erro ao salvar: " + e.message); }
}

// ============================================
// MÓDULO 4: INTELIGÊNCIA ARTIFICIAL (GEMINI)
// ============================================

function gerarAnaliseIA(contexto) {
    try {
        // Radar Insights (Groq) - retorna JSON com critical/positive
        if (contexto && contexto.radar === true) {
            var grupoRadar = contexto.grupo || "Grupo";
            var mesRadar = contexto.mesRef || "";
            var criticas = contexto.criticas || [];
            var positivos = contexto.positivos || [];

            var linhasCriticas = criticas.slice(0, 5).map(function (c) {
                var pct = (c && c.varPct !== undefined && c.varPct !== null) ? (Number(c.varPct) * 100).toFixed(1) + "%" : "n/d";
                var exec = (c && c.exec !== undefined && c.exec !== null) ? "R$ " + Number(c.exec).toFixed(2) : "n/d";
                return "- " + (c.conta || "(sem conta)") + " | Exec: " + exec + " | Var%: " + pct;
            }).join("\n");

            var linhasPositivas = positivos.slice(0, 5).map(function (p) {
                var pctP = (p && p.varPct !== undefined && p.varPct !== null) ? (Number(p.varPct) * 100).toFixed(1) + "%" : "n/d";
                return "- " + (p.conta || "(sem conta)") + " | Var%: " + pctP;
            }).join("\n");

            var promptRadar = "Você é um analista de controladoria hospitalar. Gere insights para o Radar de Riscos do grupo '" +
                grupoRadar + "'" + (mesRadar ? (" no mês " + mesRadar) : "") + ".\n\n" +
                "CONTAS CRÍTICAS (TOP 5):\n" + (linhasCriticas || "(nenhuma)") + "\n\n" +
                "CONTAS DENTRO DO ESPERADO (TOP 5):\n" + (linhasPositivas || "(nenhuma)") + "\n\n" +
                "Retorne EXCLUSIVAMENTE um JSON válido com as chaves:\n" +
                "{ \"critical\": \"[pontos de atenção do grupo]\", \"positive\": \"[pontos positivos / estabilidade]\" }";

            var respostaRadar = chamarGemini(promptRadar);
            try {
                var jsonLimpo = respostaRadar.replace(/`{3,}/g, "").replace(/^json/i, "").trim();
                return JSON.parse(jsonLimpo);
            } catch (e) {
                return { critical: String(respostaRadar || ""), positive: "" };
            }
        }

        if (!contexto || !contexto.conta) return "⚠️ Selecione Grupo/Conta.";
        var mesAlvo = contexto.mesRef;
        var planVal, execVal, diffVal, percDesvio, mediaHistorica;
        var resumoHistorico = "";

        // PRIORIDADE: Usa dados já calculados pelo frontend (mais confiável)
        if (contexto.planFrontend !== undefined) {
            planVal = Number(contexto.planFrontend) || 0;
            execVal = Number(contexto.execFrontend) || 0;
            diffVal = Number(contexto.diffFrontend) || 0;
            percDesvio = Number(contexto.varPctFrontend) || 0; // já em %

            var hist = contexto.historicoFrontend || [];
            if (hist.length > 0) {
                var somaReal = 0;
                hist.forEach(function (h) { somaReal += Number(h.exec) || 0; });
                mediaHistorica = somaReal / hist.length;

                var linhasHist = hist.slice(-12).map(function (h) {
                    var p = Number(h.plan) || 0;
                    var e = Number(h.exec) || 0;
                    var v = p > 0 ? (((e - p) / p) * 100).toFixed(1) : "N/A";
                    var status = e > p ? "↑ ACIMA" : e < p ? "↓ ABAIXO" : "= IGUAL";
                    return "  - " + h.mes + ": Orc R$ " + p.toFixed(0) + " | Real R$ " + e.toFixed(0) + " | Var " + v + "% [" + status + "]";
                });

                // Estatísticas dos últimos 12 meses
                var execValues = hist.slice(-12).map(function (h) { return Number(h.exec) || 0; });
                var planValues = hist.slice(-12).map(function (h) { return Number(h.plan) || 0; });
                var mesesAcima = hist.slice(-12).filter(function (h) { var p = Number(h.plan) || 0; var e = Number(h.exec) || 0; return e > p; }).length;
                var maxExec = Math.max.apply(null, execValues);
                var minExec = Math.min.apply(null, execValues.filter(function (v) { return v > 0; }));
                var mediaOrc = planValues.reduce(function (a, b) { return a + b; }, 0) / (planValues.length || 1);

                // Comparação com mês atual
                var comparativo = "";
                if (mediaHistorica > 0) {
                    var difMedia = ((execVal - mediaHistorica) / mediaHistorica * 100).toFixed(1);
                    var sinal = difMedia > 0 ? "+" : "";
                    comparativo = "\n\nCOMPARATIVO COM HISTÓRICO:\n" +
                        "  - Realizado atual vs. Média 12m: " + sinal + difMedia + "% (" + (difMedia > 0 ? "acima da média histórica" : "abaixo da média histórica") + ")\n" +
                        "  - Meses acima do orçado (12m): " + mesesAcima + " de " + Math.min(hist.length, 12) + "\n" +
                        "  - Maior realização (12m): R$ " + maxExec.toFixed(0) + "\n" +
                        "  - Menor realização (12m): R$ " + minExec.toFixed(0) + "\n" +
                        "  - Média orçada (12m): R$ " + mediaOrc.toFixed(0);
                }

                resumoHistorico = "\n\nHISTÓRICO (últimos 12 meses):\n" + linhasHist.join("\n") + comparativo;
            } else {
                mediaHistorica = 0;
            }
        } else {
            // FALLBACK: Releitura da planilha Nova
            var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            var abaDados = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
            if (!abaDados) return "⚠️ Aba 'CONSOLIDADO' não encontrada.";

            var dados = abaDados.getDataRange().getValues();
            var historicoConta = [];
            var valorMes = { orcado: 0, realizado: 0 };
            var encontrouMes = false;
            var contaAlvo = limparTexto(contexto.conta);

            var COL_DSC_CONTA = 1;
            var COL_PARCELA = 2;
            var COL_AF_GERADAS = 3;
            var COL_MES = 14;

            for (var i = 1; i < dados.length; i++) {
                var row = dados[i];
                var mesCru = row[COL_MES];
                if (!mesCru) continue;
                
                if (limparTexto(row[COL_DSC_CONTA]) === contaAlvo) {
                    var pl = parseNumberBR(row[COL_PARCELA]);
                    var ex = parseNumberBR(row[COL_AF_GERADAS]);
                    var dt = normalizarMesPlanilha(mesCru);
                    
                    historicoConta.push({ mes: dt, orcado: pl, realizado: ex });
                    if (dt === mesAlvo) { valorMes.orcado = pl; valorMes.realizado = ex; encontrouMes = true; }
                }
            }

            if (historicoConta.length === 0) return "⚠️ Dados da conta '" + contexto.conta + "' não encontrados.";
            if (!encontrouMes) return "⚠️ Mês " + mesAlvo + " não localizado.";

            planVal = valorMes.orcado;
            execVal = valorMes.realizado;
            diffVal = execVal - planVal;
            percDesvio = planVal > 0 ? (diffVal / planVal) * 100 : 0;
            var somaR = historicoConta.reduce(function (a, c) { return a + c.realizado; }, 0);
            mediaHistorica = somaR / historicoConta.length;
        }

        var isCritical = contexto.isCritical !== false; // Padrão é true
        var prompt = "";

        if (isCritical) {
            prompt = "Você é um Assistente Estratégico de Controladoria Hospitalar, especializado em análise orçamentária e gestão de custos. Sua missão é atuar como um parceiro de negócios para os líderes do hospital, ajudando-os a desvendar o comportamento de contas críticas (aquelas com variância acima de 20% do planejado).\n\n" +
                "[OBJETIVO]\nVocê receberá dados da conta '" + contexto.conta + "', a variância atual (realizado vs. planejado), o histórico dos últimos 12 meses e um comparativo estatístico. Analise os dados e identifique:\n- O resultado atual é uma anomalia pontual ou um padrão estrutural?\n- Existem sazonalidades, acelerações ou quebras de tendência?\n- Quais eventos operacionais hospitalares podem explicar o desvio?\n\n" +
                "DADOS FINANCEIROS DO MÊS " + mesAlvo + ":\n" +
                "- Planejado: R$ " + planVal.toFixed(2) + "\n" +
                "- Realizado: R$ " + execVal.toFixed(2) + "\n" +
                "- Variação Absoluta: R$ " + diffVal.toFixed(2) + "\n" +
                "- Variação Percentual: " + Number(percDesvio).toFixed(1) + "%" +
                resumoHistorico + "\n\n" +
                "[DIRETRIZES DE TOM E ESTILO]\n" +
                "1. Propositivo e Construtivo: Nunca use tom punitivo. Seja investigativo e focado em soluções.\n" +
                "2. Linguagem Corporativa com Leve Irreverência: Use analogias clínicas (ex: 'Os sinais vitais dessa conta mostram uma taquicardia').\n" +
                "3. Use os dados históricos para contextualizar: compare o resultado atual com a média e com os meses anteriores.\n\n" +
                "[CONTEXTO DE GESTÃO HOSPITALAR]\n" +
                "Considere: Hotelaria/Logística (surtos de infecção, descarte extraordinário), Compras/Suprimentos (inflação médica, quebra de contratos, compra emergencial), Operação (picos de ocupação, dengue, abertura de leitos).\n\n" +
                "[ESTRUTURA DE RESPOSTA EXIGIDA]\n" +
                "1. 🩺 Triagem Rápida (Resumo Executivo): Parágrafo curto com a conta, tamanho da variância e sintoma principal comparado com o histórico.\n" +
                "2. 📊 Raio-X Histórico: Leitura fluida do comportamento dos 12 meses: tendência, picos, sazonalidades e se o desvio atual é pontual ou recorrente.\n" +
                "3. 🔍 Diagnóstico de Hipóteses: 2 a 3 hipóteses reais do mundo hospitalar que explicam o desvio atual.\n" +
                "4. 💊 Receita Médica: 2 a 3 ações propositivas para o gestor investigar a fundo.";
        } else {
            prompt = "Você é um Assistente Estratégico de Controladoria Hospitalar. Sua missão é atuar como um parceiro de negócios para os líderes do hospital, ajudando-os a COMEMORAR e VALIDAR o comportamento de contas EFICIENTES (aquelas que se mantiveram dentro do esperado, variância controlada até 20%).\n\n" +
                "[OBJETIVO]\nVocê receberá dados da conta eficiênte '" + contexto.conta + "', a variância atual, o histórico dos 12 meses e comparativos. Analise os dados para ENALTECER O BOM RESULTADO e levantar as tendências de sucesso que explicaram essa eficiência:\n- O resultado se manteve estável ao longo do ano?\n- Houve sazonalidade controlada?\n- Quais boas práticas podem ter sido adotadas no hospital para atingir essa excelência?\n\n" +
                "DADOS FINANCEIROS DO MÊS " + mesAlvo + ":\n" +
                "- Planejado: R$ " + planVal.toFixed(2) + "\n" +
                "- Realizado: R$ " + execVal.toFixed(2) + "\n" +
                "- Variação Absoluta: R$ " + diffVal.toFixed(2) + "\n" +
                "- Variação Percentual: " + Number(percDesvio).toFixed(1) + "%" +
                resumoHistorico + "\n\n" +
                "[DIRETRIZES DE TOM E ESTILO]\n" +
                "1. Celebrativo e Positivo: O tom é de parabenização franca pelos bons resultados na gestão do orçamento.\n" +
                "2. Linguagem Corporativa com Leve Irreverência: Use analogias clínicas de cura ou alta médica (ex: 'O paciente tem uma saúde de ferro', 'Alta médica garantida', 'Sinais vitais invejáveis').\n" +
                "3. Elogie a previsibilidade na leitura do Raio-X.\n\n" +
                "[ESTRUTURA DE RESPOSTA EXIGIDA]\n" +
                "1. 🏆 Alto Desempenho (Resumo Executivo): Celebre o resultado da conta, destacando a eficiência apresentada baseada nos valores absolutos e comparativos.\n" +
                "2. 📈 Raio-X de Sustentabilidade: Avaliação da consistência dos 12 meses, apontando que os dados refletem estabilidade e controle orçamentário positivo.\n" +
                "3. 🥇 Fatores de Proteção: Liste 2 a 3 hipóteses de ações que a equipe pode ter implementado e que estancou desperdícios (boas práticas operacionais do mundo real).\n" +
                "4. 💡 Próximo Passo: Um pedido motivador curto encorajando o gestor a documentar qual foi o segredo desse resultado (o registro de Sucesso do Ciclo).";
        }

        return chamarGemini(prompt);
    } catch (e) { throw new Error("Erro na Análise IA: " + e.message); }
}


function sugerirTextosIA(dadosPlan) {
    if (!dadosPlan.analise) return { plan: "", do: "", study: "", act: "", resumo: "", dica: "" };

    var prompt = "Você é um Estrategista de Melhoria Contínua e Controladoria Hospitalar. O gestor identificou a causa raiz de um desvio orçamentário crítico e descreveu a anomalia que precisa ser combatida. Sua missão é criar um ciclo PDSA (Plan, Do, Study, Act) como um PLANO DE AÇÃO CORRETIVO — focado em COMBATER a anomalia descrita e REVERTER o desvio financeiro.\n\n" +
        "[DIAGNÓSTICO DO GESTOR — O PROBLEMA A SER COMBATIDO]\n" + dadosPlan.analise + "\n\n" +
        "[ORIENTAÇÃO CRÍTICA]\n" +
        "- O gestor já identificou o que causou o problema. Sua tarefa é criar um PDSA que ELIMINE essa causa raiz.\n" +
        "- Cada etapa deve conter ações CONCRETAS e MENSURÁVEIS de intervenção — não apenas descrições do problema.\n" +
        "- Use verbos de ação no PLAN e DO (ex: implementar, bloquear, renegociar, auditar, restringir, automatizar).\n" +
        "- O STUDY deve definir métricas claras para saber se a intervenção funcionou.\n" +
        "- O ACT deve definir o que padronizar se sucesso ou o que ajustar se o desvio persistir.\n\n" +
        "[DIRETRIZES DE TOM]\n" +
        "Use analogias clínicas (ex: 'o tratamento para essa disfunção'). Foco em ação e resultado — seja direto e cirúrgico.\n\n" +
        "[ESTRUTURA DE RESPOSTA EXIGIDA]\n" +
        "Retorne EXCLUSIVAMENTE UM STRING EM FORMATO JSON VÁLIDO contendo exatamente as chaves abaixo (NÃO inclua markdown como ```json ou texto fora das chaves):\n" +
        "{\n" +
        "  \"resumo\": \"🎯 Intervenção Proposta: [Síntese da causa raiz identificada e da estratégia de combate escolhida]\",\n" +
        "  \"plan\": \"[O que exatamente será feito para combater a anomalia? Quem? Quando? Qual o escopo do piloto?]\",\n" +
        "  \"do\": \"[Passos práticos de implementação da intervenção. Como será executado no dia a dia operacional?]\",\n" +
        "  \"study\": \"[Quais KPIs indicam que a anomalia foi controlada? Como medir o impacto financeiro da intervenção?]\",\n" +
        "  \"act\": \"[Se a intervenção funcionou: como padronizar? Se não funcionou: qual ajuste de dose ou mudança de abordagem?]\",\n" +
        "  \"dica\": \"🚀 Prescrição Final: [Frase motivacional para engajar a equipe na execução do plano de intervenção]\"\n" +
        "}";

    var resposta = chamarGemini(prompt);
    try {
        var jsonLimpo = resposta.replace(/`{3,}/g, "").replace(/^json/i, "").trim();
        return JSON.parse(jsonLimpo);
    } catch (e) { throw new Error("Falha ao processar sugestão JSON. Resposta parcial: " + resposta.substring(0, 100)); }
}

function chamarGemini(prompt) {
    var url = "https://api.groq.com/openai/v1/chat/completions";
    var payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{ "role": "user", "content": prompt }],
        "temperature": 0.7,
        "max_tokens": 2048
    };
    try {
        var response = UrlFetchApp.fetch(url, {
            "method": "post",
            "contentType": "application/json",
            "headers": { "Authorization": "Bearer " + GROQ_API_KEY },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        });
        var json = JSON.parse(response.getContentText());
        if (json.choices && json.choices[0] && json.choices[0].message) {
            return json.choices[0].message.content;
        }
        var msg = (json.error && json.error.message) ? json.error.message : JSON.stringify(json);
        throw new Error("Falha na IA (Groq): " + msg);
    } catch (e) {
        throw new Error("Falha na IA: " + e.message);
    }
}


// ============================================
// MÓDULO 5: RADAR DE RISCOS (NOVO)
// ============================================

function getDadosRadar(mesRef, filtroGrupo) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
        if (!sheet) return null;
        var dados = sheet.getDataRange().getValues();
        var partes = mesRef.split("-");
        var anoBase = parseInt(partes[0], 10), mesBase = parseInt(partes[1], 10);
        var mesesAlvo = [];

        for (var m = 0; m < 6; m++) {
            var mAtual = mesBase - m, aAtual = anoBase;
            if (mAtual <= 0) { mAtual += 12; aAtual -= 1; }
            mesesAlvo.push(aAtual + "-" + (mAtual < 10 ? "0" + mAtual : mAtual));
        }

        var contasDoMes = [], contasDoMesMap = {}, historicoMap = {}, historicoSomaMap = {};

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            var mesCru = row[14];
            if (!mesCru) continue;

            // --- INÍCIO DA LEITURA BLINDADA ---
            var grupoCru = String(row[0] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            var contaCru = String(row[1] || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (!grupoCru && !contaCru) continue;

            var grupo = grupoCru.toUpperCase() || "NÃO IDENTIFICADO";
            var conta = contaCru.toUpperCase() || "(SEM DESCRIÇÃO)";
            // --- FIM DA LEITURA BLINDADA ---

            var mesRow = normalizarMesPlanilha(mesCru);
            var idGrupo = limparTexto(grupo);
            var idConta = limparTexto(conta);
            var chaveConta = idGrupo + "_" + idConta;
            
            var plan = parseNumberBR(row[2]), exec = parseNumberBR(row[3]);

            if (filtroGrupo && filtroGrupo !== "TODOS") {
                if (idGrupo !== limparTexto(filtroGrupo)) continue;
            }

            if (mesRow === mesRef) {
                if (!contasDoMesMap[chaveConta]) {
                    contasDoMesMap[chaveConta] = { 
                        idGrupo: idGrupo, 
                        idConta: idConta, 
                        conta: conta, 
                        plan: plan, 
                        exec: exec, 
                        grupo: grupo 
                    };
                } else {
                    contasDoMesMap[chaveConta].plan += plan;
                    contasDoMesMap[chaveConta].exec += exec;
                }
            }

            if (mesesAlvo.indexOf(mesRow) !== -1) {
                var histKey = chaveConta + "_" + mesRow;
                if (!historicoSomaMap[histKey]) {
                    historicoSomaMap[histKey] = { idConta: chaveConta, mes: mesRow, plan: plan, exec: exec };
                } else {
                    historicoSomaMap[histKey].plan += plan;
                    historicoSomaMap[histKey].exec += exec;
                }
            }
        }

        for (var k in contasDoMesMap) {
            var c = contasDoMesMap[k], diff = c.exec - c.plan;
            c.varVal = diff; c.varPct = c.plan > 0 ? (diff / c.plan) * 100 : (c.exec > 0 ? 100 : 0);
            contasDoMes.push(c);
        }

        for (var hk in historicoSomaMap) {
            var h = historicoSomaMap[hk], hDiff = h.exec - h.plan, hVarPct = h.plan > 0 ?
            (hDiff / h.plan) * 100 : (h.exec > 0 ? 100 : 0);
            if (!historicoMap[h.idConta]) historicoMap[h.idConta] = [];
            historicoMap[h.idConta].push({ mes: h.mes, varPct: hVarPct });
        }

        var radar = { criticas: [], atencao: [], esperado: [], total: contasDoMes.length };

        for (var c = 0; c < contasDoMes.length; c++) {
            var contaFinal = contasDoMes[c];
            contaFinal.historico6Meses = historicoMap[contaFinal.idConta] || [];
            contaFinal.historico6Meses.forEach(h => { if (h.varPct > 1000) h.varPct = 1000; });
            contaFinal.historico6Meses.sort(function (a, b) { return a.mes > b.mes ? 1 : -1; });
            
            if (contaFinal.varPct > 20) radar.criticas.push(contaFinal);
            else if (contaFinal.varPct > 10 && contaFinal.varPct <= 20) radar.atencao.push(contaFinal);
            else radar.esperado.push(contaFinal);
        }
        return radar;
    } catch (err) { throw err; }
}

// ============================================
// MÓDULO 6: UTILITÁRIOS
// ============================================

function limparTexto(txt) {
    if (!txt) return "";
    return String(txt)
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ') // Tritura caracteres invisíveis e espaços inquebráveis
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
        .replace(/\s+/g, " "); // Troca múltiplos espaços por um só
}

function normalizarMesPlanilha(mesInput) {
    if (!mesInput) return "";
    if (mesInput instanceof Date) {
        // Previne pulo de fuso horário do Google Sheets
        var dataSegura = new Date(mesInput.getTime() + (12 * 60 * 60 * 1000));
        return Utilities.formatDate(dataSegura, "GMT", "yyyy-MM");
    }
    
    var mesStr = String(mesInput).toUpperCase().trim();
    if (/^\d{4}-\d{2}$/.test(mesStr)) return mesStr; 
    
    // Captura o ano (qualquer bloco de 4 números)
    var anoMatch = mesStr.match(/\d{4}/);
    var ano = anoMatch ? anoMatch[0] : new Date().getFullYear().toString();
    
    // Mapa expandido de meses
    var mapa = { 
        "JANEIRO": "01", "JAN": "01", "FEVEREIRO": "02", "FEV": "02", 
        "MARCO": "03", "MARÇO": "03", "MAR": "03", "ABRIL": "04", "ABR": "04", 
        "MAIO": "05", "MAI": "05", "JUNHO": "06", "JUN": "06", 
        "JULHO": "07", "JUL": "07", "AGOSTO": "08", "AGO": "08", 
        "SETEMBRO": "09", "SET": "09", "OUTUBRO": "10", "OUT": "10", 
        "NOVEMBRO": "11", "NOV": "11", "DEZEMBRO": "12", "DEZ": "12" 
    };
    
    // 1. Tenta identificar se o mês foi escrito por extenso
    var stringLimpa = mesStr.replace(/[^A-Z]/g, '');
    for (var key in mapa) {
        if (stringLimpa.indexOf(key) !== -1) {
            return ano + "-" + mapa[key];
        }
    }
    
    // 2. Tenta identificar se foi usado número (ex: "01/2026", "15/01/2026")
    var numMatch = mesStr.match(/^(\d{1,2})[\/\-\s\\]/);
    if (numMatch) {
        var m = parseInt(numMatch[1], 10);
        if (m >= 1 && m <= 12) {
            return ano + "-" + (m < 10 ? "0" + m : m);
        }
    }
    
    return mesStr; // Fallback
}

function parseNumberBR(val) {
    if (val === null || val === undefined || val === '') return 0;
    
    // Suporte mágico ao Google Sheets que já transfere isso como Float nativo Javascript
    if (typeof val === 'number') {
        return val;
    }
    
    var str = String(val).trim();
    var strUpper = str.toUpperCase();

    // INTERCEPTADOR DE TEXTOS (Resolve o "(Em branco)", traços e vazios)
    if (strUpper === '-' || 
        strUpper === '--' || 
        strUpper.indexOf('(EM BRANCO)') !== -1 || 
        strUpper.indexOf('(VAZIO)') !== -1) {
        return 0;
    }
    
    // Suporte a contábil negativo (150,00) -> -150
    var isNegative = (str.indexOf('(') !== -1 && str.indexOf(')') !== -1) || str.indexOf('-') === 0;
    
    // Limpar tudo que não é número, ponto ou vírgula
    str = str.replace(/[^-0-9,.]/g, '');
    var lastComma = str.lastIndexOf(',');
    var lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
        // Formato BR clássico: "1.234.567,89" ou "123,45"
        str = str.replace(/\./g, '');
        str = str.replace(',', '.');
    } else if (lastDot > lastComma) {
        // Pode ser formato EN ("1,234.56") ou milhar sem centavos BR ("1.234")
        if (lastComma === -1) {
            var numDots = (str.match(/\./g) || []).length;
            if (numDots > 1) {
                str = str.replace(/\./g, ''); // Múltiplos pontos = milhar BR garantido
            } else {
                // Apenas 1 ponto ("1.234" ou "12.5")
                var split = str.split('.');
                // Se após o ponto tiver exatos 3 numerais, assumimos milhar BR (é padrão orçamentário)
                if (split[1] && split[1].length === 3) {
                    str = str.replace(/\./g, '');
                }
            }
        } else {
            // lastComma > -1 e lastDot > lastComma -> Formato garantido EN com comma de milhar
            str = str.replace(/,/g, '');
        }
    }
    
    var num = parseFloat(str);
    if(isNaN(num)) return 0;
    return isNegative && num > 0 ? -num : num;
}
function diagnosticarSomas() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("CONSOLIDADO (ALTERE AQUI)");
  var dados = sheet.getDataRange().getValues();
  
  var totalPlan = 0;
  var totalExec = 0;
  var linhasSemMes = [];
  var linhasIgnoradasFiltro = [];
  
  // Confirme se é 14 (Coluna O) ou 6 (Coluna G)
  var COL_PARCELA = 2; // C
  var COL_AF = 3;      // D
  var COL_MES = 14;    // O (Atenção aqui!)
  
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var mesCru = row[COL_MES];
    
    // Testa se a célula do mês está vazia
    if (!mesCru || String(mesCru).trim() === "") {
        linhasSemMes.push(i + 1); // +1 para bater com o número da linha no Sheets
        continue; 
    }
    
    var mesNorm = normalizarMesPlanilha(mesCru);
    
    // Testa se o mês está vindo escrito de forma que o sistema não reconheceu
    if (mesNorm !== "2026-01") { 
        linhasIgnoradasFiltro.push("Linha " + (i + 1) + " (Tinha o texto: '" + mesCru + "')");
        continue;
    }
    
    // Soma os valores com a sua função
    totalPlan += parseNumberBR(row[COL_PARCELA]);
    totalExec += parseNumberBR(row[COL_AF]);
  }
  
  Logger.log("=== DIAGNÓSTICO JANEIRO 2026 ===");
  Logger.log("Total Planejado Lido: R$ " + totalPlan.toFixed(2));
  Logger.log("Total Executado Lido: R$ " + totalExec.toFixed(2));
  
  Logger.log("-----------------------------------");
  Logger.log("🛑 QUANTIDADE DE LINHAS IGNORADAS PORQUE A COLUNA DE MÊS ESTÁ VAZIA: " + linhasSemMes.length);
  if (linhasSemMes.length > 0) {
      Logger.log("Exemplo das linhas vazias (Verifique essas no Sheets): " + linhasSemMes.slice(0, 20).join(", "));
  }
  
  Logger.log("🛑 LINHAS DESCARTADAS PORQUE O NOME DO MÊS ESTAVA ESTRANHO: " + linhasIgnoradasFiltro.length);
  if (linhasIgnoradasFiltro.length > 0) {
      Logger.log("Exemplos: " + linhasIgnoradasFiltro.slice(0, 10).join(" | "));
  }
}

function formatarNome(txt) {
    if (!txt) return "";
    return String(txt)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove caracteres invisíveis de largura zero
        .replace(/\u00A0/g, ' ')               // Converte espaços inquebráveis em espaços normais
        .replace(/\s+/g, ' ')                  // Transforma espaços duplos em um só
        .trim()                                // Remove espaços nas pontas
        .toUpperCase();
}