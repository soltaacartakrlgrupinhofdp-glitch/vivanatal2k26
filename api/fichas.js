import { timingSafeEqual } from 'node:crypto';
const url=process.env.UPSTASH_REDIS_REST_URL;
const token=process.env.UPSTASH_REDIS_REST_TOKEN;
// Fichas e índices históricos não expiram automaticamente.
const TTL=60*60*24*90;
const ID_RE=/^[-\w]{5,128}$/;

function authorized(req){
 const expected=process.env.ADMIN_PASSWORD||'';
 const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!expected||!supplied)return false;
 const a=Buffer.from(supplied),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
async function redis(...args){
 const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!r.ok)throw new Error('Falha no armazenamento');
 const j=await r.json();if(j.error)throw new Error('Falha no armazenamento');return j.result;
}
async function getFicha(id){
 const data=await redis('GET',`ficha:${id}`);
 if(!data)return null;
 try{return JSON.parse(data)}catch{return null}
}
const saveFicha=item=>redis('SET',`ficha:${item.id}`,JSON.stringify(item));
const isPago=s=>s==='pago';

// Fichas antigas não têm a lista de transações: cria a partir dos campos da própria ficha
function transacoesDe(f){
 if(Array.isArray(f.transacoes)&&f.transacoes.length)return f.transacoes;
 return [{id:f.id,quantidade:f.quantidade,valor:f.valor,criado_em:f.criado_em,status:isPago(f.status)?'pago':'pix_gerado'}];
}

// Junta todos os registros do mesmo CPF numa ficha só (1 pessoa = 1 ficha)
function agrupar(rows){
 const grupos=new Map();
 for(const r of rows){const k=r.cpf||r.id;if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(r)}
 const out=[];
 for(const recs of grupos.values()){
  recs.sort((a,b)=>new Date(a.criado_em)-new Date(b.criado_em));
  const main=recs[0],ultimo=recs[recs.length-1];
  const txMap=new Map();
  recs.forEach(r=>transacoesDe(r).forEach(t=>{const old=txMap.get(t.id);if(!old||isPago(t.status))txMap.set(t.id,t)}));
  const tx=[...txMap.values()].sort((a,b)=>new Date(a.criado_em)-new Date(b.criado_em));
  const pagas=tx.filter(t=>isPago(t.status));
  const ref=pagas.length?pagas[pagas.length-1]:tx[tx.length-1];
  out.push({
   id:main.id,ids:recs.map(r=>r.id),cpf:main.cpf,
   nome:ultimo.nome||main.nome,data_nascimento:ultimo.data_nascimento||main.data_nascimento,telefone:ultimo.telefone||main.telefone,
   quantidade:ref.quantidade,valor:ref.valor,transacao:ref.id,
   status:pagas.length?'pago':'pix_gerado',pago_em:recs.map(r=>r.pago_em).filter(Boolean).sort().pop()||null,
   pego:recs.some(r=>r.pego),
   pix_count:tx.length,pix_pagos:pagas.length,
   criado_em:main.criado_em,ultimo_pix_em:tx[tx.length-1].criado_em,
   transacoes:tx
  });
 }
 return out.sort((a,b)=>new Date(b.ultimo_pix_em)-new Date(a.ultimo_pix_em));
}

