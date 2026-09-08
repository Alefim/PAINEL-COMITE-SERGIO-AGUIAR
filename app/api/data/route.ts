import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const AREA_GIDS:Record<string,number>={
  "SÃO JOÃO - RODAGEM DO LAGO":1132242099,
  "NOSSA SENHORA DE FATIMA":1666931939,
  "TAPETE VERDE - COHAB":1437684987,
  "CRUZEIRO":1209992470,
  "CENTRO":685138383,
  "ANTONIO MAGALHÃES E APOSSADOS":1884500375,
  "COQUEIROS":334192618,
  "BRASILIA":1695498996,
  "BOA ESPERANÇA":1943812408,
  "SÃO PEDRO - PRAIA":1427614696,
  "JARDIM DAS OLIVEIRAS - CIDADE C":479519684,
  "ZONA RURAL I":366741798,
  "ZONA RURAL II":1726224980,
  "BONITO III":2003300126,
  "OLINDA":185075567,
};

export async function GET(){
  const jar=await cookies();
  const token=process.env.SESSION_TOKEN||"painel-comite-sergio-aguiar-2026";
  if(jar.get("painel_session")?.value!==token)return NextResponse.json({erro:"Não autorizado"},{status:401});
  const id="1flygUldKpGBRS0pOZxJdk2HGQRiXeBDbKj2LmJlJxkM";
  try{
    const [summary,bairroSheet]=await Promise.all([
      fetchSheet(id,"RESUMO POR RUA","A:AG"),
      fetchSheet(id,"RESUMO POR BAIRRO","A:AF"),
    ]);
    const headers=summary[0]||[];
    const rows=summary.slice(1).filter(r=>r[0]&&r[1]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,i<2?r[i]:number(r[i])])));
    const bairroHeaders=bairroSheet[0]||[];
    const visitas=bairroSheet.slice(1).filter(r=>r[0]&&normalize(r[0])!=="TOTAL GERAL").map(r=>Object.fromEntries(bairroHeaders.map((h,i)=>[h,i===0?r[i]:number(r[i])])));
    const areaSheets=visitas.map(r=>String(r["BAIRRO/ÁREA"]||"")).filter(Boolean);

    // As abas territoriais misturam cabeçalhos textuais e valores numéricos
    // nas mesmas colunas. O GViz pode tipar essas colunas como numéricas e
    // eliminar textos como SÉRGIO/ROMEU/ROGER. Por isso elas são lidas pelo
    // export CSV direto da guia (gid), que preserva os valores literais.
    const areaData=await Promise.all(areaSheets.map(async bairro=>{
      const gid=AREA_GIDS[bairro];
      if(gid===undefined)throw new Error(`Guia territorial não mapeada: ${bairro}`);
      return {bairro,data:await fetchSheetExport(id,gid)};
    }));

    const visitaRows=areaData.flatMap(({bairro,data})=>extractVisitRows(bairro,data));
    return NextResponse.json({rows,visitas,visitaRows,totalRuas:rows.length,totalBairros:visitas.length,atualizadoEm:new Date().toISOString()},{headers:{"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"}});
  }catch(e){return NextResponse.json({erro:e instanceof Error?e.message:"Falha ao ler dados"},{status:502,headers:{"cache-control":"no-store"}})}
}

async function fetchSheet(id:string,sheet:string,range:string){
  const params=new URLSearchParams({tqx:"out:csv",sheet,range,headers:"1"});
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?${params}`;
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw new Error("Acesso à planilha indisponível");
  return parseCsv(await response.text());
}

async function fetchSheetExport(id:string,gid:number){
  const params=new URLSearchParams({format:"csv",gid:String(gid)});
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?${params}`;
  const response=await fetch(url,{cache:"no-store",headers:{"cache-control":"no-cache"}});
  if(!response.ok)throw new Error(`Acesso à guia ${gid} indisponível`);
  return parseCsv(await response.text());
}

function normalize(value:string){return String(value||"").trim().toLocaleUpperCase("pt-BR")}
function markerKey(value:string){return normalize(value).replace(/[ªº]/g,"A").replace(/\s+/g," ")}
function number(value:string|undefined){const normalized=String(value||"0").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");return Number(normalized)||0}
function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(field);field=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);rows.push(row);row=[];field=""}else field+=c}row.push(field);if(row.some(v=>v!==""))rows.push(row);return rows}

function extractVisitRows(bairro:string,data:string[][]){
  const result:Record<string,string|number>[]=[];
  let visita="";
  let columns:Record<number,string>={};
  for(let i=0;i<data.length;i++){
    const marker=markerKey(data[i]?.[0]||"");
    if(marker.includes("1A VISITA")){visita="1ª visita";columns=visitColumns(data[i],data[i+1]||[]);continue}
    if(marker.includes("2A VISITA")){visita="2ª visita";columns=visitColumns(data[i],data[i+1]||[]);continue}
    if(marker.includes("VISITA EXTRA")){visita="Visita extra";columns=visitColumns(data[i],data[i+1]||[]);continue}
    if(!visita||marker==="RUA/LOCALIDADE"||marker==="TOTAL"||!data[i]?.[0])continue;
    const row=data[i];
    const record:Record<string,string|number>={"BAIRRO/ÁREA":bairro,"RUA/LOCALIDADE":row[0],VISITA:visita,"CASAS FECHADAS":number(row[1]),"CASAS DESABITADAS":number(row[2])};
    Object.entries(columns).forEach(([index,name])=>record[name]=number(row[Number(index)]));
    result.push(record);
  }
  return result;
}

function visitColumns(groups:string[],headers:string[]){
  const result:Record<number,string>={};
  let group="";
  for(let i=3;i<Math.max(groups.length,headers.length);i++){
    if(groups[i])group=normalize(groups[i]);
    const header=normalize(headers[i]);
    if(!header)continue;
    let name=header;
    if(header.startsWith("OUTR"))name=group.includes("ESTADUAL")?"OUTROS EST.":group.includes("FEDERAL")?"OUTROS FED.":group.includes("SENADOR")?"OUTROS SEN.":group.includes("GOVERNADOR")?"OUTROS GOV.":"OUTROS PRES.";
    if(header.startsWith("IND"))name=group.includes("ESTADUAL")?"INDECISOS EST.":group.includes("FEDERAL")?"INDECISOS FED.":group.includes("SENADOR")?"INDECISOS SEN.":group.includes("GOVERNADOR")?"INDECISOS GOV.":"INDECISOS PRES.";
    if(header==="OBSERVAÇÕES"||header==="OBSERVACOES")name="OBSERVAÇÕES";
    result[i]=name;
  }
  return result;
}
