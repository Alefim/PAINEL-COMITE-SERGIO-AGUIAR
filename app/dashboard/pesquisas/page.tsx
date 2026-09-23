"use client";

import { useEffect, useState } from "react";

type Pesquisa = {
  instituto: string;
  divulgacao: string;
  campo: string;
  ciro: number;
  elmano: number;
  outros: number;
  brancosNulos: number;
  indecisos: number;
  margem: string;
  amostra: number;
  registro: string;
  fonte: string;
  url: string;
};

type PesquisaAguardando = {
  instituto: string;
  divulgacaoPrevista: string;
  campo: string;
  margem: string;
  amostra: number;
  registro: string;
  status: string;
  fonte: string;
  url: string;
};

type Noticia = {
  titulo: string;
  fonte: string;
  data: string;
  url: string;
};

type Payload = {
  pesquisas: Pesquisa[];
  pesquisasAguardando: PesquisaAguardando[];
  noticias: Noticia[];
  monitorOnline: boolean;
  atualizadoEm: string;
  observacao: string;
};

export default function PesquisasGovernador() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch("/api/pesquisas-governador", { cache: "no-store" });
      if (response.status === 401) {
        location.replace("/");
        return;
      }
      const json = await response.json();
      if (!response.ok) setErro(json.erro || "Não foi possível atualizar as pesquisas.");
      else setData(json);
    } catch {
      setErro("Não foi possível atualizar as pesquisas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 300000);
    return () => clearInterval(timer);
  }, []);

  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    location.replace("/");
  }

  return <main className="dashboard-shell">
    <header className="topbar">
      <div className="top-brand">
        <div className="mini-crest">40</div>
        <div className="top-title"><strong>Painel de Planilhas</strong><span>COMITÊ SÉRGIO AGUIAR • 2026</span></div>
      </div>
      <div className="top-actions">
        <a href="/dashboard" style={navStyle(false)}>Visão territorial</a>
        <a href="/dashboard/pesquisas" style={navStyle(true)}>Pesquisas — Governador</a>
        <span className="user-chip">Administrador</span>
        <button className="logout-button" onClick={sair}>Sair ↗</button>
      </div>
    </header>

    <div className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">ELEIÇÕES 2026 • CEARÁ</span>
          <h1>Pesquisas — Governador</h1>
          <p style={{margin:"6px 0 0",color:"#687487",maxWidth:"760px"}}>
            Acompanhamento informativo de pesquisas publicadas. Os levantamentos são mostrados separadamente, sem média própria ou projeção.
          </p>
        </div>
        <div>
          <span className="live">{data?.monitorOnline ? "Monitor da rede conectado" : "Monitor da rede indisponível"}</span>
          <p className="updated">
            {data?.atualizadoEm ? "Atualizado às " + new Date(data.atualizadoEm).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : "Carregando atualização…"}
          </p>
        </div>
      </div>

      <section style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"18px"}}>
        <button type="button" className="refresh-button" onClick={carregar} disabled={loading}>↻ {loading ? "Atualizando" : "Atualizar agora"}</button>
        <span style={{fontSize:"12px",color:"#687487",alignSelf:"center"}}>Atualização automática a cada 5 minutos.</span>
      </section>

      {erro ? <div className="error-state">{erro}</div> : <>

        {(data?.pesquisasAguardando || []).length > 0 && <section className="panel" style={{marginBottom:"18px",padding:"20px"}}>
          <div className="panel-head">
            <div>
              <h2>Pesquisa com divulgação prevista</h2>
              <div className="panel-kicker">Levantamento registrado e concluído, ainda sem percentuais publicados em fonte verificável.</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"14px",marginTop:"16px"}}>
            {(data?.pesquisasAguardando || []).map(p => <article key={p.instituto + p.registro} style={{border:"1px solid #e5e8ed",borderRadius:"14px",padding:"16px",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"start"}}>
                <div>
                  <strong style={{fontSize:"17px",color:"#143968"}}>{p.instituto}</strong>
                  <div style={{fontSize:"11px",color:"#7b8494",marginTop:"4px"}}>Divulgação prevista: {formatarData(p.divulgacaoPrevista)}</div>
                </div>
                <span style={{fontSize:"10px",fontWeight:800,color:"#7a5d00",background:"#fff7d6",borderRadius:"999px",padding:"6px 8px"}}>AGUARDANDO</span>
              </div>

              <div style={{marginTop:"14px",padding:"12px 14px",background:"#f7f8fa",borderRadius:"10px",fontSize:"12px",color:"#394457",fontWeight:800}}>
                {p.status}
              </div>

              <div style={{borderTop:"1px solid #eef1f4",marginTop:"14px",paddingTop:"12px",fontSize:"11px",color:"#687487",lineHeight:1.65}}>
                <div><strong>Campo:</strong> {p.campo}</div>
                <div><strong>Amostra:</strong> {p.amostra.toLocaleString("pt-BR")} eleitores</div>
                <div><strong>Margem:</strong> {p.margem}</div>
                <div><strong>Registro TSE:</strong> {p.registro}</div>
                <div><strong>Fonte:</strong> <a href={p.url} target="_blank" rel="noreferrer" style={{color:"#143968",fontWeight:800}}>{p.fonte} ↗</a></div>
              </div>
            </article>)}
          </div>
        </section>}

        <section className="panel" style={{marginBottom:"18px",padding:"20px"}}>
          <div className="panel-head">
            <div>
              <h2>Pesquisas verificadas — 1º turno</h2>
              <div className="panel-kicker">Percentuais publicados por cada instituto. A ordem dos candidatos é fixa para facilitar a comparação visual.</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"14px",marginTop:"16px"}}>
            {(data?.pesquisas || []).map(p => <article key={p.instituto} style={{border:"1px solid #e5e8ed",borderRadius:"14px",padding:"16px",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"start"}}>
                <div>
                  <strong style={{fontSize:"17px",color:"#143968"}}>{p.instituto}</strong>
                  <div style={{fontSize:"11px",color:"#7b8494",marginTop:"4px"}}>Divulgação: {formatarData(p.divulgacao)}</div>
                </div>
                <span style={{fontSize:"10px",fontWeight:800,color:"#143968",background:"#f2f5f8",borderRadius:"999px",padding:"6px 8px"}}>{p.margem}</span>
              </div>

              <div style={{display:"grid",gap:"12px",marginTop:"18px"}}>
                <Resultado nome="Ciro Gomes" valor={p.ciro} />
                <Resultado nome="Elmano de Freitas" valor={p.elmano} />
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginTop:"14px"}}>
                <Mini label="Outros" value={formatarNumero(p.outros) + "%"} />
                <Mini label="Brancos/Nulos" value={formatarNumero(p.brancosNulos) + "%"} />
                <Mini label="Indecisos" value={formatarNumero(p.indecisos) + "%"} />
              </div>

              <div style={{borderTop:"1px solid #eef1f4",marginTop:"14px",paddingTop:"12px",fontSize:"11px",color:"#687487",lineHeight:1.65}}>
                <div><strong>Campo:</strong> {p.campo}</div>
                <div><strong>Amostra:</strong> {p.amostra.toLocaleString("pt-BR")} eleitores</div>
                <div><strong>Registro TSE:</strong> {p.registro}</div>
                <div><strong>Fonte:</strong> <a href={p.url} target="_blank" rel="noreferrer" style={{color:"#143968",fontWeight:800}}>{p.fonte} ↗</a></div>
              </div>
            </article>)}
          </div>

          <div style={{marginTop:"14px",padding:"12px 14px",background:"#f7f8fa",borderRadius:"10px",fontSize:"11px",color:"#687487"}}>
            {data?.observacao}
          </div>
        </section>

        <section className="panel" style={{padding:"20px"}}>
          <div className="panel-head">
            <div>
              <h2>Monitor automático da rede</h2>
              <div className="panel-kicker">Novas publicações relacionadas a pesquisas para o Governo do Ceará aparecem aqui quando entram no Google Notícias.</div>
            </div>
          </div>

          <div style={{display:"grid",gap:"10px",marginTop:"14px"}}>
            {(data?.noticias || []).length ? (data?.noticias || []).map((n, i) => <a key={n.url + i} href={n.url} target="_blank" rel="noreferrer" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:"12px",padding:"13px 14px",border:"1px solid #e7ebf0",borderRadius:"12px",textDecoration:"none",background:"#fff"}}>
              <div style={{minWidth:0}}>
                <strong style={{display:"block",color:"#172033",fontSize:"13px",lineHeight:1.35}}>{n.titulo}</strong>
                <span style={{display:"block",color:"#7b8494",fontSize:"10px",marginTop:"5px"}}>{n.fonte} • {formatarDataHora(n.data)}</span>
              </div>
              <span style={{color:"#143968",fontWeight:900}}>↗</span>
            </a>) : <div className="empty-state">Nenhuma nova publicação encontrada no monitor neste momento.</div>}
          </div>
        </section>
      </>}

      <footer className="dashboard-footer">
        <span>Pesquisas eleitorais não são resultado oficial da eleição.</span>
        <span>Todos os direitos reservados (C) <strong>Álefim Oliveira</strong></span>
      </footer>
    </div>
  </main>;
}

