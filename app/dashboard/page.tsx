"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, string | number>;
type Cargo = keyof typeof camposPorCargo;
type VisitaComparacao = (typeof visitasComparacao)[number];

const camposPorCargo = {
  "Deputado Estadual": ["SÉRGIO", "ROMEU", "EUVALDETE", "OUTROS EST.", "INDECISOS EST."],
  "Deputado Federal": ["ROGER", "TAYNA", "OUTROS FED.", "INDECISOS FED."],
  "Senador": ["CID GOMES", "LUIZIANE", "CAP. WAGNER", "OUTROS SEN.", "INDECISOS SEN."],
  "Governador": ["ELMANO", "CIRO", "INDECISOS GOV."],
  "Presidente": ["LULA", "FLÁVIO", "OUTROS PRES.", "INDECISOS PRES."],
} as const;

const visitasDisponiveis = ["Todas as visitas", "1ª visita", "2ª visita", "Visita extra"] as const;
const visitasComparacao = ["1ª visita", "2ª visita", "Visita extra"] as const;
const coresCandidatos: Record<string, string> = {
  SÉRGIO: "#ffd500",
  ROMEU: "#e51b2a",
  EUVALDETE: "#0072bc",
};

function candidatosDoCargo(cargo: Cargo) {
  return [...camposPorCargo[cargo]] as string[];
}

