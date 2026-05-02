// ============================================
// 🚀 IDO DASHBOARD & PDSA - UNIFIED BACKEND
// ============================================

// --- CONFIGURAÇÃO ---
var SPREADSHEET_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var API_KEY = "AIzaSyA6nmNt7YmVZMLDf-0Q1UHh3w2l4krTjZc"; // Gemini API Key

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
// FONTE: Aba "GrupoxMês"
// ============================================

function getMesesDisponiveis() {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("GrupoxMês");
        if (!sheet) return [];

        var dados = sheet.getDataRange().getValues();
        var mesesSet = {};

        // Coleta meses únicos (Coluna C / Index 2)
        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            if (!row[2]) continue;
            var mesNorm = normalizarMesPlanilha(row[2]);
            if (mesNorm) mesesSet[mesNorm] = true;
        }

        // Filtra até o mês anterior ao atual
        var hoje = new Date();
        var mesAtual = Utilities.formatDate(hoje, "GMT", "yyyy-MM");

        var mesesOrdenados = Object.keys(mesesSet).sort().filter(function (m) {
            return m < mesAtual;
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
        var sheet = ss.getSheetByName("GrupoxMês");
        if (!sheet) return [];

        var dados = sheet.getDataRange().getValues();
        var output = [];

        // Pula cabeçalho (Linha 1)
        // Colunas esperadas: 
        // 0:IdGrupoxmes, 1:IdGrupo, 2:NomeMês, 3:IdConta, 4:NomeConta, 
        // 5:Planejado, 6:Executado, 7:Var$, 8:Var%, 9:Status, 10:NomeGrupo, 11:Var%Grupo

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];

            // Validação básica
            if (!row[1] && !row[10]) continue;

            // Debug para entender o formato
            // Logger.log("Row mes: " + row[2] + " | Tipo: " + typeof row[2] + " | Filtro: " + filtroMes);

            // Filtro de mês opcional (COM NORMALIZAÇÃO)
            var mesRow = normalizarMesPlanilha(row[2]);
            if (filtroMes && mesRow != filtroMes) continue;

            output.push({
                id: String(row[0]),
                idGrupo: String(row[1]),
                mes: mesRow, // Retorna o Mês Normalizado (YYYY-MM)
                idConta: String(row[3]),
                conta: row[4],
                plan: Number(row[5]) || 0,
                exec: Number(row[6]) || 0,
                varVal: Number(row[7]) || 0,
                varPct: Number(row[8]) || 0,
                status: row[9],
                grupo: row[10],
                varGrupoPct: Number(row[11]) || 0
            });
        }
        return output;
    } catch (err) {
        Logger.log("Erro getDadosFinanceiros: " + err);
        throw err;
    }
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

            output.push({
                dataAudit: row[0],
                mes: mesRow,
                grupo: row[2],
                conta: row[3],
                plan: Number(row[4]),
                exec: Number(row[5]),
                desvioPct: row[6],
                icone: row[7],
                tipo: row[8], // Corrected mapping name
                resumoIA: row[9],
                fatorIA: row[10]
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
        var sheet = ss.getSheetByName("Contas Orçamentárias") || ss.getSheetByName("Contas Orcamentarias") || ss.getSheetByName("Contas");

        var gruposMap = {};
        var contasMap = {};

        if (sheet) {
            var dados = sheet.getDataRange().getValues();
            for (var i = 1; i < dados.length; i++) {
                var row = dados[i];
                var idGrupo = String(row[0]).trim();
                var nomeGrupo = row[1];
                var nomeConta = row[3];
                var responsavel = row[4];
                var setor = row[8] || nomeGrupo || "Geral";

                if (idGrupo && idGrupo !== "" && idGrupo !== "undefined") {
                    if (!gruposMap[idGrupo]) {
                        gruposMap[idGrupo] = {
                            id: idGrupo,
                            nome: nomeGrupo || ("Grupo " + idGrupo),
                            resp: responsavel || "Não Identificado",
                            setor: setor
                        };
                    }
                    if (nomeConta) {
                        if (!contasMap[idGrupo]) contasMap[idGrupo] = [];
                        if (contasMap[idGrupo].indexOf(nomeConta) === -1) {
                            contasMap[idGrupo].push(nomeConta);
                        }
                    }
                }
            }
        }

        var gruposArray = Object.values(gruposMap).sort(function (a, b) {
            return (a.nome || "").localeCompare(b.nome || "");
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
                    actDetails: String(row[14] || "")
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

            // Determinar Status (Atrasado, Em Dia, Concluído)
            // Lógica simples: Se ACT_DEC (Decisão) estiver preenchido, considera concluído? Ou adicionar status explícito?
            // Vamos inferir status pelo prazo
            var prazo = row[15] ? new Date(row[15]) : null;
            var hoje = new Date();
            var status = 'DATA_PENDENTE';

            if (prazo) {
                if (prazo < hoje) status = 'ATRASADO';
                else status = 'EM DIA';
            }
            if (row[13] && row[13].length > 2) status = 'CONCLUIDO'; // Se tem decisão de Agir, considera concluído

            output.push({
                id: row[0],
                dataCriacao: row[1],
                mesRef: row[2],
                grupo: row[3],
                conta: row[4],
                responsavel: row[5],
                setor: row[6],
                aiSuggestion: row[7],
                plan: row[8],
                do: row[11],
                study: row[12],
                act: row[14], // Detalhes do Act
                actType: row[13],
                prazo: row[15],
                status: status
            });
        }
        return output;

    } catch (e) { throw new Error("Erro ao listar PDSA: " + e.message); }
}

function salvarRegistroPDSA(form) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaLog = ss.getSheetByName("PDSA_Registros");
        if (!abaLog) {
            abaLog = ss.insertSheet("PDSA_Registros");
            abaLog.appendRow(["ID", "Data", "Mês Ref", "Grupo", "Conta", "Resp", "Setor", "IA", "PLAN", "PLAN_RES", "PLAN_MED", "DO", "STUDY", "ACT_DEC", "ACT_DET", "PRAZO"]);
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
            form.prazo // Nova Coluna 15
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
    if (!contexto || !contexto.conta) return "⚠️ Selecione Grupo/Conta.";
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaDados = ss.getSheetByName("GrupoxMês");
        if (!abaDados) return "⚠️ Aba 'GrupoxMês' não encontrada.";

        var dados = abaDados.getDataRange().getValues();
        var historicoConta = [];
        var valorMesSelecionado = { orçado: 0, realizado: 0 };
        var encontrouMes = false;
        var mesAlvo = contexto.mesRef;
        var contaAlvo = limparTexto(contexto.conta);

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            var contaNomeRow = limparTexto(row[4]); // Coluna E

            if (contaNomeRow === contaAlvo) {
                var planejado = parseFloat(row[5]) || 0;
                var executado = parseFloat(row[6]) || 0;
                var mesPlanilha = row[2];
                var dataNormalizada = normalizarMesPlanilha(mesPlanilha);

                historicoConta.push({ mes: dataNormalizada, orçado: planejado, realizado: executado });

                if (dataNormalizada === mesAlvo) {
                    valorMesSelecionado.orçado = planejado;
                    valorMesSelecionado.realizado = executado;
                    encontrouMes = true;
                }
            }
        }

        if (historicoConta.length === 0) return "⚠️ Dados da conta '" + contexto.conta + "' não encontrados.";
        if (!encontrouMes) return "⚠️ Mês " + mesAlvo + " não localizado.";

        var desvioMes = valorMesSelecionado.realizado - valorMesSelecionado.orçado;
        var percDesvio = valorMesSelecionado.orçado !== 0 ? (desvioMes / valorMesSelecionado.orçado) * 100 : 0;
        var somaReal = historicoConta.reduce((acc, curr) => acc + curr.realizado, 0);
        var mediaHistorica = somaReal / historicoConta.length;

        var prompt = "Atue como um Especialista em Gestão Orçamentária e Parceiro Estratégico. Analise a conta '" + contexto.conta + "' com base nestes números:\\n" +
            "- Performance no mês " + mesAlvo + ": Orçado R$ " + valorMesSelecionado.orçado.toFixed(2) + " vs Realizado R$ " + valorMesSelecionado.realizado.toFixed(2) + "\\n" +
            "- Variação apurada: R$ " + desvioMes.toFixed(2) + " (" + percDesvio.toFixed(1) + "%)\\n" +
            "- Comportamento Médio Histórico: R$ " + mediaHistorica.toFixed(2) + "\\n\\n" +
            "Sua missão é fornecer uma breve análise técnica sobre o comportamento da conta e sugerir 3 ações colaborativas para o PDSA. " +
            "Use um tom educado, respeitoso e propositivo. Evite agressividade.";

        return chamarGemini(prompt);
    } catch (e) { throw new Error("Erro na Análise IA: " + e.message); }
}