function Resultado({nome, valor}:{nome:string; valor:number}) {
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",gap:"10px",alignItems:"end"}}>
      <strong style={{fontSize:"12px",color:"#172033"}}>{nome}</strong>
      <strong style={{fontSize:"22px",color:"#143968"}}>{formatarNumero(valor)}%</strong>
    </div>
    <div style={{height:"9px",background:"#edf0f3",borderRadius:"999px",overflow:"hidden",marginTop:"7px"}}>
      <div style={{width:Math.max(0,Math.min(100,valor)) + "%",height:"100%",background:"#143968",borderRadius:"999px"}} />
    </div>
  </div>;
}

function Mini({label,value}:{label:string;value:string}) {
  return <div style={{background:"#f7f8fa",borderRadius:"9px",padding:"9px",minWidth:0}}>
    <span style={{display:"block",fontSize:"8px",fontWeight:800,color:"#7b8494",textTransform:"uppercase"}}>{label}</span>
    <strong style={{display:"block",fontSize:"13px",color:"#143968",marginTop:"3px"}}>{value}</strong>
  </div>;
}

function navStyle(active:boolean) {
  return {
    textDecoration:"none",
    fontSize:"11px",
    fontWeight:900,
    color:active ? "#fff" : "#143968",
    background:active ? "#143968" : "#f4f6f8",
    border:"1px solid " + (active ? "#143968" : "#dfe4ea"),
    borderRadius:"999px",
    padding:"8px 10px",
    whiteSpace:"nowrap" as const
  };
}

function formatarNumero(value:number) {
  return value.toLocaleString("pt-BR", {maximumFractionDigits:1});
}

function formatarData(value:string) {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function formatarDataHora(value:string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}
