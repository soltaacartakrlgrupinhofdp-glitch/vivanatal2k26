import {createHash} from 'node:crypto';
export const BASE='https://api.blackcatoficial.com/api';
export const digits=v=>String(v||'').replace(/\D/g,'');
export function cpfValid(v){const s=digits(v);if(s.length!==11||/^(\d)\1{10}$/.test(s))return false;for(let k=9;k<11;k++){let sum=0;for(let i=0;i<k;i++)sum+=Number(s[i])*(k+1-i);if(((sum*10)%11)%10!==Number(s[k]))return false;}return true;}
export function money(v){const n=Number(v);return Number.isFinite(n)&&n>0&&n<=100000?Math.round(n*100)/100:null;}
export function generatedEmail(name,cpf){const slug=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,32)||'cliente';const suffix=createHash('sha256').update(String(cpf)).digest('hex').slice(0,10);return `${slug}${suffix}@sorte.com`;}
// Never print customer data, PIX codes or credentials in production logs.
export function errorResponse(res,e){
 const status=Number(e.status)||502;
 console.error('BlackCat API failure',JSON.stringify({status,code:e.code||null,requestId:e.requestId||null,upstream:e.upstream||null}));
 return res.status(status).json({success:false,error:e.publicMessage||'Não foi possível gerar o PIX. Tente novamente.',reference:e.requestId||null});
}
export async function blackcat(path,method='GET',body){
 const key=String(process.env.BLACKCAT_API_KEY).trim();
 if(!key){const e=new Error('BLACKCAT_API_KEY não configurada.');e.status=503;throw e;}
 let response;
 try{
  response=await fetch(BASE+path,{method,headers:{'X-API-Key':key,'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 }catch(err){
  console.error('BlackCat network failure',JSON.stringify({type:err?.name||'NetworkError',path}));
  const e=new Error('Falha de comunicação com a BlackCat');e.status=502;e.publicMessage='Serviço de pagamentos indisponível. Tente novamente.';throw e;
 }
 const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
 if(!response.ok||data.success===false){
  const safeText=v=>typeof v==='string'?v.slice(0,180):null;
  const requestId=response.headers.get('x-request-id')||response.headers.get('x-correlation-id')||null;
  const upstream={httpStatus:response.status,contentType:response.headers.get('content-type'),code:safeText(data.code||data.errorCode),message:safeText(data.message),error:safeText(data.error),hasData:!!data.data,rawIsJson:!!raw&&Object.keys(data).length>0};
  // Redact common personal identifiers and secrets before writing provider diagnostics.
  const sanitizeProviderMessage = value => {
   if(typeof value !== 'string') return null;
   let msg=value.slice(0,400);
   msg=msg.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,'[EMAIL]');
   msg=msg.replace(/\b(?:sk_live_|pk_live_|Bearer\s+)[A-Za-z0-9._-]+/gi,'[CREDENTIAL]');
   msg=msg.replace(/\b\d[\d.()\s-]{8,}\d\b/g,'[NUMBER]');
   msg=msg.replace(/https?:\/\/\S+/gi,'[URL]');
   return msg;
  };
  const safeMessage=sanitizeProviderMessage(upstream.message);
  const safeError=sanitizeProviderMessage(upstream.error);
  // Upstream messages may include customer data. Log only generic error categories, not their text.
  console.error('BlackCat upstream diagnostic',JSON.stringify({httpStatus:upstream.httpStatus,code:upstream.code,contentType:upstream.contentType,hasData:upstream.hasData,rawIsJson:upstream.rawIsJson,hasMessage:!!upstream.message,hasError:!!upstream.error,providerMessage:safeMessage,providerError:safeError,requestId,path,payloadShape:body?{amountCents:body.amount,method:body.paymentMethod,itemCount:body.items?.length,hasName:!!body.customer?.name,hasEmail:!!body.customer?.email,hasPhone:!!body.customer?.phone,hasDocument:!!body.customer?.document?.number,hasShipping:!!body.shipping}:null}));
  const e=new Error('BlackCat HTTP '+response.status);e.status=response.status;e.code=upstream.code;e.requestId=requestId;e.upstream={httpStatus:response.status,hasMessage:!!upstream.message,hasError:!!upstream.error};
  e.publicMessage=response.status>=500?'A BlackCat apresentou uma falha interna. Tente novamente ou contate o suporte.':'Pagamento recusado pela BlackCat. Confira os dados.';
  throw e;
 }
 return data.data||data;
}
export function saleBody({amount,name,cpf,phone,email,description,reference}){const cents=Math.round(Number(amount)*100);return {amount:cents,currency:'BRL',paymentMethod:'pix',items:[{title:String(description||'Pedido').slice(0,100),unitPrice:cents,quantity:1,tangible:false}],customer:{name,email,phone:digits(phone),document:{number:digits(cpf),type:'cpf'}},pix:{expiresInDays:1},externalRef:reference};}
