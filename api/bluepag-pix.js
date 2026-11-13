import {randomUUID} from 'node:crypto';
import {bluepag,cpfValid,money,digits,fail} from './bluepag-client.js';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({success:false,error:'Método inválido'});
 const x=req.body||{},amount=money(x.amount),cpf=digits(x.cpf),name=String(x.nome||'').trim(),email=String(x.email||x.payer_email||'').trim() || ('pedido-'+randomUUID().replace(/-/g,'').slice(0,20)+'@example.com');
 if(!amount||!cpfValid(cpf)||name.length<3||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({success:false,error:'Informe nome e CPF válidos para gerar o PIX.'});
 try{const d=(await bluepag('/payments/pix','POST',{amount,payer_name:name,payer_email:email,payer_cpf:cpf,description:String(x.descricao||'Pedido').slice(0,120)})).data||{};
 const code=d.pix_code||d.qr_code||d.pix_key,id=d.transaction_uuid;
 if(!id||!code)throw Object.assign(new Error('BluePag não retornou código ou ID'),{status:502});
 return res.status(200).json({success:true,transaction_id:id,txid:id,route:'bluepag',qr_code:code,codigo_pix:code,qr_code_image:'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data='+encodeURIComponent(code),valor:amount,quantidade:Number(x.quantidade)||1,expira_em:d.expires_at||null});
 }catch(e){return fail(res,e)}
}
