# Google Sheet Headers

## Aba: GrupoxMês (Dados Importados)
Colunas:
1. IdGrupoxmes
2. IdGrupo
3. NomeMês
4. IdConta
5. NomeConta
6. Planejado
7. Executado
8. Variância R$
9. Variância %
10. Status
11. NomeGrupo
12. Variância % do Grupo

## Aba: AI_Auditoria_Automatica (Gerada pelo Script de Auditoria)
Colunas:
1. Data Auditoria
2. Mês Ref
3. Grupo
4. Conta
5. Orçado Mês
6. Executado Mês
7. Desvio %
8. Status Icone (Header original: AI Resumo Visual)
9. Tipo Análise (Header original: AI Tendência)
10. AI Resumo Visual (Header original: AI Análise)
11. AI Fator Chave

## Aba: PDSA_Registros (Gerada pelo Script PDSA)
Colunas:
1. ID
2. Data
3. Mês Ref
4. Grupo
5. Conta
6. Resp
7. Setor
8. IA
9. PLAN
10. PLAN_RES
11. PLAN_MED
12. DO
13. STUDY
14. ACT_DEC
15. ACT_DET

## Aba: Contas Orçamentárias (Referência para Estrutura)
(Inferido do script PDSA)
Colunas principais:
- Col 0 (A): IdGrupo
- Col 1 (B): NomeGrupo
- Col 3 (D): NomeConta
- Col 4 (E): Responsável
- Col 8 (I): Setor (Novo na V21)