// Confirma no gateway antes de marcar como paga (evita que alguém marque fichas falsamente)
// Consulta a cobrança diretamente na BluePag antes de confirmar uma ficha.
async function pagoNoGateway(id){
 try{const {bluepag}=await import('./bluepag-client.js');const d=(await bluepag('/payments/'+encodeURIComponent(id))).data||{};return d.status==='completed'}catch(e){console.error('BluePag confirmation failed',e.status||502);return false}
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!url||!token)return res.status(503).json({error:'Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel'});
 try{
  if(req.method==='POST'&&req.body?.action==='import'){
   if(!authorized(req))return res.status(401).json({error:'Não autorizado'});
   const payload=req.body.payload||{},rows=payload.fichas;
   if(payload.format!=='fichas-portable-v1'||!Array.isArray(rows)||rows.length>250)return res.status(400).json({error:'JSON inválido ou lote acima de 250 fichas'});
   let imported=0,skipped=0;
   for(const item of rows){if(!item||!ID_RE.test(String(item.id||''))||!/^\d{11}$/.test(String(item.cpf||''))||await getFicha(item.id)){skipped++;continue}
    const cpfKey=String(item.cpf);const previousId=await redis('GET',`cpfidx:${cpfKey}`);const previous=previousId?await getFicha(previousId):null;
    const clean={id:String(item.id),cpf:String(item.cpf),nome:String(item.nome||'').slice(0,120),data_nascimento:String(item.data_nascimento||'').slice(0,30),telefone:String(item.telefone||'').replace(/\D/g,'').slice(0,13),quantidade:Number(item.quantidade)||0,valor:Number(item.valor)||0,status:item.status==='pago'?'pago':'pix_gerado',pego:item.pego===true,criado_em:item.criado_em||new Date().toISOString(),ultimo_pix_em:item.ultimo_pix_em||item.criado_em||new Date().toISOString(),pago_em:item.pago_em||null,transacoes:Array.isArray(item.transacoes)?item.transacoes.slice(0,100).filter(t=>ID_RE.test(String(t.id||''))).map(t=>({id:String(t.id),quantidade:Number(t.quantidade)||0,valor:Number(t.valor)||0,criado_em:t.criado_em||new Date().toISOString(),status:t.status==='pago'?'pago':'pix_gerado'})):[]};
    if(previous){
     previous.transacoes=transacoesDe(previous);const ids=new Set(previous.transacoes.map(t=>t.id));
     for(const t of transacoesDe(clean)){if(!ids.has(t.id)){previous.transacoes.push(t);ids.add(t.id)}await redis('SET',`tx:${t.id}`,previous.id)}
     previous.pego=!!(previous.pego||clean.pego);previous.status=previous.transacoes.some(t=>t.status==='pago')?'pago':previous.status;
     previous.pago_em=[previous.pago_em,clean.pago_em].filter(Boolean).sort().pop()||null;
     previous.nome=previous.nome||clean.nome;previous.telefone=previous.telefone||clean.telefone;
     previous.ultimo_pix_em=[previous.ultimo_pix_em,clean.ultimo_pix_em].filter(Boolean).sort().pop();
     await saveFicha(previous);await redis('ZADD','fichas:indices',new Date(previous.ultimo_pix_em).getTime()||Date.now(),previous.id);imported++;continue;
    }
    await saveFicha(clean);await redis('ZADD','fichas:indices',new Date(clean.ultimo_pix_em).getTime()||Date.now(),clean.id);await redis('SET',`cpfidx:${clean.cpf}`,clean.id);for(const t of clean.transacoes)await redis('SET',`tx:${t.id}`,clean.id);imported++;
   }return res.json({ok:true,imported,skipped});
  }
  if(req.method==='POST'){
   const x=req.body||{};
   // Atualização de status para "pago" enviada pelo site após confirmação do PIX
   if(x.action==='pago'){
    const txId=String(x.transaction_id||'');
    if(!ID_RE.test(txId))return res.status(400).json({error:'ID inválido'});
    const fichaId=(await redis('GET',`tx:${txId}`))||txId;
    const item=await getFicha(fichaId);
    if(!item)return res.status(404).json({error:'Ficha não encontrada'});
    item.transacoes=transacoesDe(item);
    const t=item.transacoes.find(t=>t.id===txId);
    if(t&&isPago(t.status))return res.status(200).json({ok:true});
    if(!(await pagoNoGateway(txId)))return res.status(409).json({error:'Pagamento não confirmado'});
    if(t)t.status='pago';
    item.status='pago';item.pago_em=new Date().toISOString();
    await saveFicha(item);
    return res.status(200).json({ok:true});
   }
   const cpf=String(x.cpf||'').replace(/\D/g,''),tel=String(x.telefone||'').replace(/\D/g,'');
   const qtd=Number(x.quantidade),valor=Number(x.valor),id=String(x.transaction_id||'');
   if(cpf.length!==11||tel.length<10||!Number.isInteger(qtd)||qtd<15||qtd>500||Math.abs(valor-qtd*.49)>.011||!ID_RE.test(id))return res.status(400).json({error:'Dados inválidos'});
   const agora=new Date().toISOString();
   const nova={id,quantidade:qtd,valor,criado_em:agora,status:'pix_gerado'};
   const dados={nome:String(x.nome||'').slice(0,120),data_nascimento:String(x.data_nascimento||'').slice(0,30),telefone:tel};

   // Mesmo CPF já tem ficha? Adiciona o PIX novo nela em vez de criar outra
   const existenteId=await redis('GET',`cpfidx:${cpf}`);
   const existente=existenteId?await getFicha(existenteId):null;
   if(existente){
    existente.transacoes=transacoesDe(existente);
    if(!existente.transacoes.some(t=>t.id===id))existente.transacoes.push(nova);
    Object.assign(existente,{nome:dados.nome||existente.nome,data_nascimento:dados.data_nascimento||existente.data_nascimento,telefone:tel,ultimo_pix_em:agora});
    if(!isPago(existente.status)){existente.quantidade=qtd;existente.valor=valor}
    await saveFicha(existente);
    await redis('SET',`tx:${id}`,existente.id);
    
    await redis('ZADD','fichas:indices',Date.now(),existente.id);
    return res.status(200).json({ok:true,agrupada:true});
   }
   const item={id,cpf,...dados,quantidade:qtd,valor,status:'pix_gerado',pego:false,criado_em:agora,ultimo_pix_em:agora,transacoes:[nova]};
   await saveFicha(item);
   await redis('SET',`cpfidx:${cpf}`,id);
   await redis('SET',`tx:${id}`,id);
   await redis('ZADD','fichas:indices',Date.now(),id);
   return res.status(201).json({ok:true});
  }
  if(!authorized(req))return res.status(401).json({error:'Acesso não autorizado'});
  const listaIds=x=>[...new Set((Array.isArray(x)?x:String(x||'').split(',')).map(String).filter(i=>ID_RE.test(i)))].slice(0,50);
  if(req.method==='GET'){
   const isExport=req.query.action==='export';const start=Math.max(0,Number.parseInt(req.query.offset,10)||0);const limit=isExport?250:5000;const ids=await redis('ZREVRANGE','fichas:indices',isExport?start:0,(isExport?start:0)+limit-1)||[];
   const rows=(await Promise.all(ids.map(getFicha))).filter(Boolean);
   if(isExport)return res.status(200).json({format:'fichas-portable-v1',exported_at:new Date().toISOString(),offset:start,next_offset:ids.length===limit?start+ids.length:null,fichas:rows});
   return res.status(200).json({fichas:agrupar(rows)});
  }
  if(req.method==='PATCH'){
   const x=req.body||{};
   const ids=listaIds(x.ids||x.id||req.query.id);
   if(!ids.length)return res.status(400).json({error:'ID inválido'});
   if(typeof x.pego!=='boolean')return res.status(400).json({error:'Nada para alterar'});
   let n=0;
   for(const id of ids){
    const item=await getFicha(id);if(!item)continue;
    item.pego=x.pego;item.pego_em=x.pego?new Date().toISOString():null;
    await saveFicha(item);n++;
   }
   if(!n)return res.status(404).json({error:'Ficha não encontrada'});
   return res.status(200).json({ok:true});
  }
  if(req.method==='DELETE'){
   const ids=listaIds(req.query.ids||req.query.id);
   if(!ids.length)return res.status(400).json({error:'ID inválido'});
   for(const id of ids){
    const item=await getFicha(id);
    if(item?.cpf&&(await redis('GET',`cpfidx:${item.cpf}`))===id)await redis('DEL',`cpfidx:${item.cpf}`);
    await redis('DEL',`ficha:${id}`);await redis('ZREM','fichas:indices',id);
   }
   return res.status(200).json({ok:true});
  }
  return res.status(405).json({error:'Método não permitido'});
 }catch(e){return res.status(500).json({error:'Erro ao processar ficha'});}
}
