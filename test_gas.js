const fs = require('fs');

const mockConsolidado = [
    ["Grupo | Conta", "dsc_conta", "PARCELA", "AF GERADAS", "SALDO", "IDO", "MÊS"],
    ["HOTELARIA", "LAVANDERIA / ROUPARIA", "100", "90", "10", "10%", "2025-02"],
    ["HOTELARIA", "SERVIÇO DE JARDINAGEM", "200", "210", "-10", "-5%", "2025-02"],
    ["HOTELARIA", "incirenção residuos", "300", "300", "0", "0%", "2025-02"],
    ["NÃO IDENTIFICADO", "limpeza e conservação", "400", "400", "0", "0%", "2025-02"],
    ["INFRAESTRUTURA", "SERVIÇO DE JARDINAGEM", "500", "500", "0", "0%", "2025-01"]
];

const mockEstrutura = [
    ["id", "Grupo", "idConta", "Conta"],
    ["1", "HOTELARIA", "1.1", "LAVANDERIA / ROUPARIA"],
    ["1", "HOTELARIA", "1.2", "incirenção residuos"],
    ["1", "HOTELARIA", "1.3", "limpeza e conservação"],
    ["2", "INFRAESTRUTURA", "2.1", "SERVIÇO DE JARDINAGEM"],
];

function limparTexto(txt) {
    if (!txt) return "";
    return String(txt).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

function normalizarMesPlanilha(val) {
    return String(val).trim();
}

function parseNumberBR(val) {
    return parseFloat(val) || 0;
}

function processData() {
    // Simulate mapping from structure
    var mapaGruposNomes = {}; 
    var mapaContasNomes = {}; 
    var mapaContaGrupo = {}; // Maps Account to its official Group

    for(var e=1; e < mockEstrutura.length; e++) {
        var eid = String(mockEstrutura[e][0]).trim();
        var enome = limparTexto(mockEstrutura[e][1]);
        var grupoOficialNome = String(mockEstrutura[e][1]).toUpperCase().trim(); 
        
        if(eid && enome) mapaGruposNomes[enome] = eid;

        var contaNativa = mockEstrutura[e][3];
        if (contaNativa) {
            var contaLimpa = limparTexto(contaNativa);
            mapaContasNomes[contaLimpa] = contaNativa;
            mapaContaGrupo[contaLimpa] = grupoOficialNome;
        }
    }

    var output = [];
    var agrupamentosMap = {};

    var headerRow = mockConsolidado[0];
    var COL_GRUPO_CONTA = 0;
    var COL_DSC_CONTA   = 1;
    var COL_PARCELA     = 2;
    var COL_AF_GERADAS  = 3;
    var COL_SALDO       = 4;
    var COL_IDO         = 5;
    var COL_MES         = 6;

    for (var i = 1; i < mockConsolidado.length; i++) {
        var row = mockConsolidado[i];
        
        var mesCru = row[COL_MES];
        var nomeConta = String(row[COL_DSC_CONTA] || "").trim();
        if (!mesCru || !nomeConta) continue;
        
        var strGrupoConta = String(row[COL_GRUPO_CONTA] || "");
        var partesGrupo = strGrupoConta.split(",");
        var nomeGrupoRaw = partesGrupo.length > 1 ? partesGrupo[0].toUpperCase().trim() : strGrupoConta.toUpperCase().trim();
        if (nomeGrupoRaw === "") nomeGrupoRaw = "NÃO IDENTIFICADO";
        
        var mesRow = mesCru;
        var nomeContaLimpo = limparTexto(nomeConta);

        // HERE IS THE FIX: The user wants to OVERRIDE the group using the one defined in the Structure sheet!
        var grupoCorreto = mapaContaGrupo[nomeContaLimpo] || nomeGrupoRaw;
        var nomeGrupoLimpo = limparTexto(grupoCorreto);
        
        var idGrupoReal = "GRP_" + nomeGrupoLimpo;
        var idContaReal = idGrupoReal + "_CTA_" + nomeContaLimpo; 
        
        var contaOficial = mapaContasNomes[nomeContaLimpo] || nomeConta;
        var grupoOficial = grupoCorreto;
        
        var planNum = parseNumberBR(row[COL_PARCELA]);
        var execNum = parseNumberBR(row[COL_AF_GERADAS]);
        
        var chaveAgrupamento = idContaReal + "_" + mesRow;

        if (!agrupamentosMap[chaveAgrupamento]) {
            agrupamentosMap[chaveAgrupamento] = {
                idConta: idContaReal,
                conta: contaOficial, 
                grupo: grupoOficial,
            };
        }
    }

    return Object.values(agrupamentosMap);
}

console.log(processData());
