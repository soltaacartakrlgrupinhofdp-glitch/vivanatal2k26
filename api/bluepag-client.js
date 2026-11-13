import {cpfValid,money,digits} from './pix-utils.js';
export {cpfValid,money,digits};
const BASE='https://api.bluepag.com.br/api/v1';
let cached=null;
function apiMessage(data, fallback) {
 if (typeof data === 'string' && data.trim()) return data;
 if (data && typeof data === 'object') {
  for (const key of ['message','error','detail','description','mensagem']) {
   if (data[key]) return apiMessage(data[key],fallback);
  }
  if (Array.isArray(data.errors)) return data.errors.map(x=>apiMessage(x,'')).filter(Boolean).join('; ')||fallback;
 }
 return fallback;
}
export async function bluepag(path,method='GET',body){
 const id=process.env.BLUEPAG_CLIENT_ID||'cli_6d4f3b7563be4fe6',secret=process.env.BLUEPAG_CLIENT_SECRET||'nxp_0f707eb5054c473f827737074b475d0e';
 if(!id||!secret)throw Object.assign(new Error('Configure BLUEPAG_CLIENT_ID e BLUEPAG_CLIENT_SECRET'),{status:503});
 if(!cached||Date.now()>cached.until){
  const auth=Buffer.from(id+':'+secret).toString('base64');
  const r=await fetch(BASE+'/oauth/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/json'},body:JSON.stringify({grant_type:'client_credentials'}),signal:AbortSignal.timeout(15000)});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token)throw Object.assign(new Error('Falha de autenticação BluePag (HTTP '+r.status+'): '+apiMessage(d,'verifique as credenciais e a aprovação da conta')),{status:502});
  cached={token:d.access_token,until:Date.now()+Math.max(30,Number(d.expires_in||3600)-90)*1000};
 }
 const r=await fetch(BASE+path,{method,headers:{Authorization:'Bearer '+cached.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Object.assign(new Error('BluePag (HTTP '+r.status+'): '+apiMessage(d,'operação não autorizada ou dados inválidos')),{status:r.status>=500?502:r.status});
 return d;
}
export function fail(res,e){console.error('BluePag request failed',e.status||502);return res.status(e.status||502).json({success:false,error:String(e.message||'Erro de pagamento')});}
