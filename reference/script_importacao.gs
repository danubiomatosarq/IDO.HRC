// ============================================
// SCRIPT: IMPORTADOR DE ORÇAMENTO (v28 - CORREÇÃO VARIÂNCIA MENSAL)
// ============================================
var PASTA_ORC_ID = "1xFpkM_K9gaBssVZks55NZVANnZYdhcBG";
var PLANILHA_DB_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
var NOME_ABA_DESTINO = "GrupoxMês";

function importarOrcamentoDoDrive() {
    try {
        Logger.log("🔄 INICIANDO IMPORTAÇÃO v28...");
        var ssDB = SpreadsheetApp.openById(PLANILHA_DB_ID);
        var sheetDestino = ssDB.getSheetByName(NOME_ABA_DESTINO);
        
        if (!sheetDestino) {
            Logger.log("❌ ABA DESTINO NÃO ENCONTRADA");
            return;
        }

        // Limpa a aba destino (exceto cabeçalho)
        var lastRow = sheetDestino.getLastRow();
        if (lastRow > 1) {
            sheetDestino.getRange(2, 1, lastRow - 1, 12).clearContent();
        }

        var pasta = DriveApp.getFolderById(PASTA_ORC_ID);
        var arquivos = pasta.getFilesByType(MimeType.GOOGLE_SHEETS);
        var totalLinhas = 0;

        while (arquivos.hasNext()) {
            var arquivo = arquivos.next();
            var ssOrigem = SpreadsheetApp.openById(arquivo.getId());
            var dados = ssOrigem.getActiveSheet().getDataRange().getValues();

            var linhasInseridas = processarArquivoOrcamento(dados, sheetDestino);
            totalLinhas += linhasInseridas;
        }

        SpreadsheetApp.flush();
        Logger.log("\n🎉 CONCLUÍDO! Total Linhas: " + totalLinhas);
    } catch (e) {
        Logger.log("❌ ERRO GERAL: " + e.message);
    }
}

function processarArquivoOrcamento(dados, sheetDestino) {
    // 1. PRE-SCAN: Identificar a Data de Corte (Baseado em preenchimento da célula)
    var maxPeriodoComDados = 0;
    var periodoScan = 0;

    for (var j = 0; j < dados.length; j++) {
        var l = dados[j];
        var c0 = String(l[0] || "").trim();

        if (c0.indexOf("PARCELA:") >= 0) {
            var match = c0.match(/([A-Z]{3}\/\d{4})/i);
            if (match) {
                var mSigla = match[0].split("/")[0].toUpperCase();
                var mAno = parseInt(match[0].split("/")[1]);
                periodoScan = (mAno * 100) + numeroDoMes(mSigla);
            }
            continue;
        }

        if (c0.indexOf("Conta:") === 0) {
            var textoExecutado = String(l[2] || "").trim();
            if (textoExecutado !== "" && textoExecutado !== "-") {
                if (periodoScan > maxPeriodoComDados) maxPeriodoComDados = periodoScan;
            }
        }
    }

    // 2. EXTRAÇÃO DE DADOS PARA BUFFER
    var linhasBuffer = [];
    var mesAtualNome = null;
    var idPeriodoAtual = null;
    var idGrupoAtual = null;
    var nomeGrupoAtual = null;

    for (var i = 0; i < dados.length; i++) {
        var linha = dados[i];
        var col0 = String(linha[0] || "").trim();
        if (!col0) continue;

        if (col0.indexOf("PARCELA:") >= 0) {
            var matchMes = col0.match(/([A-Z]{3}\/\d{4})/i);
            if (matchMes) {
                var mesAno = matchMes[0].toUpperCase();
                var mesSigla = mesAno.split("/")[0];
                var ano = parseInt(mesAno.split("/")[1]);
                mesAtualNome = traduzirMes(mesSigla) + "/" + ano;
                idPeriodoAtual = (ano * 100) + numeroDoMes(mesSigla);
            }
            continue;
        }

        // Filtro de Data de Corte
        if (idPeriodoAtual > maxPeriodoComDados && maxPeriodoComDados > 0) continue;

        var matchGrupo = col0.match(/^(\d+)\s*-\s*(.+)/);
        if (matchGrupo && col0.indexOf("Conta:") === -1) {
            idGrupoAtual = matchGrupo[1].trim();
            nomeGrupoAtual = matchGrupo[2].trim();
            continue;
        }

        var matchConta = col0.match(/^Conta:\s*(\d+)\s*-\s*(.+)/i);
        if (matchConta && idPeriodoAtual) {
            var valPlanejado = pegarNumeroPuro(linha[1]);
            var valExecutado = pegarNumeroPuro(linha[2]);
            
            if (valPlanejado === 0 && valExecutado === 0) continue;

            linhasBuffer.push({
                uuid: Utilities.getUuid(),
                idGrupo: idGrupoAtual,
                mes: mesAtualNome, // Guardamos o mês aqui para o agrupamento
                idConta: matchConta[1].trim(),
                nomeConta: matchConta[2].trim(),
                plan: valPlanejado,
                exec: valExecutado,
                varRs: pegarNumeroPuro(linha[3]),
                varPct: pegarNumeroPuro(linha[4]) / 100,
                status: "Importado",
                nomeGrupo: nomeGrupoAtual
            });
        }
    }

    // 3. PÓS-PROCESSAMENTO: Agrupamento por Grupo E por Mês
    // Isso garante que a variância do grupo seja calculada mês a mês
    var gruposPorMes = {};
    
    linhasBuffer.forEach(function (l) {
        var chave = l.idGrupo + "|" + l.mes; // Chave composta essencial
        if (!gruposPorMes[chave]) {
            gruposPorMes[chave] = { plan: 0, exec: 0, linhas: [] };
        }
        gruposPorMes[chave].plan += l.plan;
        gruposPorMes[chave].exec += l.exec;
        gruposPorMes[chave].linhas.push(l);
    });

    var linhasFinais = [];
    for (var k in gruposPorMes) {
        var g = gruposPorMes[k];
        // Variância calculada apenas sobre o total do grupo naquele mês específico
        var varianciaGrupoNoMes = g.plan > 0 ? (g.plan - g.exec) / g.plan : (g.exec > 0 ? -1.0 : 0);

        g.linhas.forEach(function (l) {
            linhasFinais.push([
                l.uuid, l.idGrupo, l.mes, l.idConta, l.nomeConta,
                l.plan, l.exec, l.varRs, l.varPct, l.status, l.nomeGrupo,
                varianciaGrupoNoMes // <--- Coluna corrigida
            ]);
        });
    }

    if (linhasFinais.length > 0) {
        sheetDestino.getRange(sheetDestino.getLastRow() + 1, 1, linhasFinais.length, 12).setValues(linhasFinais);
    }
    return linhasFinais.length;
}

// --- FUNÇÕES AUXILIARES ---

function pegarNumeroPuro(v) {
    if (typeof v === "number") return v;
    if (!v || v === "-") return 0;
    var limpo = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
}

function traduzirMes(sigla) {
    var meses = {
        "JAN": "Janeiro", "FEV": "Fevereiro", "MAR": "Março", "ABR": "Abril",
        "MAI": "Maio", "JUN": "Junho", "JUL": "Julho", "AGO": "Agosto",
        "SET": "Setembro", "OUT": "Outubro", "NOV": "Novembro", "DEZ": "Dezembro"
    };
    return meses[sigla.toUpperCase()] || sigla;
}

function numeroDoMes(sigla) {
    var meses = {
        "JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6,
        "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12
    };
    return meses[sigla.toUpperCase()] || 0;
}
