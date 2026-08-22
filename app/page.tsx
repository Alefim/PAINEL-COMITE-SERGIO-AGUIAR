"use client";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [usuario,setUsuario]=useState(""); const [senha,setSenha]=useState(""); const [erro,setErro]=useState(""); const [enviando,setEnviando]=useState(false);
  useEffect(()=>{fetch("/api/session",{cache:"no-store"}).then(r=>{if(r.ok)window.location.replace("/dashboard")})},[]);
  async function entrar(e:FormEvent){e.preventDefault();setErro("");setEnviando(true);const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({usuario,senha})});setEnviando(false);if(r.ok)window.location.assign("/dashboard");else setErro("Login ou senha incorretos.");}
  return <main className="login-shell">
    <div className="login-brand" aria-hidden="true"><div className="brand-orbit orbit-one"/><div className="brand-orbit orbit-two"/><div className="brand-copy"><span className="eyebrow light">COMITÊ • PESQUISA 2026</span><h1>Dados que ajudam a enxergar cada rua.</h1><p>Acompanhamento consolidado das pesquisas por candidato, bairro e localidade.</p></div></div>
    <section className="login-panel"><form className="login-card" onSubmit={entrar}><div className="crest"><span>40</span></div><span className="eyebrow">ACESSO RESTRITO</span><h2>Painel administrativo</h2><p className="muted">Entre com as credenciais autorizadas para visualizar os resultados.</p>
      <label>Usuário<input value={usuario} onChange={e=>setUsuario(e.target.value)} autoComplete="username" placeholder="Digite seu usuário" required/></label>
      <label>Senha<input value={senha} onChange={e=>setSenha(e.target.value)} type="password" autoComplete="current-password" placeholder="Digite sua senha" required/></label>
      {erro&&<p className="form-error" role="alert">{erro}</p>}<button className="primary-button" disabled={enviando}>{enviando?"Verificando…":"Entrar no painel"}</button><p className="security-note">🔒 Sessão protegida e acesso exclusivo da administração.</p>
    </form></section>
  </main>;
}
