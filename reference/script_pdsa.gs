// ===============================================
// SCRIPT: PDSA WEB APP (BACKEND) - VERSÃO V21
// ===============================================

var SPREADSHEET_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var API_KEY = "AIzaSyA6nmNt7YmVZMLDf-0Q1UHh3w2l4krTjZc";
// Note: This apiKey variable is duplicated in other scripts. We should unify this in the final Code.gs.

function doGet(e) {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('PDSA - Gestão Orçamentária')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDataEstrutura() {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var gruposMap = {};
        var contasMap = {};
        var sheet = ss.getSheetByName("Contas Orçamentárias") || ss.getSheetByName("Contas Orcamentarias") || ss.getSheetByName("Contas");

        if (sheet) {
            var dados = sheet.getDataRange().getValues();
            for (var i = 1; i < dados.length; i++) {
                var row = dados[i];
                var idGrupo = String(row[0]).trim();
                var nomeGrupo = row[1];
                var nomeConta = row[3];
                var responsavel = row[4];
                // AJUSTE V21: Setor agora na Coluna I (índice 8)
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
        var gruposArray = Object.values(gruposMap).sort(function (a, b) { return (a.nome || "").localeCompare(b.nome || ""); });
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
            var mesPlanilha = normalizarMesPlanilha(row[2]);
            var grupoPlanilha = limparTexto(row[3]);
            var contaPlanilha = limparTexto(row[4]);

            var alvoGrupo = limparTexto(grupo);
            var alvoConta = limparTexto(conta);
            var alvoMes = String(mesRef).trim();

            if (grupoPlanilha === alvoGrupo && contaPlanilha === alvoConta && mesPlanilha === alvoMes) {
                return {
                    id: row[0], mesRef: mesPlanilha, grupo: row[3], conta: row[4],
                    respName: row[5], respSetor: row[6], aiSuggestion: String(row[7] || ""),
                    planTarefas: String(row[8] || ""), planResult: String(row[9] || ""),
                    planMedidas: String(row[10] || ""), doDesc: String(row[11] || ""),
                    studyDesc: String(row[12] || ""), actType: String(row[13] || ""),
                    actDetails: String(row[14] || "")
                };
            }
        }
        return null;
    } catch (e) { throw new Error("Erro ao buscar registro: " + e.message); }
}

function gerarAnaliseIA(contexto) {
    if (!contexto || !contexto.conta) return "⚠️ Selecione Grupo/Conta.";
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var abaDados = ss.getSheetByName("GrupoxMês") || ss.getSheetByName("GrupoxMes");
      if (!abaDados) return "⚠️ Aba 'GrupoxMês' não encontrada.";
      var dados = abaDados.getDataRange().getValues();
      var historicoConta = [];
      var valorMesSelecionado = { orçado: 0, realizado: 0 };
      var encontrouMes = false;
      var mesAlvo = contexto.mesRef;

      var contaAlvo = limparTexto(contexto.conta);

      for (var i = 1; i < dados.length; i++) {
          var row = dados[i];
          var contaNomeRow = limparTexto(row[4]);

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

      if (historicoConta.length === 0) return "⚠️ Dados da conta '" + contexto.conta + "' não encontrados em 'GrupoxMês'.";
      if (!encontrouMes) return "⚠️ Mês " + mesAlvo + " não localizado para '" + contexto.conta + "'.";

      var desvioMes = valorMesSelecionado.realizado - valorMesSelecionado.orçado;
      var percDesvio = valorMesSelecionado.orçado !== 0 ? (desvioMes / valorMesSelecionado.orçado) * 100 : 0;
      var somaReal = historicoConta.reduce((acc, curr) => acc + curr.realizado, 0);
      var mediaHistorica = somaReal / historicoConta.length;

      var prompt = "Atue como um Especialista em Gestão Orçamentária e Parceiro Estratégico. Analise a conta '" + contexto.conta + "' com base nestes números:\n" +
          "- Performance no mês " + mesAlvo + ": Orçado R$ " + valorMesSelecionado.orçado.toFixed(2) + " vs Realizado R$ " + valorMesSelecionado.realizado.toFixed(2) + "\n" +
          "- Variação apurada: R$ " + desvioMes.toFixed(2) + " (" + percDesvio.toFixed(1) + "%)\n" +
          "- Comportamento Médio Histórico: R$ " + mediaHistorica.toFixed(2) + "\n\n" +
          "Sua missão é fornecer uma breve análise técnica sobre o comportamento da conta e sugerir 3 ações colaborativas para o PDSA. " +
          "Use um tom educado, respeitoso e propositivo. Evite agressividade.";

      return chamarGemini(prompt);
    } catch(e) { throw new Error("Erro na Análise IA: " + e.message); }
}

function sugerirTextosIA(dadosPlan) {
    if (!dadosPlan.tarefas) return { do: "", study: "", act: "" };
    var prompt = "Sugira textos técnicos para 'Do' (Execução), 'Study' (Estudo) e 'Act' (Ação) do PDSA. " +
        "Retorne APENAS um JSON com as chaves: do, study, act. Baseie-se no Plano:\n" +
        "- Tarefas: " + dadosPlan.tarefas + "\n- Resultado: " + dadosPlan.resultado + "\n- Medidas: " + dadosPlan.medidas;
    var resposta = chamarGemini(prompt);
    try {
        var jsonLimpo = resposta.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonLimpo);
    } catch (e) { throw new Error("Falha ao processar sugestão: " + e.message); }
}

