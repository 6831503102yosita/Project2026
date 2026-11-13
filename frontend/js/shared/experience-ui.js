/* BlueTrail customer history, booking delivery and organizer progress. */
window.BTEnhancements=(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(th,en)=>typeof L!=='undefined'&&L?en:th;
  const money=v=>'฿'+Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const isoToday=()=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const num=v=>Number(v||0).toLocaleString('th-TH');
  const date=v=>esc(BTLocale.eventDate(v));
  const api=(url,method='GET',body)=>BTBusiness.api(url,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const statuses={PENDING:'รอชำระเงิน',CONFIRMED:'ยืนยันแล้ว',EXPIRED:'หมดอายุ',CANCELLED:'ยกเลิก',ASSIGNED:'รับมอบหมาย',PROGRESS:'กำลังดำเนินการ',DONE:'เสร็จแล้ว'};
  const status=v=>esc(BTLocale.status(v));
  function modal(body){document.getElementById('md').innerHTML=`<div class="md"><section class="card pad bt-experience-dialog" role="dialog" aria-modal="true">${body}</section></div>`;}
  function search(input){
    if(!input)return;
    const value=input.value,caret=input.selectionStart;
    F.q=value;PGS.pe=0;draw();
    const next=document.getElementById('bt-live-search');
    if(next){next.focus({preventScroll:true});try{next.setSelectionRange(caret,caret);}catch{}}
  }
  const mailStatus=m=>!m?.configured?t('รอตั้งค่าบัญชีผู้ส่งอีเมล','Sender setup required'):m.status==='SENT'?t('ส่งอีเมลแล้ว','Email sent'):m.status==='FAILED'?t('ส่งไม่สำเร็จ กรุณาลองส่งอีกครั้ง','Delivery failed; please retry'):m.status==='PENDING'?t('อยู่ในคิวส่งอีเมล','Email queued'):t('ยังไม่มีรายการส่ง','No email queued');
  const bookingPath=id=>(ME?.role==='ADMIN'?'/api/admin/bookings/':'/api/bookings/')+id;
  async function booking(id){
    modal(`<p role="status">${t('กำลังโหลดรายละเอียด…','Loading details…')}</p>`);
    try{
      const b=await api(bookingPath(id));
      modal(`<p class="mu">${t('การจอง','Booking')} #${Number(b.id)}</p><h2>${esc(BTLocale.title(b))}</h2>
        <span class="badge">${status(b.status)}</span><dl class="bt-detail-grid">
        <div><dt>${t('วันจัดงาน','Event date')}</dt><dd>${date(b.eventDate)}</dd></div>
        <div><dt>${t('สถานที่','Location')}</dt><dd>${esc(BTLocale.place(b.location||'—'))}</dd></div>
        <div><dt>${t('ผู้จอง','Customer')}</dt><dd>${esc(b.contactName)}</dd></div>
        <div><dt>${t('จำนวนที่นั่ง','Seats')}</dt><dd>${num(b.quantity)}</dd></div>
        <div><dt>${t('วันที่จอง','Booked at')}</dt><dd>${esc(BTLocale.thaiTime(b.bookingDate))}</dd></div>
        <div><dt>${t('ยอดรวม','Total')}</dt><dd class="bt-price">${money(b.totalPrice)}</dd></div></dl>
        <section class="bt-mail-panel"><h3>${t('รายละเอียดทางอีเมล','Booking email')}</h3><p>${esc(b.email)}</p>
        <p role="status" id="bt-email-status">${mailStatus(b.mail)}</p><p class="mu">${t('ระบบจัดส่งเมื่อจองและเมื่อสถานะการชำระเงินเปลี่ยน','Delivery is queued when booked and when payment status changes')}</p>
        <button id="bt-email-resend" class="btn o" type="button" onclick="BTEnhancements.email(${Number(id)},this)">${t('ส่งรายละเอียดทางอีเมลอีกครั้ง','Resend booking email')}</button>
        <p id="bt-email-message" role="status"></p></section>`);
      cooldown(id);
      watchMail(id);
    }catch(e){modal(`<p class="err">${esc(e.message)}</p>`);}
  }
  let mailWatch=0;
  async function watchMail(id){
    const token=++mailWatch;
    for(let count=0;count<12;count++){
      if(token!==mailWatch||!document.getElementById('bt-email-status'))return;
      try{const m=await api(bookingPath(id)+'/email');
        if(token!==mailWatch)return;
        const box=document.getElementById('bt-email-status');if(!box)return;
        box.textContent=mailStatus(m)+(m.status==='PENDING'&&Number(m.attempts)>0?t(' — ส่งครั้งก่อนยังไม่สำเร็จ ระบบจะลองอีกครั้ง',' — previous attempt failed; retry scheduled'):'');
        if(!m.configured||m.status!=='PENDING'){const message=document.getElementById('bt-email-message');if(message)message.textContent='';return;}
      }catch{return;}
      await new Promise(resolve=>setTimeout(resolve,5000));
    }
  }
  const mailCooldown=new Map();
  const cooldownKey=id=>String(ME?.email||'')+':'+id;
  function cooldown(id){
    const key=cooldownKey(id),button=document.getElementById('bt-email-resend');
    if(!button)return;
    const seconds=Math.max(0,Math.ceil(((mailCooldown.get(key)||0)-Date.now())/1000));
    button.disabled=seconds>0;
    button.textContent=seconds?t('ส่งอีกครั้งได้ใน '+seconds+' วินาที','Resend in '+seconds+' seconds'):t('ส่งรายละเอียดทางอีเมลอีกครั้ง','Resend booking email');
    if(seconds)setTimeout(()=>{if(document.getElementById('bt-email-resend')===button)cooldown(id);},1000);
  }
  async function email(id,button){
    if(button.disabled)return;
    const key=cooldownKey(id);
    if((mailCooldown.get(key)||0)>Date.now()){cooldown(id);return;}
    button.disabled=true;
    let waiting=false;
    try{const m=await api(bookingPath(id)+'/email','POST');
      mailCooldown.set(key,Date.now()+60000);waiting=true;
      const box=document.getElementById('bt-email-message');if(box)box.textContent=mailStatus(m);
      watchMail(id);
    }catch(e){
      if(e.status===429){mailCooldown.set(key,Date.now()+60000);waiting=true;}
      const box=document.getElementById('bt-email-message');if(box)box.textContent=e.message;
    }finally{if(waiting)cooldown(id);else button.disabled=false;}
  }
  let history=[],historyOwner='',loading=false,historyError='',historyTab='all',historyQuery='';
  async function loadHistory(){
    if(loading)return;loading=true;historyError='';const owner=ME?.email;
    try{const rows=await api('/api/profile/history');if(ME?.email===owner){history=rows;historyOwner=owner;}}
    catch(e){historyError=e.message;}
    finally{loading=false;if(location.hash==='#/account')draw();}
  }
  function account(){
    if(historyOwner!==ME?.email && !loading && !historyError)loadHistory();
    if(loading || historyOwner!==ME?.email)return `<section class="card pad" style="margin-top:20px">${historyError?`<p class="err">${esc(historyError)}</p><button class="btn o" onclick="BTEnhancements.loadHistory()">${t('ลองใหม่','Retry')}</button>`:t('กำลังโหลดประวัติ…','Loading history…')}</section>`;
    const confirmed=history.filter(b=>b.status==='CONFIRMED'),reviews=history.filter(b=>b.rating!=null);
    const filtered=history.filter(b=>{const past=b.eventDate&&String(b.eventDate).slice(0,10)<isoToday(),cancelled=['CANCELLED','EXPIRED'].includes(b.status);return (historyTab==='all'||historyTab==='upcoming'&&!past&&!cancelled||historyTab==='completed'&&past&&b.status==='CONFIRMED'||historyTab==='cancelled'&&cancelled)&&[b.title,b.titleEn].join(' ').toLowerCase().includes(historyQuery.toLowerCase());});
    return `<section class="bt-account-history" data-booking-history><div class="sh"><h2>${t('ประวัติการจอง','Booking history')}</h2><button type="button" class="btn sm o" onclick="BTEnhancements.loadHistory()">${t('โหลดใหม่','Refresh')}</button></div>
      <div class="bt-account-stats"><article><strong>${num(history.length)}</strong><span>${t('รายการจอง','Bookings')}</span></article><article><strong>${num(history.filter(b=>!['CANCELLED','EXPIRED'].includes(b.status)&&b.eventDate&&String(b.eventDate).slice(0,10)>=isoToday()).length)}</strong><span>${t('กิจกรรมที่กำลังจะถึง','Upcoming activities')}</span></article><article><strong>${money(confirmed.reduce((n,b)=>n+Number(b.totalPrice||0),0))}</strong><span>${t('ยอดการจองที่ยืนยันแล้ว','Confirmed booking value')}</span></article><article><strong>${reviews.length?num(reviews.reduce((n,b)=>n+Number(b.rating),0)/reviews.length)+' / 5':'—'}</strong><span>${t('คะแนนรีวิวเฉลี่ยที่คุณให้','Your average rating')}</span></article></div>
      <div class="bt-history-tools"><div class="bt-history-tabs" role="group" aria-label="${t('กรองประวัติ','Filter bookings')}">${[['all','ทั้งหมด','All'],['upcoming','กำลังจะถึง','Upcoming'],['completed','จบแล้ว','Completed'],['cancelled','ยกเลิก / หมดอายุ','Cancelled / Expired']].map(([key,th,en])=>`<button type="button" class="btn sm ${historyTab===key?'':'o'}" aria-pressed="${historyTab===key}" onclick="BTEnhancements.filterHistory('${key}')">${t(th,en)}</button>`).join('')}</div><input class="bt-history-search" type="search" aria-label="${t('ค้นหาประวัติการจอง','Search booking history')}" placeholder="${t('ค้นหาชื่อทัวร์หรืออีเวนต์','Search tours or events')}" value="${esc(historyQuery)}" oninput="BTEnhancements.findHistory(this)"></div>
      ${filtered.map(b=>{
        const eligible=b.status==='CONFIRMED'&&b.eventDate&&String(b.eventDate).slice(0,10)<isoToday();
        const image=String(b.imageUrl||'');const safeImage=/^(https?:\/\/|\/(?!\/))/.test(image)?image:'';
        return `<article class="card pad bt-history-item"><div class="bt-history-visual">${safeImage?`<img src="${esc(safeImage)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${esc(String(b.category||'TOUR').toUpperCase())}</span>`:`<span>${esc(String(b.category||'TOUR').toUpperCase())}</span>`}</div><div class="bt-history-body"><div class="sh"><div><small class="mu">#${Number(b.id)} · ${esc(BTLocale.category(b.category))}</small><h3>${esc(BTLocale.title(b))}</h3></div><span class="badge">${status(b.status)}</span></div><p>${date(b.eventDate)} · ${num(b.quantity)} ${t('ที่นั่ง',Number(b.quantity)===1?'seat':'seats')} · <b>${money(b.totalPrice)}</b></p>
        <button class="btn sm o" type="button" onclick="BTEnhancements.booking(${Number(b.id)})">${t('รายละเอียด','Details')}</button> ${['PENDING','CONFIRMED'].includes(b.status)?`<button type="button" class="btn sm o" onclick="BTPayments.openCustomer(${Number(b.id)},${Number(b.totalPrice)},'${esc(BTLocale.status(b.status))}')">${t('การชำระเงิน / สลิป','Payment / Slip')}</button>`:''}
        ${b.rating?`<div class="bt-review"><span class="bt-stars" aria-label="${Number(b.rating)} / 5">${'★'.repeat(Number(b.rating))}${'☆'.repeat(5-Number(b.rating))}</span><p>${esc(b.comment)}</p>${eligible?`<button class="btn sm o" onclick="BTEnhancements.review(${Number(b.id)})">${t('แก้ไขรีวิว','Edit review')}</button>`:''}</div>`:eligible?`<button class="btn sm" type="button" onclick="BTEnhancements.review(${Number(b.id)})">${t('ให้คะแนนและรีวิว','Rate & review')}</button>`:`<p class="mu">${t('รีวิวได้หลังวันจัดงาน สำหรับการจองที่ยืนยันแล้ว','Reviews open after the event date for confirmed bookings')}</p>`}</div></article>`;
      }).join('')||`<div class="card pad"><p>${history.length?t('ไม่พบรายการในหมวดนี้','No matching bookings'):t('ยังไม่มีประวัติการจอง','No bookings yet')}</p><a class="btn" href="#/events">${t('ค้นหาทัวร์ / อีเวนต์','Explore tours & events')}</a></div>`}</section>`;
  }
  function filterHistory(tab){historyTab=tab;repaintHistory();}
  function repaintHistory(){const el=document.querySelector('[data-booking-history]');if(el)el.outerHTML=account();}
  function findHistory(input){historyQuery=input.value;const caret=input.selectionStart;repaintHistory();const next=document.querySelector('.bt-history-search');if(next){next.focus();next.setSelectionRange(caret,caret);}}
  function review(id){modal(`<h2>${t('เล่าประสบการณ์ของคุณ','Share your experience')}</h2><form onsubmit="BTEnhancements.saveReview(event,${Number(id)});return false"><label>${t('คะแนน','Rating')}</label><select name="rating" required><option value="">${t('เลือกคะแนน','Choose rating')}</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)} (${n}/5)</option>`).join('')}</select><label>${t('รีวิว','Review')}</label><textarea name="comment" rows="4" maxlength="2000"></textarea><p class="err" data-error></p><button class="btn" type="submit">${t('บันทึกรีวิว','Save review')}</button></form>`);const prior=history.find(b=>Number(b.id)===Number(id));if(prior?.rating){const form=document.querySelector('#md form');form.elements.rating.value=prior.rating;form.elements.comment.value=prior.comment||'';}}
  async function saveReview(e,id){e.preventDefault();const form=e.target,b=form.querySelector('button[type=submit]');b.disabled=true;
    try{await api('/api/profile/bookings/'+id+'/review','POST',{rating:Number(form.elements.rating.value),comment:form.elements.comment.value});document.getElementById('md').innerHTML='';await loadHistory();}
    catch(err){form.querySelector('[data-error]').textContent=err.message;}finally{b.disabled=false;}}
  function createUser(){modal(`<h2>${t('เพิ่มผู้ใช้งาน','Add user')}</h2><form onsubmit="BTEnhancements.saveUser(event);return false"><div class="fg"><div><label>${t('ชื่อ','Name')}</label><input name="name" required maxlength="100"></div><div><label>${t('อีเมล','Email')}</label><input name="email" type="email" required maxlength="150"></div><div><label>${t('เบอร์โทร','Phone')}</label><input name="phone" type="tel" maxlength="30"></div><div><label>${t('สิทธิ์','Role')}</label><select name="role">${['CUSTOMER','ORGANIZER','ADMIN'].map(r=>`<option value="${r}">${esc(BTLocale.status(r))}</option>`).join('')}</select></div></div><label>${t('รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)','Initial password (at least 8 characters)')}</label><input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72"><p class="err" data-error></p><button type="submit" class="btn">${t('เพิ่มผู้ใช้','Create user')}</button></form>`);}
  async function saveUser(e){e.preventDefault();const form=e.target,b=form.querySelector('[type=submit]');b.disabled=true;
    try{await api('/api/admin/users','POST',Object.fromEntries(new FormData(form)));document.getElementById('md').innerHTML='';BTBusiness.refresh('users');}
    catch(err){form.querySelector('[data-error]').textContent=err.message;}finally{b.disabled=false;}}
  async function work(id,admin=false){
    modal(`<p>${t('กำลังโหลด…','Loading…')}</p>`);
    try{
      const url=admin?'/api/admin/organizer-assignments/':'/api/organizer/assignments/';
      const data=await api(url+id),a=data.assignment,latest=data.reports[0];
      const percent=Math.max(0,Math.min(100,Number(latest?.progress??(a.status==='DONE'?100:0))));
      let details={};try{details=JSON.parse(a.additionalDetails||'{}');}catch{}
      modal(`<small class="mu">${t('งาน','Event')} #${Number(a.requestId)}</small><h2>${esc(BTLocale.title(a))}</h2><span class="badge">${status(a.status)}</span>
        <dl class="bt-detail-grid"><div><dt>${t('ผู้รับผิดชอบ','Organizer')}</dt><dd>${esc(a.organizerName)}</dd></div><div><dt>${t('ช่วงวันงาน','Dates')}</dt><dd>${esc(BTLocale.eventDate(String(a.requestedDate||"—").slice(0,10)))} → ${esc(BTLocale.eventDate(String(a.endDate||a.requestedDate||"—").slice(0,10)))}</dd></div><div><dt>${t('เวลา','Time')}</dt><dd>${esc(details.startTime||'—')} – ${esc(details.endTime||'—')}</dd></div><div><dt>${t('สถานที่','Location')}</dt><dd>${esc(BTLocale.place(a.location))}</dd></div><div><dt>${t('ผู้เข้าร่วม','Guests')}</dt><dd>${num(a.guestCount)}</dd></div><div><dt>${t('งบประมาณ','Budget')}</dt><dd>${money(a.budget)}</dd></div><div><dt>${t('ลูกค้า','Customer')}</dt><dd>${esc(details.contactName||a.customerName)}<br>${esc(details.contactPhone||a.customerPhone)}<br>${esc(details.contactEmail||a.customerEmail)}</dd></div></dl>
        <h3>${t('รายละเอียดงาน','Work details')}</h3><p class="bt-prewrap">${esc(a.description||'—')}</p><p>${t('ธีม','Theme')}: ${esc(details.theme||'—')}</p><p>${t('อุปกรณ์ / บริการ','Equipment / services')}: ${esc(details.equipment||'—')}</p><p class="bt-prewrap">${esc(a.note||'')}</p>
        <h3>${t('ความคืบหน้า','Progress')}</h3>${progressBar(percent)}
        ${!admin?`<form onsubmit="BTEnhancements.report(event,${Number(id)});return false"><label>${t('ดำเนินการแล้ว (%)','Completed (%)')}</label><input name="progress" type="number" min="0" max="100" step="1" required value="${percent}" oninput="BTEnhancements.previewProgress(this)"><input type="range" min="0" max="100" step="1" value="${percent}" aria-label="${t('ปรับเปอร์เซ็นต์ความคืบหน้า','Adjust progress percentage')}" oninput="this.form.elements.progress.value=this.value;BTEnhancements.previewProgress(this.form.elements.progress)"><label>${t('สิ่งที่ดำเนินการ / ปัญหา / ขั้นตอนต่อไป','Completed work / issues / next steps')}</label><textarea name="message" rows="4" required maxlength="3000"></textarea><p class="err" data-error></p><button class="btn" type="submit">${t('ส่งรายงานความคืบหน้า','Submit progress report')}</button></form>`:''}
        <h3 style="margin-top:24px">${t('ประวัติการดำเนินงาน','Progress history')}</h3>${data.reports.map(r=>`<article class="bt-report"><b>${Number(r.progress)}%</b><small class="mu"> · ${esc(BTLocale.thaiTime(r.createdAt))} · ${esc(r.createdBy)}</small><p class="bt-prewrap">${esc(r.message)}</p></article>`).join('')||`<p class="mu">${t('ยังไม่มีรายงาน','No reports yet')}</p>`}`);
    }catch(e){modal(`<p class="err">${esc(e.message)}</p>`);}
  }
  function progressBar(value){const n=Math.max(0,Math.min(100,Number(value)||0));return `<div class="bt-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}" aria-label="${t('ความคืบหน้า','Progress')}"><span style="width:${n}%"></span></div><p class="bt-progress-value">${n}%</p>`;}
  function previewProgress(input){const n=Number(input.value),root=input.closest('.bt-experience-dialog');if(!root||!input.checkValidity())return;root.querySelector('.bt-progress').setAttribute('aria-valuenow',n);root.querySelector('.bt-progress > span').style.width=n+'%';root.querySelector('.bt-progress-value').textContent=n+'%';root.querySelector('input[type=range]').value=n;}
  async function report(e,id){e.preventDefault();const form=e.target,b=form.querySelector('[type=submit]');b.disabled=true;
    try{await api('/api/organizer/assignments/'+id+'/reports','POST',{progress:Number(form.elements.progress.value),message:form.elements.message.value});BTBusiness.refresh('mine');await work(id);}
    catch(err){form.querySelector('[data-error]').textContent=err.message;}finally{b.disabled=false;}}
  function formatBudget(input){
    const raw=input.value.replaceAll(',','');
    const error=t('กรุณากรอกงบประมาณตั้งแต่ 0 ถึง 9,999,999,999,999.99 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง','Enter a budget from 0 to 9,999,999,999,999.99 THB with up to 2 decimal places.');
    if(!/^\d*(\.\d{0,2})?$/.test(raw) || (raw!==''&&(!Number.isFinite(Number(raw))||Number(raw)>9999999999999.99))){input.setCustomValidity(error);return;}
    input.setCustomValidity('');
    const position=input.selectionStart??input.value.length;
    const logical=input.value.slice(0,position).replaceAll(',','').length;
    const parts=raw.split('.');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
    const value=parts.join('.');
    if(value===input.value)return;
    input.value=value;
    let count=0,caret=0;while(caret<value.length&&count<logical){if(value[caret]!==',')count++;caret++;}
    input.setSelectionRange(caret,caret);
  }
  // Format monetary text fields without inserting a duplicate value beneath them.
  function enhance(){
    document.querySelectorAll('form.fc input[name=budget]').forEach(input=>{
      if(input.dataset.btBudgetBound)return;
      input.dataset.btBudgetBound='1';input.type='text';input.inputMode='decimal';
      input.removeAttribute('min');input.maxLength=22;
      input.addEventListener('input',()=>formatBudget(input));
      input.addEventListener('blur',()=>formatBudget(input));
      formatBudget(input);
    });
    document.querySelectorAll('.bt-number-preview').forEach(el=>el.remove());
    document.querySelectorAll('input[data-bt-money]').forEach(input=>{
      if(input.dataset.btMoneyBound)return;
      input.dataset.btMoneyBound='1';
      input.addEventListener('focus',()=>{input.value=input.value.replaceAll(',','');});
      input.addEventListener('blur',()=>{
        const raw=input.value.replaceAll(',','').trim();
        if(raw!==''&&/^\d+$/.test(raw))input.value=Number(raw).toLocaleString('en-US',{maximumFractionDigits:0});
      });
    });
    const start=document.querySelector('form.fc input[name=date]'),end=document.querySelector('form.fc input[name=endDate]');
    if(start&&end&&!start.dataset.btRange){start.dataset.btRange='1';const today=isoToday();start.min=today;end.min=start.value||today;start.addEventListener('change',()=>{end.min=start.value||today;if(!end.value||end.value<start.value)end.value=start.value;});}
  }
  let pending=false;new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;enhance();});}}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',enhance);
  return {filterHistory,findHistory,progressBar,previewProgress,search,booking,email,account,loadHistory,review,saveReview,createUser,saveUser,work,report};
})();