function sugerirTextosIA(dadosPlan) {
    if (!dadosPlan.tarefas) return { do: "", study: "", act: "" };
    var prompt = "Sugira textos técnicos para 'Do' (Execução), 'Study' (Estudo) e 'Act' (Ação) do PDSA. " +
        "Retorne APENAS um JSON com as chaves: do, study, act. Baseie-se no Plano:\\n" +
        "- Tarefas: " + dadosPlan.tarefas + "\\n- Resultado: " + dadosPlan.resultado + "\\n- Medidas: " + dadosPlan.medidas;

    var resposta = chamarGemini(prompt);
    try {
        var jsonLimpo = resposta.replace(/\\\`\\\`\\\`json/g, "").replace(/\\\`\\\`\\\`/g, "").trim();
        return JSON.parse(jsonLimpo);
    } catch (e) { throw new Error("Falha ao processar sugestão JSON: " + e.message); }
}

function chamarGemini(prompt) {
    var modelos = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest"];
    var erroDetalhado = "";

    for (var i = 0; i < modelos.length; i++) {
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelos[i] + ":generateContent?key=" + API_KEY;
        var payload = {
            "contents": [{ "parts": [{ "text": prompt }] }],
            "safetySettings": [{ "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }]
        };

        try {
            var response = UrlFetchApp.fetch(url, {
                "method": "post",
                "contentType": "application/json",
                "payload": JSON.stringify(payload),
                "muteHttpExceptions": true
            });

            var json = JSON.parse(response.getContentText());
            if (json.candidates && json.candidates[0].content) {
                return json.candidates[0].content.parts[0].text;
            }
            if (json.error) erroDetalhado = json.error.message;

        } catch (e) { erroDetalhado = e.message; }
    }
    throw new Error("Falha na IA: " + (erroDetalhado || "Erro desconhecido"));
}


// ============================================
// MÓDULO 5: RADAR DE RISCOS (NOVO)
// ============================================

function getDadosRadar(mesRef, filtroGrupo) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName("GrupoxMês");
        if (!sheet) return null;
        var dados = sheet.getDataRange().getValues();

        // Calcular 6 meses para histórico
        var mesesAlvo = [];
        var partes = mesRef.split("-");
        var anoBase = parseInt(partes[0], 10);
        var mesBase = parseInt(partes[1], 10);

        for (var m = 0; m < 6; m++) {
            var mAtual = mesBase - m;
            var aAtual = anoBase;
            if (mAtual <= 0) { mAtual += 12; aAtual -= 1; }
            mesesAlvo.push(aAtual + "-" + (mAtual < 10 ? "0" + mAtual : mAtual));
        }

        var contasDoMes = [];
        var historicoMap = {}; 

        for (var i = 1; i < dados.length; i++) {
            var row = dados[i];
            if (!row[1] && !row[10]) continue;

            var mesRow = normalizarMesPlanilha(row[2]);
            var grupoRow = row[10];
            var idConta = String(row[3]).trim();
            var contaNome = row[4];

            // Calculate varPct manually to ensure reliability
            var plan = Number(row[5]) || 0;
            var exec = Number(row[6]) || 0;
            var varPct = plan > 0 ? ((exec - plan) / plan) * 100 : 0;

            // Strict Group Targeting (Support matching by Name or ID)
            if (filtroGrupo && filtroGrupo !== "TODOS") {
                var filtroLimpo = limparTexto(filtroGrupo);
                var grupoNomeLimpo = limparTexto(grupoRow);
                var grupoIdLimpo = limparTexto(String(row[1]));

                if (grupoNomeLimpo !== filtroLimpo && grupoIdLimpo !== filtroLimpo) {
                    continue; // Skip accounts not in the selected group 
                }
            }

            if (mesRow === mesRef) {
                contasDoMes.push({
                    idConta: idConta, conta: contaNome, plan: plan,
                    exec: exec, varVal: Number(row[7]) || 0,
                    varPct: varPct, grupo: grupoRow
                });
            }
            
            // For historical mapping, we ONLY want historical data for accounts that passed the group filter above.
            // BUGFIX: Use idConta (unique) instead of contaNome (might duplicate across groups if ALL are selected)
            if (mesesAlvo.indexOf(mesRow) !== -1) {
                if (!historicoMap[idConta]) historicoMap[idConta] = [];
                historicoMap[idConta].push({ mes: mesRow, varPct: varPct });
            }
        }

        var radar = { criticas: [], atencao: [], esperado: [], total: contasDoMes.length };

        for (var c = 0; c < contasDoMes.length; c++) {
            var conta = contasDoMes[c];
            conta.historico6Meses = historicoMap[conta.idConta] || [];
            
            // Limit completely out of bounds variations so the CSS bar chart doesn't break conceptually
            conta.historico6Meses.forEach(h => { if(h.varPct > 1000) h.varPct = 1000; });
            conta.historico6Meses.sort(function (a, b) { return a.mes > b.mes ? 1 : -1; });

            // Classificação Lógica dos Desvios (%) - Sync with VarianceView logic
            if (conta.varPct > 20) radar.criticas.push(conta);
            else if (conta.varPct > 10 && conta.varPct <= 20) radar.atencao.push(conta);
            else if (conta.varPct >= -40 && conta.varPct <= 10) radar.esperado.push(conta);
        }

        var sheetPDSA = ss.getSheetByName("PDSA_Registros");
        if (sheetPDSA && radar.esperado.length > 0) {
            var pdsaDados = sheetPDSA.getDataRange().getValues();
            for (var p = 1; p < pdsaDados.length; p++) {
                var pdsaRow = pdsaDados[p];
                var grupoPDSA = limparTexto(pdsaRow[3]);
                var contaPDSA = limparTexto(pdsaRow[4]);

                for (var e = 0; e < radar.esperado.length; e++) {
                    // BUGFIX: Match BOTH Account Name AND Group Name to prevent cross-contamination
                    if (limparTexto(radar.esperado[e].conta) === contaPDSA && limparTexto(radar.esperado[e].grupo) === grupoPDSA) {
                        if (!radar.esperado[e].pdsas) radar.esperado[e].pdsas = [];
                        radar.esperado[e].pdsas.push({
                            mesRef: normalizarMesPlanilha(pdsaRow[2]),
                            plan: pdsaRow[8] || "Sem resumo de Plan",
                            status: (pdsaRow[13] && pdsaRow[13].length > 2) ? 'CONCLUIDO' : 'EM ANDAMENTO'
                        });
                    }
                }
            }
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
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toUpperCase()
        .trim()
        .replace(/\\s+/g, " ");
}

function normalizarMesPlanilha(mesInput) {
    if (!mesInput) return "";
    if (mesInput instanceof Date) {
        var dataSegura = new Date(mesInput.getTime() + (12 * 60 * 60 * 1000));
        return Utilities.formatDate(dataSegura, "GMT", "yyyy-MM");
    }
    var mesStr = String(mesInput).trim();
    if (/^\\d{4}-\\d{2}$/.test(mesStr)) return mesStr;
    var partes = mesStr.split("/");
    if (partes.length >= 2) {
        var mesCod = (partes.length === 3) ? partes[1] : partes[0];
        var ano = (partes.length === 3) ? partes[2] : partes[1];
        mesCod = mesCod.toUpperCase().replace(".", "");
        if (ano.length === 2) ano = "20" + ano;
        var mapa = { "JANEIRO": "01", "FEVEREIRO": "02", "MARÇO": "03", "MARCO": "03", "ABRIL": "04", "MAIO": "05", "JUNHO": "06", "JULHO": "07", "AGOSTO": "08", "SETEMBRO": "09", "OUTUBRO": "10", "NOVEMBRO": "11", "DEZEMBRO": "12", "JAN": "01", "FEV": "02", "MAR": "03", "ABR": "04", "MAI": "05", "JUN": "06", "JUL": "07", "AGO": "08", "SET": "09", "OUT": "10", "NOV": "11", "DEZ": "12" };
        for (var k in mapa) { if (k.length > 2) mapa[limparTexto(k)] = mapa[k]; }
        var mesNum = mapa[limparTexto(mesCod)] || "01";
        return ano + "-" + mesNum;
    }
    return mesStr;
}
