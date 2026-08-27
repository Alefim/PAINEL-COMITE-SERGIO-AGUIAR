# Painel Sérgio Aguiar 2026
Dashboard interativo por município, local e seção, com fontes independentes para a planilha interna e o TSE.
## Configuração
1. Publique a aba `DADOS INPUT` como CSV.
2. Copie `.env.example` para `.env.local`.
3. Preencha `SHEET_CSV_URL`; confirme a coluna em `SHEET_VOTES_COLUMN_INDEX` (A=0, E=4).
4. No dia da eleição, informe o endpoint oficial em `TSE_RESULTS_URL`.
O leitor reconhece cabeçalhos como SEÇÃO, LOCAL DE VOTAÇÃO, MUNICÍPIO, APTOS e uma coluna contendo SÉRGIO.
Desenvolvido por Álefim Oliveira.
