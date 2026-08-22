import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const candidateColumns: Record<string, number> = {
  "SÉRGIO":3,"ROMEU":4,"EUVALDETE":5,"OUTROS EST.":6,"INDECISOS EST.":7,
  "ROGER":8,"TAYNA":9,"OUTROS FED.":10,"INDECISOS FED.":11,
  "CID GOMES":12,"LUIZIANE":13,"CAP. WAGNER":14,"ALCIDES":15,"OUTROS SEN.":16,"INDECISOS SEN.":17,
  "ELMANO":18,"CIRO":19,"OUTROS GOV.":20,"INDECISOS GOV.":21,
  "LULA":22,"FLÁVIO":23,"OUTROS PRES.":24,"INDECISOS PRES.":25,
};

export async function GET(){
  const jar=await cookies();
  const token=process.env.SESSION_TOKEN||"painel-comite-sergio-aguiar-2026";
  if(jar.get("painel_session")?.value!==token)return NextResponse.json({erro:"Não autorizado"},{status:401});
  const id=process.env.GOOGLE_SHEET_ID||"1jabSU0G5IYoKP6raGtZszQuV8Ti92MJu9E44zkOWrCc";
  try{
    const summary=await fetchSheet(id,"RESUMO POR RUA");
    const headers=summary[0]||[];
    const rows=summary.slice(1).filter(r=>r[0]&&r[1]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,i<2?r[i]:number(r[i])])));
    const bairros=Array.from(new Set(rows.map(r=>String(r["BAIRRO/ÁREA"]))));
    const visitas=(await Promise.all(bairros.map(async bairro=>parseVisits(bairro,await fetchSheet(id,bairro))))).flat();
    return NextResponse.json({rows,visitas,atualizadoEm:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
  }catch(e){return NextResponse.json({erro:e instanceof Error?e.message:"Falha ao ler dados"},{status:502})}
}

async function fetchSheet(id:string,sheet:string){
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw new Error("Acesso à planilha indisponível");
  return parseCsv(await response.text());
}

function parseVisits(bairro:string,rows:string[][]){
  const result:Record<string,string|number>[]=[];
  const first=rows.findIndex(r=>String(r[0]).includes("1ª VISITA"));
  const second=rows.findIndex(r=>String(r[0]).includes("2ª VISITA"));
  if(first<0||second<0)return result;
  const firstRows=section(rows,first+2,second);
  const nextMarker=rows.findIndex((r,i)=>i>second&&String(r[0]).includes("VISITA EXTRA"));
  const secondRows=section(rows,second+2,nextMarker<0?rows.length:nextMarker);
  const secondByStreet=new Map(secondRows.map(r=>[normalize(r[0]),r]));
  for(const row1 of firstRows){
    const row2=secondByStreet.get(normalize(row1[0]))||[];
    const item:Record<string,string|number>={"BAIRRO/ÁREA":bairro,"RUA/LOCALIDADE":row1[0],"FECHADAS 1ª":number(row1[1]),"FECHADAS 2ª":number(row2[1]),"DESAB. 1ª":number(row1[2]),"DESAB. 2ª":number(row2[2])};
    for(const [name,index] of Object.entries(candidateColumns)){item[`${name} 1ª`]=number(row1[index]);item[`${name} 2ª`]=number(row2[index])}
    result.push(item);
  }
  return result;
}

function section(rows:string[][],start:number,end:number){return rows.slice(start,end).filter(r=>r[0]&&normalize(r[0])!=="TOTAL"&&!String(r[0]).startsWith("RUAS -"))}
function normalize(value:string){return String(value||"").trim().toLocaleUpperCase("pt-BR")}
function number(value:string|undefined){const normalized=String(value||"0").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");return Number(normalized)||0}
function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(field);field=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=""}else field+=c}row.push(field);if(row.some(Boolean))rows.push(row);return rows}
