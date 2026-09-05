import {NextResponse} from "next/server";

type Office="Estadual"|"Federal";
type JsonRecord=Record<string,unknown>;

const configured=[
 {key:"romeu",name:"Romeu",number:"40777",office:"Estadual"},
 {key:"sergio",name:"Sérgio Aguiar",number:"40888",office:"Estadual"},
 {key:"james",name:"James Bel",number:"44111",office:"Estadual"},
 {key:"mosesFilho",name:"Moses Filho",number:"44444",office:"Estadual"},
 {key:"euvaldete",name:"Euvaldete",number:"45455",office:"Estadual"},
 {key:"zeAirton",name:"Zé Airton",number:"1333",office:"Federal"},
 {key:"yury",name:"Yury do Paredão",number:"1515",office:"Federal"},
 {key:"roger",name:"Roger",number:"4044",office:"Federal"},
 {key:"tainah",name:"Tainah Marinho",number:"4077",office:"Federal"},
 {key:"mosesRodrigues",name:"Moses Rodrigues",number:"4444",office:"Federal"},
 {key:"dayany",name:"Dayany do Capitão",number:"4445",office:"Federal"}
] as const;

const record=(value:unknown):JsonRecord=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const value=(item:JsonRecord,...keys:string[])=>{for(const key of keys){if(item[key]!==undefined&&item[key]!==null)return String(item[key]).trim()}return ""};
const numeric=(item:JsonRecord,...keys:string[])=>Number(value(item,...keys).replace(/\./g,"").replace(",","."))||0;

async function fetchCandidates(url:string,office:Office){
 const response=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});
 if(!response.ok)throw new Error(`${office}: HTTP ${response.status}`);
 const payload:unknown=await response.json(),root=record(payload),raw=[root.cand,root.candidatos,root.candidates].find(Array.isArray) as unknown[]|undefined;
 const votes=new Map<string,number>();
 for(const entry of raw||[]){const candidate=record(entry),number=value(candidate,"n","numero","nrCandidato","numeroCandidato").replace(/\D/g,"");votes.set(number,numeric(candidate,"vap","votos","qtVotos","votosValidos"))}
 return {root,votes};
}

export async function GET(){
 const estadualUrl=process.env.TSE_ESTADUAL_RESULTS_URL||process.env.TSE_RESULTS_URL;
 const federalUrl=process.env.TSE_FEDERAL_RESULTS_URL;
 if(!estadualUrl||!federalUrl)return NextResponse.json({rows:[],candidateMeta:[],source:"demo",updatedAt:new Date().toISOString(),message:"Aguardando os dois endereços oficiais do TSE 2026: estadual e federal"});
 try{
  const [estadual,federal]=await Promise.all([fetchCandidates(estadualUrl,"Estadual"),fetchCandidates(federalUrl,"Federal")]);
  const byKey=Object.fromEntries(configured.map(candidate=>[candidate.key,(candidate.office==="Estadual"?estadual:federal).votes.get(candidate.number)||0]));
  const candidateMeta=configured.filter(candidate=>candidate.key!=="sergio"&&candidate.key!=="roger");
  return NextResponse.json({
   rows:[{section:"TSE",location:"Total oficial",municipality:"Ceará",votes:byKey.sergio,federalVotes:byKey.roger,eligible:numeric(estadual.root,"e","eleitores","eleitoresAptos"),candidateVotes:byKey}],
   candidateMeta,federalCandidate:"Roger 4044",source:"sheet",updatedAt:new Date().toISOString()
  });
 }catch(error){
  console.error("[api/tse] Falha ao consultar resultados oficiais",error);
  return NextResponse.json({rows:[],candidateMeta:[],source:"demo",updatedAt:new Date().toISOString(),message:"Resultados do TSE temporariamente indisponíveis"},{status:503});
 }
}
