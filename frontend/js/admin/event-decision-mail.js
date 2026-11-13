window.BTEventDecisionMail=(()=>{
 const t=(th,en)=>typeof L!=='undefined'&&L?en:th;
 const cooling=new Map();
 async function send(id,changeId,button){
  if(button.disabled)return;button.disabled=true;
  const message=button.nextElementSibling;message.textContent=t('กำลังส่งอีเมล…','Sending email…');
  const key=id+':'+(changeId||'request');
  try{
   const c=await fetch('/api/auth/csrf',{credentials:'same-origin'}).then(r=>r.json());
   const r=await fetch('/api/admin/event-requests/'+id+'/decision-email',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',[c.headerName]:c.token},body:JSON.stringify(changeId?{changeId}:{})});
   if(!r.ok){if(r.status===429)cooling.set(key,Date.now()+60000);throw Error(r.status===401?t('กรุณาเข้าสู่ระบบใหม่','Please sign in again'):r.status===409?t('กรุณาบันทึกผลอนุมัติหรือปฏิเสธก่อน','Save approval or rejection first'):r.status===429?t('กรุณารอ 1 นาทีก่อนส่งอีกครั้ง','Please wait 1 minute before resending'):t('ส่งไม่สำเร็จ กรุณาตรวจการตั้งค่าอีเมล','Could not send; check email configuration'));}
   const result=await r.json();cooling.set(key,Date.now()+60000);
   message.textContent=result.status==='SENT'?t('ส่งอีเมลแจ้งผลแล้ว','Decision email sent'):t('ส่งอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง','Email delivery failed; please retry');
  }catch(e){message.textContent=e.message;}
  finally{const tick=()=>{if(!button.isConnected)return;const seconds=Math.max(0,Math.ceil(((cooling.get(key)||0)-Date.now())/1000));button.disabled=seconds>0;button.textContent=seconds?t('ส่งอีกครั้งได้ใน '+seconds+' วินาที','Resend in '+seconds+' seconds'):t('ส่งอีเมลแจ้งผล','Send decision email');if(seconds)setTimeout(tick,1000);};tick();}
 }
 function fields(id,changeId){return `<button type="button" class="btn o" onclick="BTEventDecisionMail.send(${Number(id)},${changeId?Number(changeId):'null'},this)">${t('ส่งอีเมลแจ้งผล','Send decision email')}</button><span role="status" style="display:block;margin-top:8px"></span>`;}
 return {send,fields};
})();
