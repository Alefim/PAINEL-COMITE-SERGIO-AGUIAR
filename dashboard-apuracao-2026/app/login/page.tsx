"use client";
import {FormEvent,useState}from"react";
import styles from"./login.module.css";

export default function LoginPage(){
 const[loading,setLoading]=useState(false),[error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setLoading(true);setError("");
  const form=new FormData(event.currentTarget);
  try{const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})}),payload=await response.json();if(!response.ok){setError(payload.error||"Não foi possível entrar.");return}window.location.replace("/")}catch{setError("Falha de conexão. Tente novamente.")}finally{setLoading(false)}
 }
 return <main className={styles.page}><section className={styles.card}><div className={styles.brand}><span className={styles.mark}>40</span><div><strong>APURAÇÃO 2026</strong><small>Sérgio Aguiar · Deputado Estadual</small></div></div><h1>Acesso ao painel</h1><p className={styles.intro}>Informe o login e a senha para acompanhar a apuração.</p><form className={styles.form} onSubmit={submit}><label className={styles.field}>Login<input name="username" autoComplete="username" required autoFocus/></label><label className={styles.field}>Senha<input name="password" type="password" autoComplete="current-password" required/></label>{error?<p className={styles.error} role="alert">{error}</p>:null}<button className={styles.submit} disabled={loading}>{loading?"Entrando…":"Entrar no painel"}</button></form><p className={styles.footer}>Acesso restrito · Desenvolvido por Álefim Oliveira</p></section></main>
}
