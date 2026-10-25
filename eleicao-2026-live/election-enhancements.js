/* Eleições 2026 — navegação geográfica, mapa real e região → estado.
   Mantém os dados eleitorais originais e usa apenas o TSE para o resultado. */
const ELECTION_REGIONS={
  "Norte":["AC","AP","AM","PA","RO","RR","TO"],
  "Nordeste":["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
  "Centro-Oeste":["DF","GO","MT","MS"],
  "Sudeste":["ES","MG","RJ","SP"],
  "Sul":["PR","RS","SC"]
};
const UF_NAMES={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
var electionRegion="ALL";
let electionGeoReady=false;
const money=n=>Number(n||0).toLocaleString("pt-BR");
const electionGeoBox=document.getElementById("tileMap");
const originalElectionMap=renderMap;
const originalElectionDraw=draw;
function electionRegionRender(){
 const target=document.getElementById("regionCards");if(!target)return;
 target.innerHTML=Object.entries(ELECTION_REGIONS).map(([region,ufs])=>{
  const arr=ufs.map(uf=>states.find(s=>s.uf===uf)).filter(d=>d&&d.l.v+d.f.v>0);
  const l=arr.reduce((v,d)=>v+d.l.v,0),f=arr.reduce((v,d)=>v+d.f.v,0),votes=l+f;
  const lp=votes?l/votes*100:0,fp=votes?f/votes*100:0;
  const nSections=arr.reduce((v,d)=>v+(d.st||0),0),totalSections=arr.reduce((v,d)=>v+(d.ts||0),0);
  const first=ufs.map(uf=>firstRoundResults[uf]).filter(Boolean);
  const firstL=first.reduce((v,d)=>v+d.l.v,0),firstF=first.reduce((v,d)=>v+d.f.v,0);
  const winner=!votes?"Aguardando boletins do TSE":l>f?"Lula à frente":f>l?"Flávio à frente":"Empate";
  return '<button class="region-entry'+(electionRegion===region?" selected":"")+'" type="button" data-election-region="'+region+'" aria-pressed="'+(electionRegion===region)+'">'+
   '<div class="region-small">'+arr.length+'/'+ufs.length+' estados com dados <span aria-hidden="true">↗</span></div>'+
   '<h3>'+region+'</h3><div class="region-leading">'+winner+'</div>'+
   '<div class="region-track"><i class="l" style="width:'+lp+'%"></i><i class="f" style="width:'+fp+'%"></i></div>'+
   '<div class="region-scores"><b>'+ (votes?fpct(lp):"—") +'</b><b>'+(votes?fpct(fp):"—")+'</b></div>'+
   '<div class="region-sub">'+(votes?money(votes)+" votos válidos contabilizados":"Aguardando dados oficiais")+
   '<br>'+(totalSections?fpct(100*nSections/totalSections)+" das seções disponíveis":"Totalização não publicada")+'</div>'+
   '<div class="region-history">'+(first.length===ufs.length?"1º turno final · Lula "+money(firstL)+" · Flávio "+money(firstF)+" votos":"1º turno · "+first.length+"/"+ufs.length+" UFs disponíveis")+'</div>'+
   '</button>';
 }).join("");
 const title=document.getElementById("statesTitle");
 if(title)title.textContent=electionRegion==="ALL"?"Panorama por estado":"Estados do "+electionRegion;
 const summary=document.getElementById("regionDescription");
 if(summary)summary.textContent=electionRegion==="ALL"?"Todas as 27 UFs. Selecione uma região acima para filtrar os estados.":ELECTION_REGIONS[electionRegion].map(uf=>UF_NAMES[uf]).join(" · ");
 const reset=document.getElementById("regionClear");
 if(reset)reset.hidden=electionRegion==="ALL";
}
function electionChooseRegion(name,scroll=false){
 electionRegion=ELECTION_REGIONS[name]?name:"ALL";
 if(electionRegion!=="ALL"&&!ELECTION_REGIONS[electionRegion].includes(selectedUF))selectedUF=ELECTION_REGIONS[electionRegion][0];
 draw();renderMap();
 if(scroll)document.getElementById("statesSection")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function geoX(lon){return 16+(lon+74.2)*13.0}
function geoY(lat){return 14+(5.5-lat)*13.0}
function geoGeometryToPath(geometry){
 const polygons=geometry?.type==="MultiPolygon"?geometry.coordinates:geometry?.type==="Polygon"?[geometry.coordinates]:[];
 return polygons.flatMap(poly=>poly.map(ring=>{
  const entries=[];for(const point of ring){
   const x=geoX(point[0]),y=geoY(point[1]),last=entries[entries.length-1];
   if(!last||(x-last[0])**2+(y-last[1])**2>.14)entries.push([x,y]);
  }
  if(entries.length<3)return "";
  return "M"+entries.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join("L")+"Z";
 })).filter(Boolean).join(" ");
}
function electionPaintGeo(){
 if(!electionGeoReady)return originalElectionMap();
 const byUF=new Map(states.map(d=>[d.uf,d]));
 electionGeoBox.querySelectorAll("[data-uf]").forEach(path=>{
  const uf=path.dataset.uf,record=byUF.get(uf);
  const lead=record&&record.l.v+record.f.v>0?who(record):"t";
  path.setAttribute("class","geo-state "+lead+(selectedUF===uf?" selected":"")+
   (electionRegion!=="ALL"&&!ELECTION_REGIONS[electionRegion].includes(uf)?" dimmed":""));
  path.setAttribute("aria-pressed",String(selectedUF===uf));
 });
 const d=byUF.get(selectedUF);
 const region=Object.keys(ELECTION_REGIONS).find(r=>ELECTION_REGIONS[r].includes(selectedUF));
 const detail=document.getElementById("mapDetail");
 if(!d||!(d.l.v+d.f.v)){
  detail.innerHTML='<h4>'+UF_NAMES[selectedUF]+'</h4><div class="leadline">'+region+' · '+selectedUF+'</div>'+
   '<p class="geo-empty">Aguardando a totalização oficial do TSE para este estado.</p>'+
   '<button type="button" class="geo-openstate" id="geoOpenState">Ver estados da região</button>';
 }else{
  const lead=who(d)==="l"?"Lula à frente":who(d)==="f"?"Flávio à frente":"Empate";
  detail.innerHTML='<h4>'+UF_NAMES[d.uf]+'</h4><div class="leadline">'+region+' · '+d.uf+' · '+lead+' · '+fpct(d.a)+' apurado</div>'+
   '<div class="mapnumbers"><div class="mapnum l"><span class="lab">Lula</span><b>'+fpct(d.l.p)+'</b><span class="sm">'+fi(d.l.v)+' votos</span></div>'+
   '<div class="mapnum f"><span class="lab">Flávio</span><b>'+fpct(d.f.p)+'</b><span class="sm">'+fi(d.f.v)+' votos</span></div></div>'+
   '<div class="mapfoot">Diferença de '+fi(Math.abs(d.l.v-d.f.v))+' votos · '+fpct(Math.abs(d.l.p-d.f.p)).replace("%"," p.p.")+
   '<br>Lula no último lote: '+batchDeltaText(d.dlv,d.dlp)+
   '<br>Flávio no último lote: '+batchDeltaText(d.dfv,d.dfp)+'</div>'+firstLineForMap(d)+
   '<button type="button" class="geo-openstate" id="geoOpenState">Abrir região e estados</button>';
 }
 document.getElementById("geoOpenState")?.addEventListener("click",()=>electionChooseRegion(region,true));
}
draw=function(){originalElectionDraw();electionRegionRender();};
renderMap=function(){electionPaintGeo();};
async function loadElectionGeo(){
 const status=document.getElementById("geoStatus");
 try{
  const res=await fetch("brasil-estados.geojson",{cache:"force-cache"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const geo=await res.json();
  const shapes=geo.features.filter(f=>U.includes(f.properties?.sigla));
  if(shapes.length!==27||new Set(shapes.map(f=>f.properties.sigla)).size!==27)throw Error("Faltam estados na geometria");
  const markup=shapes.map(f=>{
   const uf=f.properties.sigla;
   return '<path class="geo-state t" d="'+geoGeometryToPath(f.geometry)+'" data-uf="'+uf+
    '" tabindex="0" role="button" aria-label="'+UF_NAMES[uf]+'"><title>'+UF_NAMES[uf]+'</title></path>';
  }).join("");
  const labels={AM:[-63.4,-4.5],PA:[-52.8,-4],MT:[-56,-13],MG:[-44.7,-18.3],BA:[-41.5,-12.9],
   SP:[-48.3,-22.6],RS:[-53,-30],PR:[-51,-24.8],GO:[-49,-16.1],MS:[-54,-20.8],RO:[-63.2,-11],
   AC:[-70.3,-9.5],TO:[-48.3,-10.2],MA:[-45.3,-5.4],PI:[-42.7,-7.2],CE:[-39.3,-5],
   PE:[-37.8,-8.3],RJ:[-42.9,-22.8],SC:[-50.2,-27.2],ES:[-40.3,-19.4],PB:[-36.7,-7.2],
   RN:[-36,-5.7],SE:[-37.4,-10.8],AL:[-36.4,-9.7],RR:[-61.5,2.2],AP:[-51.8,1.3]};
  const textLabels=Object.entries(labels).map(([uf,p])=>'<text class="geo-label" x="'+geoX(p[0])+
    '" y="'+geoY(p[1])+'">'+uf+'</text>').join("");
  electionGeoBox.classList.add("geo-map");
  electionGeoBox.innerHTML='<svg viewBox="0 0 552 552" class="geo-svg" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Mapa do Brasil com limites reais e seleção dos 27 estados">'+markup+textLabels+'</svg>';
  electionGeoReady=true;
  status.textContent="Malhas geográficas reais (IBGE) · toque em cada estado para ver o resultado oficial.";
  renderMap();
 }catch(e){
  status.textContent="Não foi possível carregar o mapa geográfico. Os botões de UFs continuam disponíveis.";
  electionGeoReady=false;originalElectionMap();
 }
}
document.getElementById("regionCards")?.addEventListener("click",event=>{
 const entry=event.target.closest("[data-election-region]");
 if(entry)electionChooseRegion(entry.dataset.electionRegion,true);
});
document.getElementById("regionClear")?.addEventListener("click",()=>electionChooseRegion("ALL",true));
electionGeoBox.addEventListener("keydown",event=>{
 const path=event.target.closest("[data-uf]");
 if(path&&(event.key==="Enter"||event.key===" ")){
  event.preventDefault();path.dispatchEvent(new MouseEvent("click",{bubbles:true}));
 }
});
/* Handler do aplicativo original já escuta clique no mapa. Atualiza também filtro de região. */
electionGeoBox.addEventListener("click",event=>{
 const path=event.target.closest("[data-uf]");
 if(!path)return;
 selectedUF=path.dataset.uf;
 const r=Object.keys(ELECTION_REGIONS).find(k=>ELECTION_REGIONS[k].includes(selectedUF));
 if(electionRegion!=="ALL"&&r!==electionRegion)electionRegion="ALL";
 draw();renderMap();
});
electionRegionRender();
loadElectionGeo();
