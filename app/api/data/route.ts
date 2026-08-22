import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(){
  const jar=await cookies();
  const token=process.env.SESSION_TOKEN||"painel-comite-sergio-aguiar-2026";
  if(jar.get("painel_session")?.value!==token)return NextResponse.json({erro:"Não autorizado"},{status:401});
  const id=process.env.GOOGLE_SHEET_ID||"1jabSU0G5IYoKP6raGtZszQuV8Ti92MJu9E44zkOWrCc";
  try{
    const summary=await fetchSheet(id,"RESUMO POR RUA");
    const headers=summary[0]||[];
    const rows=summary.slice(1).filter(r=>r[0]&&r[1]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,i<2?r[i]:number(r[i])])));
    const bairroSheet=await fetchSheet(id,"RESUMO POR BAIRRO");
    const bairroHeaders=bairroSheet[0]||[];
    const visitas=bairroSheet.slice(1).filter(r=>r[0]&&normalize(r[0])!=="TOTAL GERAL").map(r=>Object.fromEntries(bairroHeaders.map((h,i)=>[h,i===0?r[i]:number(r[i])])));
    return NextResponse.json({rows,visitas,atualizadoEm:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
  }catch(e){return NextResponse.json({erro:e instanceof Error?e.message:"Falha ao ler dados"},{status:502})}
}

async function fetchSheet(id:string,sheet:string){
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw new Error("Acesso à planilha indisponível");
  return parseCsv(await response.text());
}

function normalize(value:string){return String(value||"").trim().toLocaleUpperCase("pt-BR")}
function number(value:string|undefined){const normalized=String(value||"0").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");return Number(normalized)||0}
function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(field);field=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=""}else field+=c}row.push(field);if(row.some(Boolean))rows.push(row);return rows}
