import {randomUUID,timingSafeEqual} from 'node:crypto';
import {blackcat,cpfValid,money,digits,errorResponse,saleBody,generatedEmail} from './blackcat-client.js';
function auth(req){const password=process.env.ADMIN_PASSWORD;if(!password)return false;const a=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''));const b=Buffer.from(password);return a.length===b.length&&timingSafeEqual(a,b)}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!auth(req))return res.status(401).json({error:'Não autorizado. Configure ADMIN_PASSWORD.'});
 try{
 if(req.method==='GET'){
 const action=String(req.query.action||'');
 if(action==='wallet')return res.status(200).json({data:{balance:null,hold:null,available:false},notice:'Saldo não integrado à API BlackCat.'});
 if(action==='transactions')return res.status(200).json({data:[],notice:'A documentação consultada não apresenta endpoint de listagem de transações.'});
 return res.status(400).json({error:'Consulta inválida'});
 }
 if(req.method==='POST'&&req.body?.action==='create'){
 const x=req.body,amount=money(x.amount),cpf=digits(x.cpf),name=String(x.name||'').trim(),email=String(x.email||'').trim(),phone=digits(x.phone||x.whatsapp);
 if(!amount||!cpfValid(cpf)||!name||phone.length<10)return res.status(400).json({error:'Informe nome, CPF válido, telefone e valor.'});
 const d=await blackcat('/sales/create-sale','POST',saleBody({amount,name,cpf,phone,email:/^\S+@\S+\.\S+$/.test(email)?email:generatedEmail(name,cpf),description:x.description||'Cobrança administrativa',reference:`admin_${randomUUID()}`}));
 const code=d.paymentData?.copyPaste||d.paymentData?.qrCode||'';
 return res.status(200).json({data:{id:d.transactionId,amount:Number(d.amount||0)/100,status:String(d.status||'').toLowerCase(),pix_code:code,qr_code:code}});
 }
 return res.status(405).json({error:'Método ou ação inválidos'});
 }catch(e){return errorResponse(res,e)}
}
