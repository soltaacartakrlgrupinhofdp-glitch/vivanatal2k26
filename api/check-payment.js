import {bluepag,fail} from './bluepag-client.js';
export default async function handler(req,res){
 if(!['POST','GET'].includes(req.method))return res.status(405).json({success:false,error:'Método inválido'});
 const id=String((req.method==='POST'?req.body:req.query)?.transaction_id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({success:false,error:'ID inválido'});
 try{const d=(await bluepag('/payments/'+encodeURIComponent(id))).data||{};
 const raw=String(d.status||'').toLowerCase();return res.status(200).json({success:true,transaction_id:id,status:raw==='completed'?'paid':raw==='pending'?'pending':['failed','canceled','cancelled','expired'].includes(raw)?(raw==='cancelled'?'canceled':raw):raw,source:'bluepag',amount:Number(d.amount_gross??d.amount??0),last_check:new Date().toISOString()});
 }catch(e){return fail(res,e)}
}
