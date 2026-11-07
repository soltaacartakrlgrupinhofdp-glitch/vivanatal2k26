import {pagouRequest} from './pagou-client.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({success:false,error:'Método não permitido'});
 const x=req.method==='POST'?req.body||{}:req.query||{};
 const id=String(x.transaction_id||x.txid||'');
 if(!/^[a-zA-Z0-9_-]{8,128}$/.test(id))return res.status(400).json({success:false,error:'ID inválido'});
 try{
  const result=await pagouRequest(`/v2/transactions/${encodeURIComponent(id)}`);
  const d=result.data||result, raw=String(d.status||'unknown').toLowerCase();
  const status=raw==='paid'?'paid':raw==='pending'?'pending':raw;
  return res.status(200).json({success:true,transaction_id:id,status,allowpay_status:raw,amount:d.amount||0,last_check:new Date().toISOString()});
 }catch(e){return res.status(502).json({success:false,error:'Falha ao consultar Pagou',requestId:e.requestId||null});}
}