function normalizarChave(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function chaveRua(row: Row) {
  return `${normalizarChave(row["BAIRRO/ÁREA"])}|||${normalizarChave(row["RUA/LOCALIDADE"])}`;
}

export default function Dashboard() {
  const [visitaRows, setVisitaRows] = useState<Row[]>([]);
  const [cargo, setCargo] = useState<Cargo>("Deputado Estadual");
  const [candidato, setCandidato] = useState("SÉRGIO");
  const [bairro, setBairro] = useState("Todos os bairros");
  const [visita, setVisita] = useState<(typeof visitasDisponiveis)[number]>("Todas as visitas");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [updated, setUpdated] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (response.status === 401) {
        location.replace("/");
        return;
      }
      const json = await response.json();
      if (!response.ok) setErro(json.erro || "Não foi possível atualizar os dados.");
      else {
        setVisitaRows(json.visitaRows || []);
        setUpdated(json.atualizadoEm || "");
      }
    } catch {
      setErro("Não foi possível atualizar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 30000);
    return () => clearInterval(timer);
  }, []);

  const opcoesCandidato = useMemo(() => candidatosDoCargo(cargo), [cargo]);

  useEffect(() => {
    if (!opcoesCandidato.includes(candidato)) setCandidato(opcoesCandidato[0]);
  }, [opcoesCandidato, candidato]);

  const bairros = useMemo(() => [
    "Todos os bairros",
    ...Array.from(new Set(visitaRows.map(r => String(r["BAIRRO/ÁREA"] || "")).filter(Boolean))).sort(),
  ], [visitaRows]);

  const registrosTerritoriais = useMemo(() => visitaRows.filter(r =>
    (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) &&
    String(r["RUA/LOCALIDADE"] || "").trim()
  ), [visitaRows, bairro]);

  const registrosFiltrados = useMemo(() => registrosTerritoriais.filter(r =>
    visita === "Todas as visitas" || r.VISITA === visita
  ), [registrosTerritoriais, visita]);

  const ranking = useMemo(() => {
    const mapa = new Map<string, { bairro: string; total: number; candidatos: Record<string, number> }>();
    registrosFiltrados.forEach(r => {
      const nomeBairro = String(r["BAIRRO/ÁREA"] || "").trim();
      if (!nomeBairro) return;
      const atual = mapa.get(nomeBairro) || { bairro: nomeBairro, total: 0, candidatos: {} };
      opcoesCandidato.forEach(nome => {
        const votos = Number(r[nome] || 0);
        atual.candidatos[nome] = (atual.candidatos[nome] || 0) + votos;
        atual.total += votos;
      });
      mapa.set(nomeBairro, atual);
    });
    return Array.from(mapa.values())
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [registrosFiltrados, opcoesCandidato]);

  const rankingPorVisita = useMemo(() => {
    type BairroComparativo = {
      bairro: string;
      visitas: Record<VisitaComparacao, Record<string, number>>;
    };

    const criarVisitas = () => Object.fromEntries(
      visitasComparacao.map(v => [v, Object.fromEntries(opcoesCandidato.map(nome => [nome, 0]))])
    ) as Record<VisitaComparacao, Record<string, number>>;

    const mapa = new Map<string, BairroComparativo>();

    registrosTerritoriais.forEach(r => {
      const nomeBairro = String(r["BAIRRO/ÁREA"] || "").trim();
      const visitaAtual = visitasComparacao.find(v => v === r.VISITA);
      if (!nomeBairro || !visitaAtual) return;

      const atual = mapa.get(nomeBairro) || { bairro: nomeBairro, visitas: criarVisitas() };
      opcoesCandidato.forEach(nome => {
        atual.visitas[visitaAtual][nome] = (atual.visitas[visitaAtual][nome] || 0) + Number(r[nome] || 0);
      });
      mapa.set(nomeBairro, atual);
    });

    const totalDaVisita = (item: BairroComparativo, v: VisitaComparacao) =>
      opcoesCandidato.reduce((s, nome) => s + Number(item.visitas[v][nome] || 0), 0);

    return Array.from(mapa.values())
      .filter(item => visitasComparacao.some(v => totalDaVisita(item, v) > 0))
      .sort((a, b) => {
        const b1 = Number(b.visitas["1ª visita"][candidato] || 0);
        const a1 = Number(a.visitas["1ª visita"][candidato] || 0);
        if (b1 !== a1) return b1 - a1;
        const b2 = Number(b.visitas["2ª visita"][candidato] || 0);
        const a2 = Number(a.visitas["2ª visita"][candidato] || 0);
        if (b2 !== a2) return b2 - a2;
        return Number(b.visitas["Visita extra"][candidato] || 0) - Number(a.visitas["Visita extra"][candidato] || 0);
      })
      .slice(0, 15);
  }, [registrosTerritoriais, opcoesCandidato, candidato]);

  const totais = useMemo(() => opcoesCandidato.map(nome => ({
    nome,
    total: registrosFiltrados.reduce((s, r) => s + Number(r[nome] || 0), 0),
  })).sort((a, b) => b.total - a.total), [opcoesCandidato, registrosFiltrados]);

  const totaisPorVisita = useMemo(() => Object.fromEntries(
    visitasComparacao.map(v => [v, opcoesCandidato.map(nome => ({
      nome,
      total: registrosTerritoriais
        .filter(r => r.VISITA === v)
        .reduce((s, r) => s + Number(r[nome] || 0), 0),
    })).sort((a, b) => b.total - a.total)])
  ) as Record<VisitaComparacao, Array<{ nome: string; total: number }>>, [opcoesCandidato, registrosTerritoriais]);

  const visitasComparativoCandidatos = useMemo(() => visitasComparacao.filter((v, i) =>
    i < 2 || totaisPorVisita[v].some(x => x.total > 0)
  ), [totaisPorVisita]);

  const totalCandidato = registrosFiltrados.reduce((s, r) => s + Number(r[candidato] || 0), 0);
  const camposEleitoresPesquisados = camposPorCargo["Deputado Estadual"];
  const eleitoresPesquisados = registrosFiltrados.reduce((total, registro) => total +
    camposEleitoresPesquisados.reduce((subtotal, campo) => subtotal + Number(registro[campo] || 0), 0), 0);
  const maxRanking = Math.max(1, ...ranking.map(x => x.total));
  const maxCandidato = Math.max(1, ...totais.map(x => x.total));

  const compararCasas = useMemo(() => {
    const registrosPorVisita = (v: VisitaComparacao) => visitaRows.filter(r =>
      (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) &&
      r.VISITA === v &&
      String(r["RUA/LOCALIDADE"] || "").trim()
    );

    const ruasPorVisita = {
      nome: "Ruas cadastradas",
      valores: Object.fromEntries(visitasComparacao.map(v => [
        v,
        new Set(registrosPorVisita(v).map(chaveRua)).size,
      ])),
    };

    const indicadoresCasas = [
      { nome: "Casas fechadas", campo: "CASAS FECHADAS" },
      { nome: "Casas desabitadas", campo: "CASAS DESABITADAS" },
    ].map(item => ({
      nome: item.nome,
      valores: Object.fromEntries(visitasComparacao.map(v => [
        v,
        registrosPorVisita(v).reduce((s, r) => s + Number(r[item.campo] || 0), 0),
      ])),
    }));

    return [ruasPorVisita, ...indicadoresCasas];
  }, [visitaRows, bairro]);

  const votosPorVisita = useMemo(() => visitasComparacao.map(v => ({
    nome: v,
    total: visitaRows
      .filter(r => (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) && r.VISITA === v)
      .reduce((s, r) => s + Number(r[candidato] || 0), 0),
  })), [visitaRows, bairro, candidato]);

  const eleitoresPorVisita = useMemo(() => visitasComparacao.map(v => ({
    nome: v,
    total: visitaRows
      .filter(r =>
        (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) &&
        r.VISITA === v &&
        String(r["RUA/LOCALIDADE"] || "").trim()
      )
      .reduce((total, registro) => total +
        camposEleitoresPesquisados.reduce((subtotal, campo) => subtotal + Number(registro[campo] || 0), 0), 0),
  })), [visitaRows, bairro]);

  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    location.replace("/");
  }

  function emitirRelatorio() {
    const janela = window.open("", "_blank");
    if (!janela) return alert("Permita a abertura de pop-ups para emitir o relatório.");
    janela.opener = null;

    const safe = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
    }[char] || char));
    const data = new Date().toLocaleString("pt-BR");
    const rankingCabecalho = opcoesCandidato.map(nome => `<th class="n">${safe(nome)}</th>`).join("");

    const linhasRankingSimples = ranking.length
      ? ranking.map((x, i) => `<tr><td>${i + 1}</td><td>${safe(x.bairro)}</td>${opcoesCandidato.map(nome => `<td class="n">${Number(x.candidatos[nome] || 0).toLocaleString("pt-BR")}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${opcoesCandidato.length + 2}">Sem votos lançados para o filtro selecionado.</td></tr>`;

    const linhasRankingPorVisita = rankingPorVisita.length
      ? rankingPorVisita.map((x, i) => visitasComparacao.map((v, indiceVisita) => `<tr class="${indiceVisita === 0 ? "bairro-inicio" : ""}">${indiceVisita === 0 ? `<td rowspan="3">${i + 1}</td><td rowspan="3"><strong>${safe(x.bairro)}</strong></td>` : ""}<td class="visita-col">${safe(v)}</td>${opcoesCandidato.map(nome => `<td class="n">${Number(x.visitas[v][nome] || 0).toLocaleString("pt-BR")}</td>`).join("")}</tr>`).join("")).join("")
      : `<tr><td colspan="${opcoesCandidato.length + 3}">Sem votos lançados para os filtros selecionados.</td></tr>`;

    const tabelaPretensao = visita === "Todas as visitas"
      ? `<p>Comparativo da 1ª visita, 2ª visita e visita extra por bairro, sem somar uma visita com a outra.</p><table><thead><tr><th>#</th><th>Bairro/Área</th><th>Visita</th>${rankingCabecalho}</tr></thead><tbody>${linhasRankingPorVisita}</tbody></table>`
      : `<p>Votos individuais dos candidatos/categorias do cargo na visita selecionada.</p><table><thead><tr><th>#</th><th>Bairro/Área</th>${rankingCabecalho}</tr></thead><tbody>${linhasRankingSimples}</tbody></table>`;

    const comparativoCandidatosRelatorio = visita === "Todas as visitas"
      ? visitasComparativoCandidatos.map(v => `<div class="candidate-visit"><h3>${safe(v)}</h3><table><thead><tr><th>Nome</th><th class="n">Votos</th></tr></thead><tbody>${totaisPorVisita[v].map(x => `<tr><td>${safe(x.nome)}</td><td class="n">${x.total.toLocaleString("pt-BR")}</td></tr>`).join("")}</tbody></table></div>`).join("")
      : `<table><thead><tr><th>Nome</th><th class="n">Votos</th></tr></thead><tbody>${totais.map(x => `<tr><td>${safe(x.nome)}</td><td class="n">${x.total.toLocaleString("pt-BR")}</td></tr>`).join("")}</tbody></table>`;

    const detalharVisitas = (itens: Array<{ nome: string; total: number }>) => visita === "Todas as visitas"
      ? `<div class="visit-split">${itens.filter((x, i) => i < 2 || x.total > 0).map(x => `<div><span>${x.nome === "Visita extra" ? "EXTRA" : safe(x.nome)}</span><strong>${x.total.toLocaleString("pt-BR")}</strong></div>`).join("")}</div>`
      : "";
    const detalheVotos = detalharVisitas(votosPorVisita);
    const valorVotosRelatorio = visita === "Todas as visitas"
      ? ""
      : `<strong style="display:block;font-size:30px;color:#143968;margin:5px 0">${totalCandidato.toLocaleString("pt-BR")}</strong>`;
    const eleitoresRelatorio = visita === "Todas as visitas"
      ? `<div class="visit-split">${eleitoresPorVisita.map(x => `<div><span>${x.nome === "Visita extra" ? "EXTRA" : safe(x.nome)}</span><strong>${x.total.toLocaleString("pt-BR")}</strong></div>`).join("")}</div>`
      : `<strong style="display:block;font-size:30px;color:#143968;margin:5px 0">${eleitoresPesquisados.toLocaleString("pt-BR")}</strong>`;

    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório territorial</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:35px}.faixa{height:7px;background:linear-gradient(90deg,#e51b2a 0 33%,#ffd500 33% 66%,#0072bc 66%);margin:-35px -35px 28px}h1,h2,h3{color:#143968}h1{margin:0}h3{font-size:13px;margin:14px 0 5px}p{color:#687487}table{width:100%;border-collapse:collapse;margin:12px 0 24px;font-size:12px}th,td{padding:8px;border-bottom:1px solid #e5e8ed;text-align:left;vertical-align:top}th{background:#f4f5f7}.n{text-align:right;font-weight:700}.grid{display:grid;grid-template-columns:1.5fr .8fr;gap:18px}.filtros{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.f{padding:10px;border:1px solid #e5e8ed;border-radius:8px}.f span{display:block;color:#7b8494;font-size:9px;text-transform:uppercase}.f strong{font-size:12px}.visit-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px;margin-top:10px;padding-top:9px;border-top:1px solid #e5e8ed}.visit-split>div{background:#f7f8fa;border-radius:6px;padding:6px 7px}.visit-split span{font-size:8px;font-weight:700}.visit-split strong{display:block;font-size:14px;color:#143968;margin-top:2px}.visita-col{font-weight:700;color:#143968;white-space:nowrap}.bairro-inicio td{border-top:2px solid #dfe4ea}.candidate-visit{break-inside:avoid;margin-bottom:14px}.acoes{text-align:right}.acoes button{border:0;background:#e51b2a;color:#fff;padding:9px 13px;border-radius:8px;font-weight:700}@media print{.acoes{display:none}.grid{grid-template-columns:1fr}.page-break{break-before:page}}@media(max-width:700px){.grid,.filtros{grid-template-columns:1fr}}</style></head><body><div class="faixa"></div><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><h1>Relatório territorial</h1><p>Comitê Sérgio Aguiar • Pesquisa 2026 • Emitido em ${safe(data)}</p><div class="filtros"><div class="f"><span>Visita</span><strong>${safe(visita)}</strong></div><div class="f"><span>Cargo</span><strong>${safe(cargo)}</strong></div><div class="f"><span>Candidato/Categoria</span><strong>${safe(candidato)}</strong></div><div class="f"><span>Bairro/Área</span><strong>${safe(bairro)}</strong></div></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,380px));gap:10px;margin-bottom:20px"><div class="f"><span>VOTOS DA SELEÇÃO</span>${valorVotosRelatorio}<b style="display:block;margin-top:5px">${safe(candidato)}</b>${detalheVotos}</div><div class="f"><span>ELEITORES PESQUISADOS POR VISITA</span>${eleitoresRelatorio}</div></div><div class="grid"><div><h2>Pretensão de votos por bairro — ${safe(cargo)}</h2>${tabelaPretensao}</div><div><h2>Comparativo de candidatos/categorias</h2><p>${visita === "Todas as visitas" ? "Resultados separados por visita, sem acumular." : safe(visita)}</p>${comparativoCandidatosRelatorio}</div></div><p style="font-size:10px;text-align:center;margin-top:30px">Painel de Planilhas — Comitê Sérgio Aguiar • Desenvolvido por Álefim Oliveira</p></body></html>`);
    janela.document.close();
  }

  return <main className="dashboard-shell">
    <header className="topbar">
      <div className="top-brand"><div className="mini-crest">40</div><div className="top-title"><strong>Painel de Planilhas</strong><span>COMITÊ SÉRGIO AGUIAR • 2026</span></div></div>
      <div className="top-actions"><span className="user-chip">Administrador</span><button className="logout-button" onClick={sair}>Sair ↗</button></div>
    </header>

    <div className="dashboard-main">
      <div className="dashboard-heading">
        <div><span className="eyebrow">VISÃO TERRITORIAL</span><h1>Resultados por rua</h1></div>
        <div><span className="live">Dados conectados</span><p className="updated">{updated ? `Atualizado às ${new Date(updated).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Carregando atualização…"}</p></div>
      </div>

      <section className="filters">
        <label>VISITA<select value={visita} onChange={e => setVisita(e.target.value as (typeof visitasDisponiveis)[number])}>{visitasDisponiveis.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>CARGO<select value={cargo} onChange={e => setCargo(e.target.value as Cargo)}>{Object.keys(camposPorCargo).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>CANDIDATO / CATEGORIA<select value={candidato} onChange={e => setCandidato(e.target.value)}>{opcoesCandidato.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>BAIRRO / ÁREA<select value={bairro} onChange={e => setBairro(e.target.value)}>{bairros.map(x => <option key={x}>{x}</option>)}</select></label>
        <button type="button" className="report-button" onClick={emitirRelatorio} disabled={loading || !!erro}>▤ Emitir relatório</button>
        <button type="button" className="refresh-button" onClick={carregar} disabled={loading}>↻ {loading ? "Atualizando" : "Atualizar"}</button>
      </section>

      {erro ? <div className="error-state">{erro}. Verifique se a planilha está compartilhada para leitura por link.</div> : <>
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:"16px",alignItems:"stretch",marginBottom:"16px"}}>
          <article className="panel" style={{display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:"150px"}}>
            <div className="panel-head" style={{marginBottom:"12px"}}><div><h2>Votos da seleção por visita</h2><div className="panel-kicker">Exibindo os votos de {candidato} em cada visita.</div></div></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"18px",alignItems:"end",background:"#f7f8fa",borderRadius:"14px",padding:"16px"}}>
              {votosPorVisita.map(x => <div key={x.nome} style={{display:"grid",gap:"7px",minWidth:0}}><span style={{color:"#7b8494",fontSize:"10px",fontWeight:800,letterSpacing:".08em",textTransform:"uppercase"}}>{x.nome}</span><strong style={{color:"#143968",fontFamily:"Georgia,serif",fontSize:"clamp(24px,2.1vw,34px)",lineHeight:1}}>{x.total.toLocaleString("pt-BR")}</strong></div>)}
            </div>
          </article>

          <article className="panel" style={{display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:"150px",padding:"22px"}}>
            <div className="panel-head" style={{marginBottom:"12px"}}><div><h2>Eleitores pesquisados por visita</h2><div className="panel-kicker">Valores separados, sem somar uma visita com a outra.</div></div></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px"}}>
              {eleitoresPorVisita.map((x, i) => <div key={x.nome} style={{background:i===0?"#f4f7fb":"#f7f8fa",border:"1px solid #e7ebf0",borderRadius:"12px",padding:"14px 16px",minWidth:0}}>
                <span className="metric-label" style={{display:"block",fontSize:"10px"}}>ELEITORES PESQUISADOS</span>
                <span style={{display:"block",color:"#7b8494",fontSize:"10px",fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",marginTop:"6px"}}>{x.nome}</span>
                <strong className="metric-value" style={{display:"block",fontSize:"clamp(26px,2.4vw,40px)",marginTop:"8px",lineHeight:1}}>{x.total.toLocaleString("pt-BR")}</strong>
              </div>)}
            </div>
          </article>
        </section>

        <section className="panel" style={{marginBottom:"18px",padding:"20px"}}>
          <div className="visit-table" style={{marginTop:0,overflowX:"auto"}}>
            <div className="visit-table-head" style={{gridTemplateColumns:"minmax(180px,2fr) repeat(3,minmax(100px,1fr))",padding:"11px 12px"}}><span>Indicador</span><span>1ª visita</span><span>2ª visita</span><span>Visita extra</span></div>
            {compararCasas.map(x => <div className="visit-table-row" style={{gridTemplateColumns:"minmax(180px,2fr) repeat(3,minmax(100px,1fr))",padding:"12px"}} key={x.nome}><strong>{x.nome}</strong>{visitasComparacao.map(v => <span key={v}>{Number(x.valores[v] || 0).toLocaleString("pt-BR")}</span>)}</div>)}
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-head"><div><h2>Pretensão de votos por bairro — {cargo}</h2><div className="panel-kicker">{bairro} • {visita}</div><div className="panel-kicker">{visita === "Todas as visitas" ? "Comparativo da 1ª visita, 2ª visita e visita extra, sem somar uma visita com a outra." : "Votos individuais de todos os candidatos/categorias do cargo em cada bairro."}</div></div></div>
            {visita === "Todas as visitas" ? (
              rankingPorVisita.length ? <div style={{display:"grid",gap:"10px",maxHeight:"700px",overflowY:"auto",paddingRight:"6px"}}>{rankingPorVisita.map((x, i) => <div key={x.bairro} style={{borderBottom:"1px solid #eef1f4",padding:"10px 0 16px"}}>
                <div style={{display:"grid",gridTemplateColumns:"32px minmax(0,1fr)",gap:"10px",alignItems:"start"}}>
                  <span className="rank-number">{String(i + 1).padStart(2, "0")}</span>
                  <div style={{minWidth:0}}>
                    <div className="rank-name" style={{marginBottom:"10px"}}><strong>{x.bairro}</strong><span>{cargo}</span></div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"10px"}}>
                      {visitasComparacao.map(v => <div key={v} style={{background:"#f7f8fa",border:"1px solid #e7ebf0",borderRadius:"12px",padding:"12px",minWidth:0}}>
                        <span style={{display:"block",color:"#143968",fontSize:"10px",fontWeight:900,letterSpacing:".07em",textTransform:"uppercase",marginBottom:"9px"}}>{v}</span>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(92px,1fr))",gap:"7px"}}>
                          {opcoesCandidato.map(nome => <div key={nome} style={{background:nome===candidato?"#fff1f2":"#fff",border:nome===candidato?"1px solid #f6c8cd":"1px solid #eef1f4",borderRadius:"9px",padding:"8px",minWidth:0}}>
                            <span style={{display:"block",fontSize:"8px",fontWeight:800,color:nome===candidato?"#c91422":"#7b8494",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nome}</span>
                            <strong style={{display:"block",fontSize:"14px",color:"#143968",marginTop:"3px"}}>{Number(x.visitas[v][nome] || 0).toLocaleString("pt-BR")}</strong>
                          </div>)}
                        </div>
                      </div>)}
                    </div>
                  </div>
                </div>
              </div>)}</div> : <div className="empty-state">Sem votos lançados para os filtros selecionados.</div>
            ) : (
              ranking.length ? <div style={{display:"grid",gap:"10px"}}>{ranking.map((x, i) => <div key={x.bairro} style={{borderBottom:"1px solid #eef1f4",padding:"10px 0 14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"32px minmax(150px,1fr) minmax(140px,1fr)",gap:"10px",alignItems:"center"}}>
                  <span className="rank-number">{String(i + 1).padStart(2, "0")}</span>
                  <div className="rank-name"><strong>{x.bairro}</strong><span>{cargo}</span></div>
                  <div className="bar-track"><div className="bar" style={{width:`${Math.max(3, x.total / maxRanking * 100)}%`}} /></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:"7px",margin:"10px 0 0 42px"}}>
                  {opcoesCandidato.map(nome => <div key={nome} style={{background:nome===candidato?"#fff1f2":"#f7f8fa",border:nome===candidato?"1px solid #f6c8cd":"1px solid #eef1f4",borderRadius:"9px",padding:"8px 9px",minWidth:0}}>
                    <span style={{display:"block",fontSize:"9px",fontWeight:800,color:nome===candidato?"#c91422":"#7b8494",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nome}</span>
                    <strong style={{display:"block",fontSize:"14px",color:"#143968",marginTop:"3px"}}>{Number(x.candidatos[nome] || 0).toLocaleString("pt-BR")}</strong>
                  </div>)}
                </div>
              </div>)}</div> : <div className="empty-state">Sem votos lançados para o cargo e filtros selecionados.</div>
            )}
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Comparativo de candidatos</h2><div className="panel-kicker">{cargo} • {visita === "Todas as visitas" ? "visitas separadas" : visita}</div></div></div>
            {visita === "Todas as visitas" ? (
              <div style={{display:"grid",gap:"18px"}}>
                {visitasComparativoCandidatos.map(v => {
                  const lista = totaisPorVisita[v];
                  const maximo = Math.max(1, ...lista.map(x => x.total));
                  return <div key={v} style={{background:"#f7f8fa",border:"1px solid #e7ebf0",borderRadius:"12px",padding:"12px"}}>
                    <div style={{color:"#143968",fontSize:"11px",fontWeight:900,letterSpacing:".07em",textTransform:"uppercase",marginBottom:"10px"}}>{v}</div>
                    <div className="candidate-list">{lista.map(x => <div className="candidate-row" key={`${v}-${x.nome}`}><div className="candidate-top"><strong>{x.nome}</strong><span>{x.total.toLocaleString("pt-BR")}</span></div><div className="candidate-bar"><div className="candidate-fill" style={{width:`${Math.max(x.total ? 3 : 0, x.total / maximo * 100)}%`,background:coresCandidatos[x.nome] || undefined}} /></div></div>)}</div>
                  </div>;
                })}
              </div>
            ) : (
              <div className="candidate-list">{totais.map(x => <div className="candidate-row" key={x.nome}><div className="candidate-top"><strong>{x.nome}</strong><span>{x.total.toLocaleString("pt-BR")}</span></div><div className="candidate-bar"><div className="candidate-fill" style={{width:`${Math.max(x.total ? 3 : 0, x.total / maxCandidato * 100)}%`, background: coresCandidatos[x.nome] || undefined}} /></div></div>)}</div>
            )}
          </article>
        </section>
      </>}

      <footer className="dashboard-footer"><span>Dados atualizados automaticamente a cada 30 segundos.</span><span>Desenvolvido por: <strong>Álefim Oliveira</strong></span></footer>
    </div>
  </main>;
}