# Painel de Planilhas — Comitê Sérgio Aguiar

Dashboard administrativo para acompanhar os dados da pesquisa eleitoral de 2026 por candidato, bairro e rua. O painel lê automaticamente a aba `RESUMO POR RUA` de uma planilha Google Sheets.

## Funcionalidades

- login administrativo com sessão protegida por cookie HTTP-only;
- filtros por cargo, candidato e bairro/área;
- ranking das ruas mais votadas;
- comparação de votos entre candidatos;
- totais por cargo e candidato;
- atualização automática a cada 60 segundos;
- layout responsivo para computador, tablet e celular.

Os cargos exibidos atualmente são:

- Deputado Estadual;
- Deputado Federal;
- Governador.

## Estrutura esperada da planilha

O sistema consulta a aba `RESUMO POR RUA`. A primeira linha precisa conter, no mínimo:

```text
BAIRRO/ÁREA | RUA/LOCALIDADE | SÉRGIO | ROMEU | EUVALDETE | OUTROS EST. |
INDECISOS EST. | ROGER | TAYNA | OUTROS FED. | INDECISOS FED. | ELMANO |
CIRO | OUTROS GOV. | INDECISOS GOV.
```

A planilha deve permitir leitura por link para que o servidor consiga consultar os valores consolidados. Nenhuma escrita é realizada pelo painel.

## Configuração local

Requisitos: Node.js 22.13 ou superior.

1. Copie `.env.example` para `.env.local`.
2. Preencha as variáveis:

```env
DASHBOARD_USER=Administrador
DASHBOARD_PASSWORD=sua_senha
SESSION_TOKEN=um_token_aleatorio_longo
GOOGLE_SHEET_ID=id_da_planilha
```

3. Instale e execute:

```bash
npm install
npm run dev
```

O endereço local será mostrado no terminal.

## Executar dentro do GitHub Codespaces

1. Abra o repositório no GitHub.
2. Clique em **Code → Codespaces → Create codespace on main**.
3. Aguarde a instalação automática das dependências.
4. No terminal do Codespaces, execute `npm run dev`.
5. Quando a porta 5173 aparecer, clique em **Open in Browser**.

Antes de criar o Codespace, cadastre estes segredos em **Settings → Secrets and variables → Codespaces**:

- `DASHBOARD_PASSWORD` — senha do painel;
- `SESSION_TOKEN` — uma sequência aleatória longa.

O usuário `Administrador` e o identificador da planilha já são configurados automaticamente no ambiente do Codespaces.

## Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `DASHBOARD_USER` | Usuário autorizado no login |
| `DASHBOARD_PASSWORD` | Senha do painel; mantenha como segredo |
| `SESSION_TOKEN` | Valor aleatório usado para validar a sessão |
| `GOOGLE_SHEET_ID` | Identificador da planilha Google Sheets |

Nunca envie o arquivo `.env.local` ao GitHub. Ele já está ignorado pelo projeto.

## Tecnologias

- Next.js 16
- React 19
- TypeScript
- Vinext/Vite
- Cloudflare Workers

## Publicação

Configure as quatro variáveis de ambiente na plataforma de hospedagem e execute:

```bash
npm run build
```

## Segurança

- a senha não fica exposta no JavaScript do navegador;
- a autenticação é validada no servidor;
- o cookie de sessão utiliza `HttpOnly`, `Secure` e `SameSite=Strict`;
- o painel oferece somente leitura dos dados da planilha.

Desenvolvido por Álefim Oliveira — 2026.
