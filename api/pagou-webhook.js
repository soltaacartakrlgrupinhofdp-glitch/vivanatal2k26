// Postbacks notify_url da Pagou não são assinados; NUNCA confiar no status recebido.
// Sempre consultar o pagamento na Pagou antes de atualizar uma ficha.
import {pagouRequest} from './pagou-client.js';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const x=req.body||{},id=String(x.data?.id||x.transaction_id||x.id||'');
 if(!/^[a-zA-Z0-9_-]{8,128}$/.test(id))return res.status(400).json({error:'ID ausente'});
 try{
  const j=await pagouRequest(`/v2/transactions/${encodeURIComponent(id)}`);
  const status=String((j.data||j).status||'').toLowerCase();
  // O painel confirma pelo gateway na próxima consulta; não marca como pago sem validação.
  return res.status(200).json({received:true,verified:status==='paid'});
 }catch{return res.status(502).json({received:false});}
}
