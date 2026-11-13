function page(){const h=location.hash.slice(2).split('?')[0],[p,a]=h.split('/');
switch(p){case'':return pgHome();case'events':return pgEvents();case'event':return pgDetail(a);case'book':return pgBook(a);case'pay':return pgPay(a);case'api-detail':return pgApiDetail(a);case'api-book':return pgApiBook(a);case'bookings':return ME&&ME.role==="admin"?pgAdmin():BTBookings.renderMy();case'custom':return pgCustom();case'requests':return ME&&ME.role==="admin"?pgAdmin():pgReqsAPI();case'quotations':return BTQuotation.renderCustomer();case'request':return pgReqAPI(a);case'account':return pgAcc();case'login':return pgAuth(0);case'register':return pgAuth(1);case'admin':return a=='request'?pgAReq(h.split('/')[2]):pgAdmin();case'organizer':return BTBusiness.organizerPage();default:return emp()}}
function sizes(){const n=$('#nv'),b=$('#bar'),s=document.documentElement.style;if(n)s.setProperty('--nh',n.offsetHeight+'px');s.setProperty('--bh',(b?b.offsetHeight:0)+'px')}
const bdue=b=>b.dueAt||new Date(new Date(b.created).getTime()+(+DB.contact.hold||24)*36e5).toISOString();
function migLegacy(){if(DB.legMig)return;DB.reqs.forEach(r=>{if(!(r.price>0)||DB.qts.some(x=>x.work.rid==r.id))return;const q=QS(r);let no=q.no;while(DB.qts.some(x=>x.no==no))no+='x';const work={rid:r.id,co:r.cname,ct:r.cname,em:r.email,ad:'',tx:'',issue:(q.at||now()).slice(0,10),exp:q.exp||(q.at||now()).slice(0,10),items:q.items.map((i,k)=>({d:i.d,n:i.n,un:'',u:i.u,x:k?0:(q.disc||0)})),vat:q.vat?7:0,dep:q.pct==null?30:q.pct,terms:q.terms||DB.tpl.terms,note:DB.tpl.note,lang:0};DB.qts.push({id:Date.now()+r.id,no,work,status:['confirmed','progress','done'].includes(r.status)?'approved':'sent',vers:[{rev:(q.rev||1)-1,at:q.at||now(),by:'ระบบ (ย้ายข้อมูลเดิม)',snap:cp(work),tpl:cp(DB.tpl),pdf:''}],log:[],created:q.at||now(),updated:now(),by:'ระบบ'});r.q=null});DB.legMig=1;sv()}
function sweep(){let ch=0;DB.bookings.forEach(b=>{if(b.st!='Pending'||b.pay=='Paid'||b.pay=='Partial')return;if(bdue(b)<now()&&!DB.slips.some(x=>x.kind=='booking'&&x.ref==b.id&&x.status!='rejected')){b.st='Expired';b.pay='Pending';const e=ev(b.eid);if(e&&!b.rel){e.seats+=b.qty;b.rel=1}ch=1}});if(ch)sv();return ch}
// Keep the main navigation mounted across route changes. Recreating the entire
// app on each draw caused the header and images to visibly flash.
let btSessionReady=false;
let btLastNavbar = null, btLastFooter = null, btLastRoute = null;
function draw(){
  if(!btSessionReady)return;
  const root = document.getElementById('app');
  if(!root)return;
  try{
    sweep();
    if(ME&&ME.off){ME=null;ls.s('me',null)}
    let navMount=document.getElementById('bt-nav-mount');
    let pageMount=document.getElementById('bt-page-mount');
    let footMount=document.getElementById('bt-footer-mount');
    if(!navMount||!pageMount||!footMount){
      root.innerHTML='<div id="bt-nav-mount"></div><main id="bt-page-mount"></main><div id="bt-footer-mount"></div>';
      navMount=document.getElementById('bt-nav-mount');
      pageMount=document.getElementById('bt-page-mount');
      footMount=document.getElementById('bt-footer-mount');
      btLastNavbar=btLastFooter=btLastRoute=null;
    }
    const newNav=nav();
    if(newNav!==btLastNavbar){navMount.innerHTML=newNav;btLastNavbar=newNav}
    const currentRoute=location.hash||'#/';
    const previousHeight=pageMount.offsetHeight;
    const newPage=page()||'';
    // On identical re-renders keep existing DOM, preserving image decode, focus,
    // form inputs and active animations. Async pages can still update own regions.
    if(pageMount.innerHTML!==newPage){
      if(currentRoute!==btLastRoute && previousHeight>0){
        pageMount.style.minHeight=Math.min(previousHeight,window.innerHeight)+'px';
        pageMount.classList.remove('bt-route-enter');
      }
      pageMount.innerHTML=newPage;
      if(currentRoute!==btLastRoute){
        pageMount.classList.add('bt-route-enter');
        requestAnimationFrame(()=>pageMount.style.minHeight='');
      }
    }
    btLastRoute=currentRoute;
    const newFooter=foot();
    if(newFooter!==btLastFooter){footMount.innerHTML=newFooter;btLastFooter=newFooter}
    document.documentElement.lang=L?'en':'th';
  }catch(x){
    console.error(x);
    const target=document.getElementById('bt-page-mount')||root;
    target.innerHTML=emp(t('err'),'<button class="btn" onclick="draw()">'+t('retry')+'</button>');
  }
  BTBookingSession.restore();
  sizes();
}
const fd=e=>Object.fromEntries(new FormData(e.target).entries()),er=m=>{const x=$('#er');if(x)x.textContent=m;return false};
const rd=(f,cb)=>{if(f&&f.size&&f.size<250000){const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(f)}else cb('')};
const A={...QA,...PA,async apiBook(event,id){
  event.preventDefault();

  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const qty = Number(form.elements.qty.value);
  const selected = API_EVENTS &&
    API_EVENTS.find(x => Number(x.id) === Number(id));

  if (!ME || ME.role !== 'customer') {
    return er('กรุณาเข้าสู่ระบบ CUSTOMER');
  }

  if (!selected || selected.arch) {
    return er('Event นี้ไม่พร้อมให้จอง');
  }

  if (!Number.isInteger(qty) || qty < 1 || qty > selected.seats) {
    return er('จำนวนที่นั่งไม่ถูกต้อง');
  }

  if (button.disabled) return false;

  button.disabled = true;
  button.textContent = 'กำลังบันทึกการจอง...';

  try {
    const currentUser=await BTAuth.restore();
    if(!currentUser){BTBookingSession.expired(form,id);return false;}
    if(currentUser.id!==ME.id||currentUser.role!=='customer')throw new Error(L?'Your account changed. Sign in to the original customer account.':'บัญชีเปลี่ยนไป กรุณาเข้าสู่ระบบบัญชีลูกค้าเดิม');
    ME=currentUser;
    const csrfRes = await fetch('/api/auth/csrf', {
      credentials: 'same-origin'
    });

    if (!csrfRes.ok) {
      throw new Error('CSRF HTTP ' + csrfRes.status);
    }

    const csrf = await csrfRes.json();

    if (!csrf.token || !csrf.headerName) {
      throw new Error('ไม่พบ CSRF Token');
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token
      },
      body: JSON.stringify({
        eventId: Number(id),
        quantity: qty,
        contactName: form.elements.contactName.value.trim(),
        contactPhone: form.elements.contactPhone.value.trim(),
        contactEmail: form.elements.contactEmail.value.trim(),
        bankId: form.elements.bankId.value
      })
    });

    if(response.status===401){BTBookingSession.expired(form,id);return false;}
    if(response.status===403)throw new Error(L?'Security check failed. Please try again.':'ตรวจสอบความปลอดภัยไม่สำเร็จ กรุณาลองอีกครั้ง');
    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        'Booking HTTP ' + response.status + ': ' +
        message.slice(0, 200)
      );
    }

    const booking = await response.json();
    BTBookingSession.clear();
    const slip = form.elements.slip?.files?.[0];
    let uploadWarning = '';
    if (slip) {
      try {
        if (slip.size > 5000000 || !['image/jpeg','image/png','image/webp'].includes(slip.type))
          throw new Error('สลิปต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
        const fd = new FormData(); fd.append('file', slip);
        const sr = await fetch(`/api/payments/booking/${booking.id}/slip`, {
          method:'POST', credentials:'same-origin', headers:{[csrf.headerName]:csrf.token},body:fd
        });
        if (!sr.ok) throw new Error('อัปโหลดสลิปไม่สำเร็จ (HTTP '+sr.status+')');
      } catch (ex) {uploadWarning = ex.message;}
    }

    const modal = document.getElementById('md');

    modal.innerHTML = `
      <div style="
        position:fixed;inset:0;z-index:99999;
        background:rgba(10,26,55,.65);
        backdrop-filter:blur(5px);
        display:flex;align-items:center;justify-content:center;
        padding:20px;overflow-y:auto;
      ">
        <div role="dialog" aria-modal="true"
          aria-labelledby="bt-success-title"
          style="
          background:white;border-radius:24px;
          width:100%;max-width:490px;
          padding:30px 24px;text-align:center;
          box-shadow:0 24px 70px rgba(0,0,0,.2);
          color:#172554;
        ">
          <div style="
            background:#dcfce7;color:#16a34a;
            width:76px;height:76px;border-radius:50%;
            display:grid;place-items:center;
            font-size:42px;margin:0 auto 18px;
          ">✓</div>

          <h2 id="bt-success-title"
              style="font-size:28px;margin:0 0 10px;
                     color:#172554">
            <span data-bt-success-th="จองสำเร็จ!" data-bt-success-en="Booking successful!">${L?'Booking successful!':'จองสำเร็จ!'}</span>
          </h2>

          <p style="color:#64748b;margin-bottom:22px">
            <span data-bt-success-th="ระบบบันทึกรายการจองของคุณเรียบร้อยแล้ว" data-bt-success-en="Your booking has been saved.">${L?'Your booking has been saved.':'ระบบบันทึกรายการจองของคุณเรียบร้อยแล้ว'}</span>
          </p>

          <div style="
            background:#f1f5ff;border-radius:16px;
            padding:20px;text-align:left;
          ">
            <div style="display:flex;justify-content:space-between;
                        gap:12px;margin-bottom:14px">
              <span><span data-bt-success-th="หมายเลขการจอง" data-bt-success-en="Booking number">${L?'Booking number':'หมายเลขการจอง'}</span></span>
              <strong>#${Z(booking.id)}</strong>
            </div>

            <div style="display:flex;justify-content:space-between;
                        gap:12px;margin-bottom:14px">
              <span><span data-bt-success-th="จำนวนที่นั่ง" data-bt-success-en="Seats">${L?'Seats':'จำนวนที่นั่ง'}</span></span>
              <strong>${Z(booking.quantity)} ${L?(Number(booking.quantity)===1?'seat':'seats'):'ที่นั่ง'}</strong>
            </div>

            <div style="display:flex;justify-content:space-between;
                        gap:12px;margin-bottom:14px">
              <span><span data-bt-success-th="ยอดรวม" data-bt-success-en="Total">${L?'Total':'ยอดรวม'}</span></span>
              <strong style="color:#1d4ed8;font-size:22px">
                ฿${Number(booking.totalPrice).toLocaleString(
                  L?'en-GB':'th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}
                )}
              </strong>
            </div>

            <div style="display:flex;justify-content:space-between;
                        gap:12px">
              <span><span data-bt-success-th="สถานะ" data-bt-success-en="Status">${L?'Status':'สถานะ'}</span></span>
              <strong style="
                background:#fef3c7;color:#92400e;
                padding:5px 12px;border-radius:30px;
                font-size:13px
              ">${Z(booking.status==='PENDING'?(L?'Pending payment':'รอชำระเงิน'):BTLocale.status(booking.status))}</strong>
            </div>
          </div>

          <p style="
            color:#64748b;font-size:13px;
            margin:20px 0;line-height:1.8
          ">
            ${L?'This booking does not confirm payment.':'รายการจองนี้ยังไม่ใช่การยืนยันชำระเงิน'}
            <br>
            ${uploadWarning ? (L?'Your booking was saved, but the slip could not be uploaded. Please upload it in My Bookings.':'การจองสำเร็จ แต่อัปโหลดสลิปไม่สำเร็จ กรุณาแนบสลิปในหน้าการจองของฉัน') : (slip ? (L?'Your payment slip has been submitted for review.':'ส่งสลิปให้ผู้ดูแลตรวจสอบแล้ว') : (L?'You can pay and upload your slip in My Bookings.':'สามารถชำระเงินและแนบสลิปเพิ่มเติมได้ในหน้าการจองของฉัน'))}
          </p>

          <button type="button" class="btn"
            style="
              width:100%;padding:15px;
              border-radius:12px;font-size:16px;
              background:#1d4ed8;color:white
            "
            onclick="document.getElementById('md').innerHTML=''">
            <span data-bt-success-th="ปิดหน้าต่าง" data-bt-success-en="Close">${L?'Close':'ปิดหน้าต่าง'}</span>
          </button>
        </div>
      </div>`;
    BTBookings.refresh('my');
    loadAPIEvents();

  } catch (error) {
    console.error('BlueTrail Booking:', error);
    er((L?'Booking could not be completed: ':'จองไม่สำเร็จ: ') + error.message);
  } finally {
    button.disabled = false;
    button.textContent = L?'Confirm booking':'ยืนยันการจอง';
  }

  return false;
},
lang(){
 const form=document.querySelector('form#bt-api-book-form')||document.querySelector('form:has(select[name=bankId])');
 const draft=form&&location.hash.startsWith('#/api-book/')?Array.from(form.elements).filter(e=>e.name).map(e=>({name:e.name,value:e.value,files:e.type==='file'?e.files:null})):null;
 L=L?0:1;ls.s('lang',L);draw();
 const restore=()=>{const f=document.querySelector('form#bt-api-book-form')||document.querySelector('form:has(select[name=bankId])');if(!f)return false;for(const d of draft||[]){const e=f.elements.namedItem(d.name);if(!e)continue;if(d.files){try{e.files=d.files;}catch{}}else e.value=d.value;}f.elements.namedItem('qty')?.dispatchEvent(new Event('input',{bubbles:true}));if(window.BTBanks){BTBanks.sync(f);BTBanks.refresh?.();}return true;};
 if(draft&&!restore()){const o=new MutationObserver(()=>{if(restore())o.disconnect();});o.observe(document.getElementById('app'),{childList:true,subtree:true});setTimeout(()=>o.disconnect(),10000);}
},out(){BTBookingSession.clear();BTAuth.logout().then(()=>{ME=null;ls.s('me',null);go('/');draw();}).catch(error=>toast(error.message,1));return false},tab(x){AT=x;if(x=='rq')BTAdminRequests.load().then(()=>draw());if(x=='qt')QV='list';if(x=='pay')PVID=0;draw()},rf(k,v){RF[k]=v;AT='rq';draw()},
hs(e){e.preventDefault();F={cat:'',reg:'',prov:'',q:$('#hq').value};go('/events');return false},
f(k,v){PGS.pe=0;if(k=='clear')F={cat:'',reg:'',prov:'',q:''};else if(k=='cat')F={cat:v,reg:'',prov:'',q:F.q};else if(k=='reg'){F.reg=v;F.prov=''}else F[k]=v;draw();const h=$('#head');if(h&&h.getBoundingClientRect().top<(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nh'))||64)+(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bh'))||0))h.scrollIntoView()},
car(d,i){const n=DB.events.filter(e=>e.feat&&!e.arch).length;CI=i!=null?i:(CI+d+n)%n;const s=document.querySelectorAll('#car .sl'),o=document.querySelectorAll('#car .dots i');s.forEach((x,j)=>x.classList.toggle('on',j==CI));o.forEach((x,j)=>x.classList.toggle('on',j==CI))},
auth(e,reg){e.preventDefault();const d=fd(e);BTAuth.submit(d,!!reg).then(user=>{ME=user;ls.s("me",null);if(BTBookingSession.resume(user))return;go(user.role=="admin"?"/admin":user.role=="organizer"?"/organizer":"/");draw();}).catch(error=>er(error.message));return false},book(e,id){e.preventDefault();const d=fd(e),x=ev(id),q=+d.qty;if(!d.name||!d.phone||!d.email||!(q>=1))return er(t('req'));if(q>x.seats)return er(L?'Not enough seats':'ที่นั่งไม่พอ');x.seats-=q;const b={id:++DB.seq.b,uid:ME.id,eid:id,qty:q,total:q*x.price,name:d.name,phone:d.phone,email:d.email,pay:'Pending',st:'Pending',slip:'',created:now(),dueAt:new Date(Date.now()+(+DB.contact.hold||24)*36e5).toISOString()};DB.bookings.push(b);sv();go('/pay/'+b.id);return false},
creq(e){
    e.preventDefault();

    const d = fd(e);
    const budgetInput=e.target.querySelector('[name="budget"]');
    const budgetRaw=String(d.budget||'').replaceAll(',','').trim();
    if((budgetInput&&!budgetInput.checkValidity()) || (budgetRaw!==''&&(!/^\d+(\.\d{1,2})?$/.test(budgetRaw)||Number(budgetRaw)>9999999999999.99))) {
      return er(L?'Enter a valid budget with up to 2 decimal places.':'กรุณากรอกงบประมาณให้ถูกต้องและทศนิยมไม่เกิน 2 ตำแหน่ง');
    }
    d.budget=budgetRaw;
    const required = [
        "name", "type", "date", "loc", "st", "et",
        "cname", "phone", "email"
    ];

    const missing = required.filter(
        k => !String(d[k] || "").trim()
    );

    if (missing.length) {
        return er(
            L ? "Please complete all required fields"
              : "กรุณากรอกข้อมูลที่จำเป็นให้ครบ"
        );
    }

    if (!d.endDate || d.endDate < d.date) return er(L ? "Please choose an end date on or after the start date" : "กรุณาเลือกวันจบงานที่ไม่ก่อนวันเริ่ม");
    if (d.endDate === d.date && d.st && d.et && d.et <= d.st) {
        return er(
            L ? "End time must be after start time"
              : "เวลาสิ้นสุดต้องหลังเวลาเริ่ม"
        );
    }

    const files = e.target.querySelector(
        'input[name="files"]'
    );

    if (files && (files.files.length > 5 || [...files.files].some(f =>
        f.size > 5000000 || !['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type))))
        return er('แนบได้สูงสุด 5 ไฟล์ (JPG, PNG, WebP หรือ PDF ไม่เกิน 5 MB ต่อไฟล์)');

    if (!ME || !ME.id) {
        go("/login");
        return false;
    }

    const payload = {
        title: String(d.name).trim(),
        category: String(d.type).trim(),
        description: String(d.detail || "").trim(),
        location: String(d.loc).trim(),
        requestedDate: String(d.date),
        endDate: String(d.endDate),
        guestCount: Math.max(1, Number(d.pax) || 1),
        budget: Number(d.budget) || 0,
        additionalDetails: JSON.stringify({
            startTime: d.st || "",
            endTime: d.et || "",
            theme: d.theme || "",
            equipment: d.equip || "",
            contactName: d.cname || "",
            contactPhone: d.phone || "",
            contactEmail: d.email || ""
        })
    };

    const button = e.target.querySelector(
        'button[type="submit"], button.btn'
    );

    if (button) button.disabled = true;

    BTAuth.request("/api/event-requests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(async result => {
        if (files?.files?.length) {
          const token = await fetch('/api/auth/csrf',{credentials:'same-origin'}).then(r=>r.json());
          let failures=0;
          for (const file of files.files) {
            const data=new FormData();data.append('file',file);
            const r=await fetch(`/api/event-requests/${Number(result.id)}/files`,{
              method:'POST',credentials:'same-origin',headers:{[token.headerName]:token.token},body:data
            });
            if(!r.ok) failures++;
          }
          if(failures) toast(`สร้างคำขอแล้ว แต่มีไฟล์ ${failures} ไฟล์ที่อัปโหลดไม่สำเร็จ`,1);
        }
        go("/");
        draw();

        toast(
            L
              ? "Event request #" + result.id + " submitted successfully"
              : "ส่งคำขอจัด Event #" + result.id + " สำเร็จ"
        );
    })
    .catch(error => {
        er(error.message);

        if (button) button.disabled = false;
    });

    return false;
},cc(id){const r=DB.reqs.find(x=>x.id==id);r.cc=true;r.updated=now();hist('R'+id,'confirm','confirm',T2('ลูกค้ายืนยันข้อเสนอ','Customer confirmed proposal'));sv();draw()},
chg(e,id){e.preventDefault();const r=DB.reqs.find(x=>x.id==id);if(!ME||!r||r.uid!=ME.id||!['info','confirm'].includes(r.status))return false;const m=fd(e).m.trim();if(m.length<5)return toast(L?'Please describe your request (at least 5 characters)':'กรุณาระบุรายละเอียดอย่างน้อย 5 ตัวอักษร',1);const ty=r.status=='info'?'info_response':'quotation_revision';DB.seq.cr=(DB.seq.cr||0)+1;DB.creqs.push({id:DB.seq.cr,type:ty,rid:id,uid:ME.id,text:m,at:now(),updated:now(),status:'pending',reply:'',result:'',log:[{at:now(),by:ME.name,txt:T2('ส่งคำขอ','Submitted')}]});r.cc=false;setR(r,'review',T2(TYP[ty][0],TYP[ty][1]));draw();toast(L?'Request sent to our team':'ส่งคำขอให้ทีมงานแล้ว');return false},
rcancel(id){A.ask(L?'Cancel this request?':'ยืนยันยกเลิกคำขอ?',()=>{setR(DB.reqs.find(x=>x.id==id),'cancel');draw()})},
acc(e){e.preventDefault();const d=fd(e),f=e.target.av.files[0];rd(f,u=>{ME.name=d.name||ME.name;ME.phone=d.phone;if(u)ME.av=u;sv();draw()});return false},
role(id,r){const u=us(id);if(u.role=='admin'&&r!='admin'&&DB.users.filter(x=>x.role=='admin'&&!x.off).length<2){toast(L?'Cannot remove the last admin':'เปลี่ยนสิทธิ์แอดมินคนสุดท้ายไม่ได้',1);return draw()}u.role=r;if(sv())draw()},ct(e){e.preventDefault();const bt=e.submitter;if(bt){if(bt.disabled)return false;bt.disabled=true}const o=cp(DB.contact);Object.assign(DB.contact,fd(e));DB.contact.hold=Math.max(1,Math.round(+DB.contact.hold)||24);if(sv())toast(L?'Contact information saved':'บันทึกข้อมูลติดต่อสำเร็จ');else DB.contact=o;if(bt)setTimeout(()=>bt.disabled=false,500);return false},
rst(id,s){setR(DB.reqs.find(x=>x.id==id),s);draw()},
aedit(e,id){e.preventDefault();const r=DB.reqs.find(x=>x.id==id),d=fd(e);if(d.st&&d.et&&d.et<=d.st)return toast(L?'End time must be after start time':'เวลาจบต้องหลังเวลาเริ่ม',1);const o=cp(r),bt=e.submitter;if(bt){if(bt.disabled)return false;bt.disabled=true}Object.assign(r,d,{pax:+d.pax,budget:+d.budget});r.updated=now();if(sv())toast(L?'Request saved':'บันทึกข้อมูลคำขอสำเร็จ');else Object.assign(r,o);if(bt)setTimeout(()=>bt.disabled=false,500);return false},
note(e,id){e.preventDefault();const d=fd(e),r=DB.reqs.find(x=>x.id==id),ask=e.submitter&&e.submitter.name=='ask';DB.notes.push({rid:id,by:ME.name,text:d.m,cust:!!d.c||ask,at:now()});if(ask)setR(r,'info',d.m);sv();draw();return false},
assign(e,id){e.preventDefault();const d=fd(e);DB.asg.push({id:DB.asg.length+10,rid:id,oid:+d.o,by:ME.id,at:now(),note:d.n,st:'assigned'});hist('R'+id,'confirmed','confirmed',T2('มอบหมายผู้จัด: '+us(+d.o).name,'Assigned organizer: '+us(+d.o).name));sv();draw();return false},
ost(id,s){const a=DB.asg.find(x=>x.id==id),r=DB.reqs.find(x=>x.id==a.rid);a.st=s;setR(r,s);draw()},
evf(id){const e=id?ev(id):{th:'',en:'',cat:'tour',prov:'chiangmai',date:day(30),st:'07:00',et:'18:00',price:1000,orig:0,seats:20,theme:'mountain',feat:false,d:['','']};$('#md').innerHTML=`<div class="md"><form class="card pad" onsubmit="return A.evs(event,${id})"><h3>${id?(L?'Edit':'แก้ไข'):(L?'New':'เพิ่ม')}</h3><div class="fg">${fl('th','ชื่อไทย','',1,e.th)}${fl('en','English name','',1,e.en)}<div><label>${t('events')}</label><select name="cat">${['tour','event'].map(c=>`<option value="${c}" ${e.cat==c?'selected':''}>${t(c)}</option>`).join('')}</select></div><div><label>${L?'Province (region auto)':'จังหวัด (ภาคอัตโนมัติ)'}</label><select name="prov">${Object.keys(P).map(k=>`<option value="${k}" ${e.prov==k?'selected':''}>${P[k][L]} – ${R[P[k][2]][L]}</option>`).join('')}</select></div>${fl('date',t('date'),'date',1,e.date)}${fl('st','Start','time',1,e.st)}${fl('et','End','time',1,e.et)}${fl('price',L?'Price':'ราคา','number',1,e.price)}${fl('orig',L?'Original price':'ราคาเดิม','number',0,e.orig)}${fl('seats',L?'Seats':'ที่นั่ง','number',1,e.seats)}<div><label>${L?'Image style':'สไตล์ภาพ'}</label><select name="theme">${e.theme.startsWith('data')?`<option value="__keep">${L?'Uploaded photo':'รูปที่อัปโหลด'}</option>`:''}${Object.keys(TH).map(k=>`<option ${e.theme==k?'selected':''}>${k}</option>`).join('')}</select></div><div><label>${L?'Upload real photo (optional)':'อัปโหลดรูปจริง (ไม่บังคับ)'}</label><input type="file" name="ph" accept="image/*"></div></div>${fl('d0','รายละเอียด (ไทย)','ta',0,e.d[0])}${fl('d1','Description (EN)','ta',0,e.d[1])}<label><input type="checkbox" name="feat" style="width:auto" ${e.feat?'checked':''}> Featured</label><p><button class="btn">${t('save')}</button> <button type="button" class="btn o" onclick="$('#md').innerHTML=''">${t('cancel')}</button></p></form></div>`},
evs(e,id){e.preventDefault();const d=fd(e);A.rz(d.ph,u=>A.evs2(d,id,u));return false},
rz(f,cb){if(!f||!f.size)return cb('');const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,900/i.width),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};i.onerror=()=>cb('');i.src=r.result};r.readAsDataURL(f)},
evs2(d,id,u){const o={th:d.th,en:d.en,cat:d.cat,prov:d.prov,region:P[d.prov][2],date:d.date,st:d.st,et:d.et,price:+d.price,orig:+d.orig||0,seats:+d.seats,theme:u||(d.theme=='__keep'?ev(id).theme:d.theme),feat:!!d.feat,d:[d.d0,d.d1]};if(id)Object.assign(ev(id),o);else DB.events.push({id:DB.seq.e++,...o});sv();$('#md').innerHTML='';draw();return false}};
window.addEventListener('hashchange',()=>{draw();window.scrollTo(0,0)});window.addEventListener('resize',sizes);if(window.ResizeObserver)new ResizeObserver(sizes).observe(document.body);
migLegacy();BTBusiness.refreshContact();loadAPIEvents();setInterval(()=>{if(sweep())draw()},60000);setInterval(()=>{if($('#car')&&!document.hidden)A.car(1)},5500);BTAuth.restore().then(user=>{ME=user;btSessionReady=true;draw()}).catch(error=>{console.error(error);ME=null;btSessionReady=true;draw()});

