// ============================================
// SCRIPT: AUDITORIA AUTOMÁTICA COM IA (HIBRODOC - V3.0)
// ============================================
// 🟢 CONFIGURAÇÃO
var PLANILHA_DB_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var ABA_DADOS_ORCAMENTO = "GrupoxMês";
var ABA_AUDITORIA = "AI_Auditoria_Automatica";
// 🔑 API Key Atualizada
var GEMINI_API_KEY_BATCH = "AIzaSyA6nmNt7YmVZMLDf-0Q1UHh3w2l4krTjZc"; 
// 📈 Novos Critérios de Auditoria
var RANGE_CRITICO = 0.20;       // > 20%
var RANGE_ATENCAO_MIN = 0.10;   // 10% a 20%
var RANGE_META_MAX = 0.10;      // -20% a 10%
var RANGE_META_MIN = -0.20;
var RANGE_SUBUTILIZADO = -0.40; // < -40%
function setupAuditoriaDB() {
  var ss = SpreadsheetApp.openById(PLANILHA_DB_ID);
  var sheet = ss.getSheetByName(ABA_AUDITORIA);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_AUDITORIA);
    sheet.appendRow([
      "Data Auditoria", "Mês Ref", "Grupo", "Conta", 
      "Orçado Mês", "Executado Mês", "Desvio %", 
      "Status Icone", "Tipo Análise", "AI Resumo Visual", "AI Fator Chave"
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:K1").setFontWeight("bold").setBackground("#cfe2f3");
  }
}
function rodarAuditoriaEmLote() {
  var startTime = new Date();
  var ss = SpreadsheetApp.openById(PLANILHA_DB_ID);
  var sheetDados = ss.getSheetByName(ABA_DADOS_ORCAMENTO);
  var dados = sheetDados.getDataRange().getValues();
  
  var sheetAudit = ss.getSheetByName(ABA_AUDITORIA);
  if (!sheetAudit) { setupAuditoriaDB(); sheetAudit = ss.getSheetByName(ABA_AUDITORIA); }
  // 0. Pegar chaves já auditadas (Apenas Sucessos!)
  var auditados = {};
  var dadosAudit = sheetAudit.getDataRange().getValues();
  var linhasParaDeletar = [];
  for (var a = dadosAudit.length - 1; a >= 1; a--) {
    var resumo = String(dadosAudit[a][9] || "");
    var chaveAudit = dadosAudit[a][1] + "||" + dadosAudit[a][2] + "||" + dadosAudit[a][3];
    
    // Se for erro, guardamos para deletar e limpar a tabela
    if (resumo.indexOf("Erro") > -1 || resumo.trim() === "") {
      linhasParaDeletar.push(a + 1);
    } else {
      auditados[chaveAudit] = true;
    }
  }
  // Limpa os erros do passado para o painel ficar limpo
  linhasParaDeletar.forEach(function(row) {
    sheetAudit.deleteRow(row);
  });
  // 1. Organizar dados
  var mapaContas = {};
  for (var i = 1; i < dados.length; i++) {
    var grupo = dados[i][10];
    var conta = dados[i][4];
    var mes = dados[i][2];
    var plan = parseFloat(dados[i][5]) || 0;
    var exec = parseFloat(dados[i][6]) || 0;
    
    if (!grupo || !conta) continue;
    var chave = grupo + "||" + conta;
    if (!mapaContas[chave]) {
      mapaContas[chave] = { grupo: grupo, conta: conta, historico: [] };
    }
    mapaContas[chave].historico.push({
      mes: mes, plan: plan, exec: exec,
      varPct: (plan > 0 ? (exec/plan)-1 : 0)
    });
  }
  // 2. Classificar Contas com as Novas Regras
  var loteParaProcessar = [];
  
  for (var k in mapaContas) {
    var c = mapaContas[k];
    var ultimo = c.historico[c.historico.length - 1]; 
    if (!ultimo) continue;
    var minhaChave = ultimo.mes + "||" + c.grupo + "||" + c.conta;
    if (auditados[minhaChave]) continue; 
    var desvioAbs = ultimo.exec - ultimo.plan;
    var desvioPct = 0;
    
    if (ultimo.plan > 0) {
      desvioPct = (desvioAbs / ultimo.plan);
    } else if (ultimo.exec > 0) {
      desvioPct = 1.0; // Caso de gasto não previsto: Tratado como 100% de estouro
    }
    
    // Lógica v4.0
    if (desvioPct > RANGE_CRITICO) {
      c.tipo = "CRÍTICO";
      c.icone = "🚨";
      loteParaProcessar.push(c);
    } else if (desvioPct >= RANGE_ATENCAO_MIN && desvioPct <= RANGE_CRITICO) {
      c.tipo = "EM ATENÇÃO";
      c.icone = "⚠️";
      loteParaProcessar.push(c);
    } else if (desvioPct >= RANGE_META_MIN && desvioPct <= RANGE_META_MAX) {
      c.tipo = "DENTRO DA META";
      c.icone = "👏";
      loteParaProcessar.push(c);
    } else if (desvioPct < RANGE_SUBUTILIZADO) {
      c.tipo = "SUBUTILIZADO";
      c.icone = "📉";
      loteParaProcessar.push(c);
    }
  }
  Logger.log("🎯 Contas pendentes encontradas: " + loteParaProcessar.length);
  // 4. Auditoria IA
  var novosRegistros = [];
  for (var j = 0; j < loteParaProcessar.length; j++) {
    var currentTime = new Date();
    if (currentTime - startTime > 5 * 60 * 1000) {
      Logger.log("⏱️ Limite de tempo atingido (5 min). Salvando progresso...");
      break;
    }
    var item = loteParaProcessar[j];
    try {
      Logger.log("🤖 [" + (j+1) + "/" + loteParaProcessar.length + "] Auditando: " + item.conta);
      
      var analise = chamarGeminiHibrido(item, item.historico);
      var ultimo = item.historico[item.historico.length-1];
      
      novosRegistros.push([
        new Date(), ultimo.mes, item.grupo, item.conta,
        ultimo.plan, ultimo.exec, analise.desvioDisplay,
        item.icone, item.tipo, analise.resumo, analise.fator
      ]);
      
      Utilities.sleep(15000); 
      
    } catch (e) {
      Logger.log("❌ Erro em " + item.conta + ": " + e.message);
    }
  }
  if (novosRegistros.length > 0) {
    sheetAudit.getRange(sheetAudit.getLastRow()+1, 1, novosRegistros.length, 11).setValues(novosRegistros);
    Logger.log("✅ Finalizado! " + novosRegistros.length + " salvas.");
  }
}
function chamarGeminiHibrido(contaObj, historico) {
  var ultimo = historico[historico.length - 1];
  
  // Ajuste do Display de Desvio para Plan=0
  var desvioDisplay = "";
  if (ultimo.plan > 0) {
    desvioDisplay = (((ultimo.exec/ultimo.plan)-1)*100).toFixed(1) + "%";
  } else if (ultimo.exec > 0) {
    desvioDisplay = "100.0% (Extra)";
  } else {
    desvioDisplay = "0.0%";
  }
  var txtHist = historico.map(h => 
    "- " + h.mes + ": Plan " + Math.round(h.plan) + " vs Exec " + Math.round(h.exec)
  ).join("\n");
  var prompt = 
    "Você é um Consultor Orçamentário Sênior. Sua comunicação deve ser estritamente corporativa, técnica e colaborativa.\n\n" +
    "OBJETIVO: Realizar uma análise técnica orçamentária do ÚLTIMO MÊS registrado em relação à meta orçada e ao comportamento histórico do período.\n\n" +
    "DADOS DA CONTA:\n" +
    "- Conta: " + contaObj.conta + " (" + contaObj.grupo + ")\n" +
    "- Status Atual: " + contaObj.tipo + " (Desvio: " + desvioDisplay + ")\n" +
    "- Valores do Mês: Orçado R$" + ultimo.plan.toFixed(2) + " | Executado R$" + ultimo.exec.toFixed(2) + "\n" +
    "- Histórico do Período:\n" + txtHist + "\n\n" +
    "REQUISITOS DA RESPOSTA (JSON RAW):\n" +
    "1. 'resumo': Forneça uma análise técnica concisa (máx. 160 caracteres) explicando o desempenho do último mês frente ao histórico e à meta.\n" +
    "2. 'fator': Identifique a causa raiz técnica (ex: 'Sazonalidade Histórica', 'Desvio Operacional', 'Eficiência Executiva', 'Subutilização de Recursos').\n\n" +
    "Retorne apenas o JSON: { \"resumo\": \"...\", \"fator\": \"...\" }";
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + GEMINI_API_KEY_BATCH;
  
  var options = {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  };
  var maxTentativas = 3;
  for (var tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var status = response.getResponseCode();
      if (status === 200) {
        var text = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
        var cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        var i = cleanText.indexOf("{"), f = cleanText.lastIndexOf("}");
        if (i !== -1 && f !== -1) cleanText = cleanText.substring(i, f+1);
        
        var obj = {};
        try { obj = JSON.parse(cleanText); } 
        catch (e) {
           var resMatch = text.match(/"resumo"\s*:\s*"([^"]+)"/);
           var fatMatch = text.match(/"fator"\s*:\s*"([^"]+)"/);
           obj.resumo = resMatch ? resMatch[1] : text.substring(0, 50);
           obj.fator = fatMatch ? fatMatch[1] : "-";
        }
        return { desvioDisplay: desvioDisplay, resumo: obj.resumo, fator: obj.fator };
      } else if (status === 429 || status === 503) {
        if (tentativa < maxTentativas) { Utilities.sleep(20000); continue; }
      }
      return { desvioDisplay: desvioDisplay, resumo: "Erro " + status, fator: "API" };
    } catch (e) {
      if (tentativa < maxTentativas) { Utilities.sleep(20000); }
      else { return { desvioDisplay: desvioDisplay, resumo: "Erro Geral", fator: "Falha" }; }
    }
  }
}
// === FUNÇÃO EXTRA PARA DESCOBRIR O NOME CORRETO DO MODELO ===
function listarModelosDisponiveis() {
  var url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + GEMINI_API_KEY_BATCH;
  try {
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());
    Logger.log("📋 MODELOS DISPONÍVEIS NA SUA CONTA:");
    if (json.models) {
      json.models.forEach(function(m) {
        if (m.name.indexOf("gemini") > -1) Logger.log(m.name);
      });
    } else {
      Logger.log("Nenhum modelo listado. Resposta: " + response.getContentText());
    }
  } catch (e) {
    Logger.log("❌ Erro ao listar: " + e.message);
  }
}
