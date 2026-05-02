const fs = require('fs');

fetch('https://docs.google.com/spreadsheets/d/112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA/gviz/tq?tqx=out:csv&gid=1329594316')
  .then(res => res.text())
  .then(text => {
    // 1. Parsing simplório de CSV
    const lines = text.split('\n');
    const records = [];
    
    // pulando cabeçalho
    for(let i=1; i<lines.length; i++){
       let row = lines[i];
       if(!row) continue;
       
       const cells = [];
       let inQuote = false;
       let currentCell = '';
       for(let c=0; c<row.length; c++){
          const char = row[c];
          if(char === '"') {
              inQuote = !inQuote;
          } else if(char === ',' && !inQuote) {
              cells.push(currentCell.replace(/^"|"$/g, ''));
              currentCell = '';
          } else {
              currentCell += char;
          }
       }
       cells.push(currentCell.replace(/^"|"$/g, ''));
       records.push(cells);
    }
    
    function limparTexto(texto) {
        if (!texto) return "";
        return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    }
    
    function normalizarMesPlanilha(mesCod) {
        if (!mesCod) return null;
        var mesStr = String(mesCod).trim().toUpperCase();
        var numMatch = mesStr.match(/^(\d{2})\/(\d{4})$/);
        if (numMatch) return numMatch[2] + "-" + numMatch[1];
        return mesStr;
    }
    
    function parseNumberBR(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        var str = String(val).trim();
        if (str === '-' || str === '--') return 0;
        var isNegative = (str.indexOf('(') !== -1 && str.indexOf(')') !== -1) || str.indexOf('-') === 0;
        str = str.replace(/[^-0-9,.]/g, '');
        var lastComma = str.lastIndexOf(',');
        var lastDot = str.lastIndexOf('.');
        if (lastComma > lastDot) {
            str = str.replace(/\./g, '');
            str = str.replace(',', '.');
        } else if (lastDot > lastComma) {
            if (lastComma === -1) {
                var numDots = (str.match(/\./g) || []).length;
                if (numDots > 1) {
                    str = str.replace(/\./g, ''); 
                } else {
                    var split = str.split('.');
                    if (split[1] && split[1].length === 3) {
                        str = str.replace(/\./g, '');
                    }
                }
            } else {
                str = str.replace(/,/g, '');
            }
        }
        var num = parseFloat(str);
        if(isNaN(num)) return 0;
        return isNegative && num > 0 ? -num : num;
    }

    // SIMULAÇÃO DO GET DADOS FINANCEIROS
    var output = [];
    var agrupamentosMap = {};
    
    var COL_GRUPO_CONTA = 0;
    var COL_DSC_CONTA   = 1;
    var COL_PARCELA     = 2;
    var COL_AF_GERADAS  = 3;
    var COL_SALDO       = 4;
    var COL_IDO         = 5;
    var COL_MES         = 14;
    
    // Simula `filtroMes` como "2026-01"
    var filtroMes = "2026-01";
    
    for (var i = 0; i < records.length; i++) {
        var row = records[i];

        var mesCru = row[COL_MES];
        if (!mesCru || !row[COL_DSC_CONTA]) continue;

        var mesRow = normalizarMesPlanilha(mesCru);
        if (filtroMes && mesRow != filtroMes) continue;
        
        var strGrupoConta = String(row[COL_GRUPO_CONTA] || "");
        var partesGrupo = strGrupoConta.split(",");
        var nomeGrupoRaw = partesGrupo.length > 1 ? partesGrupo[0] : strGrupoConta;
        nomeGrupoRaw = nomeGrupoRaw.replace(/[\u00A0\s]+/g, " ").trim() || "Não Identificado";
        var nomeGrupoLimpo = limparTexto(nomeGrupoRaw);

        var nomeConta = String(row[COL_DSC_CONTA]).trim();
        var nomeContaLimpo = limparTexto(nomeConta);
        
        var idGrupoOficial = nomeGrupoLimpo;
        var contaOficial = nomeConta;
        
        var planNum = parseNumberBR(row[COL_PARCELA]);
        var execNum = parseNumberBR(row[COL_AF_GERADAS]);
        
        var chaveAgrupamento = idGrupoOficial + "_" + contaOficial + "_" + mesRow;

        if (!agrupamentosMap[chaveAgrupamento]) {
            agrupamentosMap[chaveAgrupamento] = {
                id: idGrupoOficial + "_" + nomeContaLimpo,
                idGrupo: idGrupoOficial, 
                mes: mesRow, 
                idConta: idGrupoOficial + "_" + nomeContaLimpo,
                conta: contaOficial, 
                plan: planNum,
                exec: execNum,
                grupo: nomeGrupoRaw,
            };
        } else {
            agrupamentosMap[chaveAgrupamento].plan += planNum;
            agrupamentosMap[chaveAgrupamento].exec += execNum;
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
    
    console.log("=== OUTPUT FINAL DO BACKEND PARA 2026-01 (HOTELARIA) ===");
    console.log(output.filter(o => o.grupo === 'HOTELARIA'));

  })
  .catch(e => console.error(e));
