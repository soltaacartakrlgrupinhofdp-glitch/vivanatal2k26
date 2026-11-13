import {randomUUID} from 'node:crypto';
import {blackcat,cpfValid,money,digits,errorResponse,saleBody,generatedEmail} from './blackcat-client.js';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({success:false,error:'Método não permitido'});
 const x=req.body||{},amount=money(x.amount),cpf=digits(x.cpf),name=String(x.nome||'').trim(),phone=digits(x.whatsapp||x.telefone||x.phone);
 if(!amount||!cpfValid(cpf)||name.length<3||phone.length<10||phone.length>13)return res.status(400).json({success:false,error:'Nome, CPF, WhatsApp ou valor inválido.'});
 const qty=Math.max(1,Math.min(150,parseInt(x.quantidade,10)||1));
 try{const d=await blackcat('/sales/create-sale','POST',saleBody({amount,name,cpf,phone,email:generatedEmail(name,cpf),description:x.descricao||`${qty} títulos`,reference:`site_${randomUUID()}`}));
 const code=d.paymentData?.copyPaste||d.paymentData?.qrCode;
 if(!d.transactionId||!code)return res.status(502).json({success:false,error:'BlackCat não retornou o código PIX ou ID da transação.'});
 return res.status(200).json({success:true,transaction_id:d.transactionId,txid:d.transactionId,route:'blackcat',qr_code:code,codigo_pix:code,qr_code_image:d.paymentData?.qrCodeBase64||`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(code)}`,valor:amount,quantidade:qty,expira_em:d.paymentData?.expiresAt||null});
 }catch(e){return errorResponse(res,e)}
}
