"use client";
import{useEffect,useMemo,useState}from"react";
type Row={municipality:string;votes:number;ibgeCode?:string};type Feature={properties:{codarea:string;nome:string};geometry:{type:"Polygon"|"MultiPolygon";coordinates:any}};const W=520,H=570,P=18;
const rings=(f:Feature):number[][][]=>f.geometry.type==="Polygon"?f.geometry.coordinates:f.geometry.coordinates.flat();
export default function CearaMap({rows,selected,onSelect}:{rows:Row[];selected:string;onSelect:(city:string)=>void}){
 const[features,setFeatures]=useState<Feature[]>([]),[hover,setHover]=useState<string|null>(null);
 useEffect(()=>{fetch("/ceara-municipios.geojson").then(r=>r.json()).then(g=>setFeatures(g.features)).catch(()=>setFeatures([]))},[]);
 const byCode=useMemo(()=>{const m=new Map<string,number>();for(const r of rows)if(r.ibgeCode)m.set(r.ibgeCode,(m.get(r.ibgeCode)||0)+r.votes);return m},[rows]);
 const bounds=useMemo(()=>{const pts=features.flatMap(f=>rings(f).flat());return pts.length?[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]:[-41.5,-7.9,-37.1,-2.7]},[features]);
 const path=(f:Feature)=>rings(f).map(r=>r.map(([x,y],i)=>{const px=P+(x-bounds[0])/(bounds[2]-bounds[0])*(W-P*2),py=H-P-(y-bounds[1])/(bounds[3]-bounds[1])*(H-P*2);return`${i?"L":"M"}${px.toFixed(1)},${py.toFixed(1)}`}).join("")+"Z").join("");
 const max=Math.max(1,...Array.from(byCode.values())),active=hover?features.find(f=>f.properties.codarea===hover):null,activeVotes=active?byCode.get(active.properties.codarea)||0:0;
 const color=(f:Feature)=>{const votes=byCode.get(f.properties.codarea)||0,ratio=votes/max;if(f.properties.nome===selected)return"#ffb020";if(!ratio)return"#0b6689";return ratio>.66?"#18d8d2":ratio>.33?"#1ca0aa":"#197998"};
 return <div className="real-map">{!features.length&&<div className="map-loading">Carregando mapa do Ceará…</div>}<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa dos 184 municípios do Ceará">{features.map(f=><path key={f.properties.codarea} d={path(f)} fill={color(f)} className="municipality" onMouseEnter={()=>setHover(f.properties.codarea)} onMouseLeave={()=>setHover(null)} onClick={()=>onSelect(f.properties.nome)}><title>{f.properties.nome}: {byCode.get(f.properties.codarea)||0} votos</title></path>)}</svg>{active&&<div className="map-tooltip"><b>{active.properties.nome}</b><span>{activeVotes.toLocaleString("pt-BR")} votos</span></div>}<div className="map-scale"><span>0</span><i/><span>{max.toLocaleString("pt-BR")} votos</span></div></div>
}
