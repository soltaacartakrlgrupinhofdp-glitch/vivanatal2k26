// Chave temporariamente embutida a pedido do proprietário. MIGRAR para ambiente e ROTACIONAR.
export const PAGOU_KEY = process.env.PAGOU_SECRET_KEY || 'sk_live_000m4WVEwsr7R1POwVJaFx0tfDR6kFhqKk4LojH6HC3';
export const PAGOU_BASE = 'https://api.pagou.ai';
export async function pagouRequest(path, options={}) {
  const response = await fetch(PAGOU_BASE+path, { ...options, headers: {'Authorization': `Bearer ${PAGOU_KEY}`, 'Content-Type':'application/json', ...(options.headers||{})}, signal:AbortSignal.timeout(20000)});
  const body=await response.json().catch(()=>({}));
  if(!response.ok || body.success===false) {
    console.error('Pagou request rejected', {httpStatus:response.status, title:body.title, requestId:body.requestId, fields:Array.isArray(body.errors)?body.errors.map(x=>x.field):[]});
    const e=new Error(body.detail || body.message || body.title || `Pagou HTTP ${response.status}`); e.httpStatus=response.status; e.requestId=body.requestId; throw e;
  }
  return body;
}
export function validCpf(v){const s=String(v||'').replace(/\D/g,'');if(!/^\d{11}$/.test(s)||/^(\d)\1{10}$/.test(s))return false;for(let n=9;n<=10;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(s[i])*(n+1-i);let d=(sum*10)%11;if(d===10)d=0;if(d!==Number(s[n]))return false;}return true;}
export function customerEmail(name,cpf){const base=String(name||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,32)||'cliente';return `${base}${String(cpf).slice(-4)}@sorte.com`;}