function chamarGemini(prompt) {
    var modelos = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest"];
    var erroDetalhado = "";
    for (var i = 0; i < modelos.length; i++) {
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelos[i] + ":generateContent?key=" + API_KEY;
        var payload = { "contents": [{ "parts": [{ "text": prompt }] }], "safetySettings": [{ "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }] };
        try {
            var response = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
            var json = JSON.parse(response.getContentText());
            if (json.candidates && json.candidates[0].content) return json.candidates[0].content.parts[0].text;
            if (json.error) erroDetalhado = json.error.message;
        } catch (e) { erroDetalhado = e.message; }
    }
    throw new Error("Falha na IA: " + (erroDetalhado || "Erro desconhecido"));
}

function limparTexto(txt) {
    if (!txt) return "";
    return String(txt)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
        .replace(/\s+/g, " ");
}

function normalizarMesPlanilha(mesInput) {
    if (!mesInput) return "";
    if (mesInput instanceof Date) {
        var dataSegura = new Date(mesInput.getTime() + (12 * 60 * 60 * 1000));
        return Utilities.formatDate(dataSegura, "GMT", "yyyy-MM");
    }
    var mesStr = String(mesInput).trim();
    if (/^\d{4}-\d{2}$/.test(mesStr)) return mesStr;
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

function salvarRegistroPDSA(form) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var abaLog = ss.getSheetByName("PDSA_Registros") || ss.insertSheet("PDSA_Registros");
        if (abaLog.getLastRow() == 0) abaLog.appendRow(["ID", "Data", "Mês Ref", "Grupo", "Conta", "Resp", "Setor", "IA", "PLAN", "PLAN_RES", "PLAN_MED", "DO", "STUDY", "ACT_DEC", "ACT_DET"]);
        
        var id = form.id || Utilities.getUuid();
        var nl = [id, new Date(), form.mesRef, form.grupo, form.conta, form.respName, form.respSetor, form.aiSuggestion, form.planTarefas, form.planResult, form.planMedidas, form.doDesc, form.studyDesc, form.actType, form.actDetails];
        
        if (form.id) {
            var ids = abaLog.getRange(1, 1, abaLog.getLastRow(), 1).getValues();
            for (var i = 1; i < ids.length; i++) { if (ids[i][0] == form.id) { abaLog.getRange(i + 1, 1, nl.length).setValues([nl]); return "Editado com Sucesso"; } }
        }
        abaLog.appendRow(nl); return "Sucesso";
    } catch (e) { throw new Error("Erro ao salvar: " + e.message); }
}
