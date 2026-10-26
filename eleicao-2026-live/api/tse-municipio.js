// Narrow, same-origin bridge for official TSE municipality results.
// Browsers may be blocked by the TSE CDN's CORS policy. No arbitrary URLs accepted.
const UF=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
module.exports=async function handler(req,res){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Método não permitido"});}
  const u=new URL(req.url,"https://app.local");
  const resource=u.searchParams.get("resource");
  const uf=String(u.searchParams.get("uf")||"").toUpperCase();
  const code=String(u.searchParams.get("code")||"");
  let path,cacheSeconds;
  if(resource==="catalog"&&!u.searchParams.has("uf")&&!u.searchParams.has("code")){
    path="config/mun-e006258-cm.json";cacheSeconds=900;
  }else if(!resource&&UF.has(uf)&&/^\d{5}$/.test(code)){
    const s=uf.toLowerCase();
    path="dados/"+s+"/"+s+code+"-c0001-e006258-u.json";cacheSeconds=45;
  }else{return res.status(400).json({error:"Parâmetros inválidos"});}
  try{
    const response=await fetch("https://resultados.tse.jus.br/oficial/ele2026/6258/"+path,{
      headers:{"accept":"application/json"},
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok){
      res.setHeader("Cache-Control","public, s-maxage=15");
      return res.status(response.status===404?404:502).json({error:response.status===404?"Arquivo ainda não disponível no TSE":"Falha temporária no TSE"});
    }
    const text=await response.text();
    if(text.length>2000000)return res.status(502).json({error:"Arquivo excede limite seguro"});
    let parsed;
    try{parsed=JSON.parse(text)}catch{return res.status(502).json({error:"Resposta não é JSON válido"});}
    res.setHeader("Cache-Control","public, s-maxage="+cacheSeconds+", stale-while-revalidate=120");
    res.setHeader("X-Data-Source","TSE-2026-official");
    return res.status(200).json(parsed);
  }catch(e){
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({error:"Não foi possível consultar o TSE neste momento"});
  }
};
