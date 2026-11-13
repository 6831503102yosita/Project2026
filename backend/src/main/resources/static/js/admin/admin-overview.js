/* Operational overview: existing protected API, no sample figures. */
window.BTAdminOverview=(()=>{
  let data=null,loading=false,error='',loaded=false,lastLoaded=0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=(th,en)=>typeof L==='undefined'||!L?th:en;
  const num=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});
  const money=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const names={pending:['คำขอใหม่','New'],new:['คำขอใหม่','New'],review:['กำลังตรวจสอบ','Under review'],under_review:['กำลังตรวจสอบ','Under review'],info:['รอข้อมูลเพิ่มเติม','More information'],confirm:['รอลูกค้ายืนยัน','Awaiting customer'],waiting_confirmation:['รอลูกค้ายืนยัน','Awaiting customer'],confirmed:['ยืนยันแล้ว','Confirmed'],progress:['กำลังดำเนินการ','In progress'],in_progress:['กำลังดำเนินการ','In progress'],done:['เสร็จสิ้น','Completed'],completed:['เสร็จสิ้น','Completed'],cancel:['ยกเลิก','Cancelled'],cancelled:['ยกเลิก','Cancelled']};
  const date=v=>{
    if(!v)return '—';const s=String(v).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:esc(s);
  };
  async function load(force=false){
    if(loading||(!force&&loaded&&Date.now()-lastLoaded<45000))return;
    loading=true;error='';
    try{const r=await fetch('/api/admin/overview',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);data=await r.json();loaded=true;lastLoaded=Date.now();}
    catch(e){error=e.message;loaded=false;}
    finally{loading=false;if(typeof AT!=='undefined'&&AT==='ov'&&location.hash.startsWith('#/admin'))draw();}
  }
  function refresh(){loaded=false;error='';load(true);}
  async function openRequest(id){
    try{await BTAdminRequests.load();A.show(BTAdminRequests.details(Number(id)));}
    catch(e){A.show(`<p class="err">${esc(e.message)}</p>`);}
  }
  function render(){
    if(!loaded&&!loading&&!error)load();
    if(loaded&&!loading&&Date.now()-lastLoaded>45000)load(true);
    if(error)return `<section class="card pad"><p class="err">${label('โหลดภาพรวมไม่สำเร็จ','Unable to load overview')}: ${esc(error)}</p><button class="btn o" onclick="BTAdminOverview.refresh()">${label('ลองใหม่','Retry')}</button></section>`;
    if(!data)return `<p role="status">${label('กำลังโหลดข้อมูล…','Loading…')}</p>`;
    const tasks=[['newRequests','คำขอจัดงานใหม่','New event requests','ตรวจสอบคำขอ','Review requests','rq'],['pendingSlips','สลิปรอตรวจสอบ','Payment slips to verify','ตรวจสอบสลิป','Verify slips','pay'],['draftQuotations','ใบเสนอราคาฉบับร่าง','Draft quotations','จัดการใบเสนอราคา','Manage quotations','qt'],['pendingBookings','การจองรอชำระเงิน','Bookings awaiting payment','ดูการจอง','View bookings','bk']];
    const summaries=[['activeEvents','ทัวร์ / อีเวนต์ที่เปิดอยู่','Active tours / events'],['bookings','การจองทั้งหมด','All bookings'],['requests','คำขอจัดงานทั้งหมด','All event requests'],['users','ผู้ใช้ทั้งหมด','Users']];
    const progress=[['reviewRequests','กำลังตรวจสอบ','Under review'],['waitingRequests','รอลูกค้ายืนยัน','Awaiting customer'],['confirmedRequests','ยืนยันแล้ว','Confirmed'],['inProgressRequests','กำลังดำเนินการ','In progress'],['completedRequests','เสร็จสิ้น','Completed'],['sentQuotations','ใบเสนอราคาที่ส่งแล้ว','Sent quotations']];
    const recent=Array.isArray(data.recentRequests)?data.recentRequests:[];
    return `<section class="bto bto-office">
      <header class="bto-heading"><div><h2>${label('ภาพรวมการทำงาน','Work overview')}</h2><p>${label('รายการที่ต้องจัดการและความเคลื่อนไหวล่าสุด','Outstanding work and recent activity')}</p></div><button class="btn o sm" type="button" onclick="BTAdminOverview.refresh()">${label('โหลดข้อมูลใหม่','Refresh')}</button></header>
      <dl class="bto-summary">${summaries.map(([k,th,en])=>`<div><dt>${label(th,en)}</dt><dd>${num(data[k])}</dd></div>`).join('')}</dl>
      <div class="bto-columns"><section class="bto-sheet"><header><h3>${label('รายการที่ต้องจัดการ','To do')}</h3><span class="mu">${label('เลือกเพื่อดำเนินการ','Select an action')}</span></header><div class="bto-scroll"><table class="bto-task-table"><thead><tr><th>${label('รายการ','Task')}</th><th class="bto-number">${label('จำนวน','Count')}</th><th><span class="bto-sr">${label('ดำเนินการ','Action')}</span></th></tr></thead><tbody>
      ${tasks.map(([k,th,en,cta,eng,tab])=>`<tr><td>${label(th,en)}</td><td class="bto-number ${Number(data[k])>0?'bto-pending':''}">${num(data[k])}</td><td class="bto-action"><button type="button" onclick="A.tab('${tab}')">${label(cta,eng)}</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="bto-sheet"><header><h3>${label('สถานะงาน','Work status')}</h3></header><dl class="bto-status-list">${progress.map(([k,th,en])=>`<div><dt>${label(th,en)}</dt><dd>${num(data[k])}</dd></div>`).join('')}</dl><div class="bto-payment-total"><span>${label('ยอดชำระที่ตรวจสอบแล้ว (บาท)','Verified payments (THB)')}</span><strong>${money(data.approvedRevenue)}</strong></div></section></div>
      <section class="bto-sheet bto-recent"><header><h3>${label('คำขอจัดงานล่าสุด','Recent event requests')}</h3><button type="button" onclick="A.tab('rq')">${label('ดูคำขอทั้งหมด','View all requests')}</button></header><div class="bto-scroll"><table><thead><tr><th>${label('ชื่องาน / ลูกค้า','Event / customer')}</th><th>${label('วันจัดงาน','Event date')}</th><th>${label('สถานที่','Location')}</th><th class="bto-number">${label('งบประมาณ (บาท)','Budget (THB)')}</th><th>${label('สถานะ','Status')}</th><th><span class="bto-sr">${label('รายละเอียด','Details')}</span></th></tr></thead><tbody>
      ${recent.map(r=>{const st=String(r.status||'').toLowerCase(),n=names[st]||[st||'—',st||'—'];return `<tr><td><strong>${esc(r.title||'—')}</strong><small>${esc(r.customerName||'—')}</small></td><td class="bto-date">${date(r.requestedDate)}</td><td>${esc(BTLocale.place(r.location||'—'))}</td><td class="bto-number">${r.budget==null?'—':money(r.budget)}</td><td><span class="bto-state" data-state="${esc(st)}">${esc(label(...n))}</span></td><td class="bto-action"><button type="button" onclick="BTAdminOverview.openRequest(${Number(r.id)})">${label('เปิด','Open')}</button></td></tr>`;}).join('')||`<tr><td colspan="6" class="bto-empty">${label('ยังไม่มีคำขอจัดงาน','No event requests yet')}</td></tr>`}</tbody></table></div></section>
    </section>`;
  }
  return {render,refresh,openRequest};
})();
