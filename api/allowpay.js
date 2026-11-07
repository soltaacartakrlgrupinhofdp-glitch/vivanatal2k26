import {pagouRequest,validCpf,customerEmail} from './pagou-client.js';
import {randomUUID} from 'node:crypto';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({success:false,error:'Método não permitido'});
 try{
  const x=req.body||{}, amount=Number(x.amount), cpf=String(x.cpf||'').replace(/\D/g,''), name=String(x.nome||'').trim();
  const cents=Math.round(amount*100), quantity=Number(x.quantidade);
  if(!Number.isFinite(amount)||cents<100||cents>100000000||!validCpf(cpf)||name.length<3||!Number.isInteger(quantity)||quantity<1)
    return res.status(400).json({success:false,error:'Valor, nome, CPF ou quantidade inválidos'});
  const host=String(req.headers.host||'').toLowerCase();
  const origin=host && !/^(localhost|127\.0\.0\.1)(:|$)/.test(host) && /^[a-z0-9.-]+(?::\d+)?$/.test(host) ? `https://${host}` : null;
  const external_ref=`vs_${randomUUID()}`;
  const payload={external_ref,amount:cents,currency:'BRL',method:'pix',buyer:{name,email:customerEmail(name,cpf),document:{type:'CPF',number:cpf}},products:[{name:String(x.produto||x.descricao||'Título de Capitalização').slice(0,120),price:cents,quantity:1}]};
  if(origin)payload.notify_url=`${origin}/api/pagou-webhook`;
  const result=await pagouRequest('/v2/transactions',{method:'POST',body:JSON.stringify(payload)});
  const data=result.data||result, code=data.pix?.qr_code||data.pix?.copy_paste||'';
  if(!data.id||!code)throw new Error('Pagou não retornou ID ou código PIX');
  return res.status(200).json({success:true,transaction_id:data.id,txid:data.id,route:'pagou',qr_code:code,codigo_pix:code,qr_code_image:`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(code)}`,valor:amount,quantidade:quantity,expira_em:data.pix?.expiration_date||null,external_ref});
 }catch(e){return res.status(e.httpStatus&&e.httpStatus<500?e.httpStatus:502).json({success:false,error:e.message,requestId:e.requestId||null});}
}
