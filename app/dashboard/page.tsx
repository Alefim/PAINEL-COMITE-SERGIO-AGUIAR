"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, string | number>;
type Cargo = keyof typeof camposPorCargo;

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
  "SÉRGIO": "#ffd500",
  "ROMEU": "#e51b2a",
  "EUVALDETE": "#0072bc",
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

function chaveRuaVisita(row: Row) {
  return `${chaveRua(row)}|||${normalizarChave(row.VISITA)}`;
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
    const mapa = new Map<string, { bairro: string; votos: number }>();
    registrosFiltrados.forEach(r => {
      const nomeBairro = String(r["BAIRRO/ÁREA"] || "").trim();
      if (!nomeBairro) return;
      const votosCargo = opcoesCandidato.reduce((s, nome) => s + Number(r[nome] || 0), 0);
      const atual = mapa.get(nomeBairro) || { bairro: nomeBairro, votos: 0 };
      atual.votos += votosCargo;
      mapa.set(nomeBairro, atual);
    });
    return Array.from(mapa.values())
      .filter(x => x.votos > 0)
      .sort((a, b) => b.votos - a.votos)
      .slice(0, 15);
  }, [registrosFiltrados, opcoesCandidato]);

  const totais = useMemo(() => opcoesCandidato.map(nome => ({
    nome,
    total: registrosFiltrados.reduce((s, r) => s + Number(r[nome] || 0), 0),
  })).sort((a, b) => b.total - a.total), [opcoesCandidato, registrosFiltrados]);

  const totalCandidato = registrosFiltrados.reduce((s, r) => s + Number(r[candidato] || 0), 0);
  const camposEleitoresPesquisados = camposPorCargo["Deputado Estadual"];
  const eleitoresPesquisados = registrosFiltrados.reduce((total, registro) => total +
    camposEleitoresPesquisados.reduce((subtotal, campo) => subtotal + Number(registro[campo] || 0), 0), 0);
  const ruasCadastradas = new Set(registrosFiltrados.map(chaveRuaVisita)).size;

  const ruasComVoto = new Set(
    registrosFiltrados
      .filter(r => Number(r[candidato] || 0) > 0)
      .map(chaveRuaVisita)
  ).size;

  const ruasSemVoto = Math.max(0, ruasCadastradas - ruasComVoto);
  const maxRanking = Math.max(1, ...ranking.map(x => x.votos));
  const maxCandidato = Math.max(1, ...totais.map(x => x.total));

  const compararCasas = useMemo(() => [
    { nome: "Casas fechadas", campo: "CASAS FECHADAS" },
    { nome: "Casas desabitadas", campo: "CASAS DESABITADAS" },
  ].map(item => ({
    nome: item.nome,
    valores: Object.fromEntries(visitasComparacao.map(v => [v, visitaRows
      .filter(r => (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) && r.VISITA === v)
      .reduce((s, r) => s + Number(r[item.campo] || 0), 0)])),
  })), [visitaRows, bairro]);

  const votosPorVisita = useMemo(() => visitasComparacao.map(v => ({
    nome: v,
    total: visitaRows
      .filter(r => (bairro === "Todos os bairros" || r["BAIRRO/ÁREA"] === bairro) && r.VISITA === v)
      .reduce((s, r) => s + Number(r[candidato] || 0), 0),
  })), [visitaRows, bairro, candidato]);

  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    location.replace("/");
  }

  function emitirRelatorio() {
    const janela = window.open("", "_blank");
    if (!janela) return alert("Permita a abertura de pop-ups para emitir o relatório.");
    janela.opener = null;
    const safe = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#039;",
    }[char] || char));
    const data = new Date().toLocaleString("pt-BR");
    const linhasRanking = ranking.length ? ranking.map((x, i) => `<tr><td>${i + 1}</td><td>${safe(x.bairro)}</td><td class="n">${x.votos.toLocaleString("pt-BR")}</td></tr>`).join("") : `<tr><td colspan="3">Sem votos lançados para o filtro selecionado.</td></tr>`;
    const linhasCandidatos = totais.map(x => `<tr><td>${safe(x.nome)}</td><td class="n">${x.total.toLocaleString("pt-BR")}</td></tr>`).join("");
    const linhasCasas = compararCasas.map(x => `<tr><td>${safe(x.nome)}</td>${visitasComparacao.map(v => `<td class="n">${Number(x.valores[v] || 0).toLocaleString("pt-BR")}</td>`).join("")}</tr>`).join("");

    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório territorial</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:35px}.faixa{height:7px;background:linear-gradient(90deg,#e51b2a 0 33%,#ffd500 33% 66%,#0072bc 66%);margin:-35px -35px 28px}h1,h2{color:#143968}h1{margin:0}p{color:#687487}table{width:100%;border-collapse:collapse;margin:12px 0 24px;font-size:12px}th,td{padding:8px;border-bottom:1px solid #e5e8ed;text-align:left}th{background:#f4f5f7}.n{text-align:right;font-weight:700}.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:18px}.filtros{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.f{padding:10px;border:1px solid #e5e8ed;border-radius:8px}.f span{display:block;color:#7b8494;font-size:9px;text-transform:uppercase}.f strong{font-size:12px}.acoes{text-align:right}.acoes button{border:0;background:#e51b2a;color:#fff;padding:9px 13px;border-radius:8px;font-weight:700}@media print{.acoes{display:none}}@media(max-width:700px){.grid,.filtros{grid-template-columns:1fr}}</style></head><body><div class="faixa"></div><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><h1>Relatório territorial</h1><p>Comitê Sérgio Aguiar • Pesquisa 2026 • Emitido em ${safe(data)}</p><div class="filtros"><div class="f"><span>Visita</span><strong>${safe(visita)}</strong></div><div class="f"><span>Cargo</span><strong>${safe(cargo)}</strong></div><div class="f"><span>Candidato/Categoria</span><strong>${safe(candidato)}</strong></div><div class="f"><span>Bairro/Área</span><strong>${safe(bairro)}</strong></div></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,320px));gap:10px;margin-bottom:20px"><div class="f"><span>VOTOS DA SELEÇÃO</span><strong style="display:block;font-size:30px;color:#143968;margin:5px 0">${totalCandidato.toLocaleString("pt-BR")}</strong><b>${safe(candidato)}</b></div><div class="f"><span>ELEITORES PESQUISADOS</span><strong style="display:block;font-size:30px;color:#143968;margin:5px 0">${eleitoresPesquisados.toLocaleString("pt-BR")}</strong><b>Total pesquisado para Deputado Estadual</b></div></div><h2>Conferência das visitas</h2><table><thead><tr><th>Indicador</th><th class="n">1ª visita</th><th class="n">2ª visita</th><th class="n">Visita extra</th></tr></thead><tbody>${linhasCasas}</tbody></table><div class="grid"><div><h2>Ranking de bairros — ${safe(cargo)}</h2><p>Amostra: top ${ranking.length} bairros por total de votos do cargo no filtro atual.</p><table><thead><tr><th>#</th><th>Bairro/Área</th><th class="n">Votos</th></tr></thead><tbody>${linhasRanking}</tbody></table></div><div><h2>Comparativo de candidatos/categorias</h2><table><thead><tr><th>Nome</th><th class="n">Total</th></tr></thead><tbody>${linhasCandidatos}</tbody></table></div></div><p style="font-size:10px;text-align:center;margin-top:30px">Painel de Planilhas — Comitê Sérgio Aguiar • Desenvolvido por Álefim Oliveira</p></body></html>`);
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

          <article className="metric-card" style={{display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"150px",padding:"22px"}}>
            <span className="metric-label">Eleitores pesquisados</span>
            <strong className="metric-value" style={{fontSize:"clamp(36px,3vw,48px)",marginTop:"12px"}}>{eleitoresPesquisados.toLocaleString("pt-BR")}</strong>
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
            <div className="panel-head"><div><h2>Ranking de bairros — {cargo}</h2><div className="panel-kicker">{bairro} • {visita}</div><div className="panel-kicker">TOP {ranking.length} bairros • soma de todos os votos do cargo selecionado</div></div></div>
            {ranking.length ? <div className="rank-list">{ranking.map((x, i) => <div className="rank-row" key={x.bairro}><span className="rank-number">{String(i + 1).padStart(2, "0")}</span><div className="rank-name"><strong>{x.bairro}</strong><span>{cargo}</span></div><div className="bar-track"><div className="bar" style={{width:`${Math.max(3, x.votos / maxRanking * 100)}%`}} /></div><span className="rank-votes">{x.votos.toLocaleString("pt-BR")}</span></div>)}</div> : <div className="empty-state">Sem votos lançados para o cargo e filtros selecionados.</div>}
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Comparativo de candidatos</h2><div className="panel-kicker">{cargo} • {visita}</div></div></div>
            <div className="candidate-list">{totais.map(x => <div className="candidate-row" key={x.nome}><div className="candidate-top"><strong>{x.nome}</strong><span>{x.total.toLocaleString("pt-BR")}</span></div><div className="candidate-bar"><div className="candidate-fill" style={{width:`${Math.max(x.total ? 3 : 0, x.total / maxCandidato * 100)}%`, background: coresCandidatos[x.nome] || undefined}} /></div></div>)}</div>
          </article>
        </section>
      </>}

      <footer className="dashboard-footer"><span>Dados atualizados automaticamente a cada 30 segundos.</span><span>Desenvolvido por: <strong>Álefim Oliveira</strong></span></footer>
    </div>
  </main>;
}
