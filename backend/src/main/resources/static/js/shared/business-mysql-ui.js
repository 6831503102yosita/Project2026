window.BTBusiness = (() => {
  const dictionary={"ลองใหม่": "Retry", "กำลังโหลดข้อมูล...": "Loading…", "ผู้ใช้": "Users", "+ เพิ่มผู้ใช้": "+ Add user", "โหลดใหม่": "Refresh", "ชื่อ": "Name", "อีเมล": "Email", "บันทึกสิทธิ์": "Save role", "ยืนยันเปลี่ยนสิทธิ์ผู้ใช้นี้?": "Change this user’s role?", "โทรศัพท์": "Phone", "ที่อยู่": "Address", "ข้อมูลชำระเงิน": "Payment information", "ชั่วโมงถือที่นั่ง": "Seat hold hours", "บันทึกข้อมูลติดต่อแล้ว": "Contact settings saved", "บันทึก": "Save", "มอบหมายงานจากคำขอ Event": "Assign work from an event request", "คำขอ Event": "Event request", "ผู้จัดงาน": "Organizer", "หมายเหตุ": "Notes", "มอบหมายงาน": "Assign work", "จำนวนงานที่ได้รับ": "Assigned jobs", "งานที่มอบหมาย": "Assigned work", "ผู้รับผิดชอบปัจจุบัน": "Current organizer", "จัดการการมอบหมาย": "Manage assignment", "รายละเอียด / ความคืบหน้า": "Details / Progress", "เลือกผู้รับผิดชอบคนใหม่": "Select a new organizer", "เปลี่ยนผู้รับผิดชอบ": "Reassign", "ยกเลิกการมอบหมาย": "Cancel assignment", "ยังไม่มีงานที่มอบหมาย": "No assigned work yet", "ยกเลิกการมอบหมายงานนี้ใช่ไหม? งานยังคงอยู่และสามารถมอบหมายใหม่ได้": "Cancel this assignment? The request will remain available for reassignment.", "ยกเลิกการมอบหมายแล้ว": "Assignment cancelled", "กรุณาเลือกผู้รับผิดชอบคนใหม่ก่อน": "Select a new organizer first", "ยืนยันย้ายงานให้ผู้รับผิดชอบที่เลือก? สถานะการมอบหมายจะกลับเป็น ASSIGNED": "Reassign this work to the selected organizer? The assignment status will reset to Assigned.", "เปลี่ยนผู้รับผิดชอบแล้ว": "Organizer changed", "กรุณาเข้าสู่ระบบ": "Please sign in", "บัญชีของฉัน": "Account", "สิทธิ์": "Role", "บันทึกข้อมูล": "Save details", "บันทึกข้อมูลบัญชีแล้ว": "Account saved"};
  const tx=s=>BTLocale.en()?s.replace(new RegExp("\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e22\u0e49\u0e32\u0e22\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e49\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01\\?\\ \u0e2a\u0e16\u0e32\u0e19\u0e30\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e08\u0e30\u0e01\u0e25\u0e31\u0e1a\u0e40\u0e1b\u0e47\u0e19\\ ASSIGNED|\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e07\u0e32\u0e19\u0e19\u0e35\u0e49\u0e43\u0e0a\u0e48\u0e44\u0e2b\u0e21\\?\\ \u0e07\u0e32\u0e19\u0e22\u0e31\u0e07\u0e04\u0e07\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e30\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49|\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a\u0e04\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e01\u0e48\u0e2d\u0e19|\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e19\u0e35\u0e49\\?|\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\\ /\\ \u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32|\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e07\u0e32\u0e19\u0e08\u0e32\u0e01\u0e04\u0e33\u0e02\u0e2d\\ Event|\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a\u0e04\u0e19\u0e43\u0e2b\u0e21\u0e48|\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27|\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e41\u0e25\u0e49\u0e27|\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e07\u0e32\u0e19\u0e17\u0e35\u0e48\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22|\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e41\u0e25\u0e49\u0e27|\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19|\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27|\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a|\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\\.\\.\\.|\u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07\u0e16\u0e37\u0e2d\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07|\u0e08\u0e33\u0e19\u0e27\u0e19\u0e07\u0e32\u0e19\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a|\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22|\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22|\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a|\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19|\\+\\ \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49|\u0e07\u0e32\u0e19\u0e17\u0e35\u0e48\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22|\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c|\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25|\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e02\u0e2d\u0e07\u0e09\u0e31\u0e19|\u0e04\u0e33\u0e02\u0e2d\\ Event|\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e07\u0e32\u0e19|\u0e1c\u0e39\u0e49\u0e08\u0e31\u0e14\u0e07\u0e32\u0e19|\u0e42\u0e2b\u0e25\u0e14\u0e43\u0e2b\u0e21\u0e48|\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c|\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38|\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48|\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48|\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49|\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01|\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c|\u0e2d\u0e35\u0e40\u0e21\u0e25|\u0e0a\u0e37\u0e48\u0e2d","g"),key=>dictionary[key]):s;
  const state={users:[],assignments:[],mine:[],requests:[],loading:{},loaded:{},error:{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url,options={}){
    const headers={...(options.headers||{})};
    if(options.method && options.method !== 'GET'){
      const r=await fetch('/api/auth/csrf',{credentials:'same-origin'});
      if(!r.ok)throw Error(r.status===401?BTLocale.text('กรุณาเข้าสู่ระบบใหม่','Please sign in again'):BTLocale.text('ตรวจสอบความปลอดภัยไม่สำเร็จ กรุณาลองอีกครั้ง','Security check failed. Please try again'));
      const c=await r.json(); headers[c.headerName]=c.token;
    }
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});
    if(!r.ok){const message=r.status===401?BTLocale.text('กรุณาเข้าสู่ระบบใหม่','Please sign in again'):r.status===429?BTLocale.text('กรุณารอ 1 นาทีก่อนส่งอีกครั้ง','Please wait 1 minute before resending'):'HTTP '+r.status+' '+(await r.text()).slice(0,150);const error=new Error(message);error.status=r.status;throw error;}
    return r.status===204?null:r.json();
  }
  async function load(key,url){
    if(state.loading[key])return;
    state.loading[key]=true;state.error[key]='';
    try{state[key]=await api(url);state.loaded[key]=true;}
    catch(e){state.error[key]=e.message;}
    finally{state.loading[key]=false; if(typeof draw==='function')draw();}
  }
  let mineOwner='';
  function panel(key,url){
    if(key==='mine'){const owner=typeof ME!=='undefined'?ME?.email:'';if(mineOwner!==owner){mineOwner=owner;state.mine=[];state.loaded.mine=false;state.error.mine='';}}
    if(!state.loaded[key]&&!state.loading[key]&&!state.error[key])load(key,url);
    if(state.error[key])return `<div class="card pad"><p class="err">${esc(state.error[key])}</p><button class="btn" onclick="BTBusiness.refresh('${key}')">${tx("ลองใหม่")}</button></div>`;
    if(!state.loaded[key])return tx('<div class="card pad">กำลังโหลดข้อมูล...</div>');
    return null;
  }
  const urls={users:'/api/admin/users',assignments:'/api/admin/organizer-assignments',mine:'/api/organizer/assignments/my',requests:'/api/admin/event-requests'};
  function refresh(key){state.loaded[key]=false;state.error[key]='';load(key,urls[key]);}
  function users(){
    const loading=panel('users',urls.users);if(loading)return loading;
    return `<div class="sh"><h2>${tx("ผู้ใช้")} (${state.users.length})</h2><div class="ac"><button type="button" class="btn" onclick="BTEnhancements.createUser()">${tx("+ เพิ่มผู้ใช้")}</button><button class="btn sm o" onclick="BTBusiness.refresh('users')">${tx("โหลดใหม่")}</button></div></div><div class="tw"><table><tr><th>${tx("ชื่อ")}</th><th>${tx("อีเมล")}</th><th>${tx("สิทธิ์")}</th><th></th></tr>${state.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select id="bt-role-${Number(u.id)}">${['CUSTOMER','ORGANIZER','ADMIN'].map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${esc(BTLocale.status(r))}</option>`).join('')}</select></td><td><button class="btn sm o" onclick="BTBusiness.role(${Number(u.id)})">${tx("บันทึกสิทธิ์")}</button></td></tr>`).join('')}</table></div>`;
  }
  async function role(id){
    const select=document.getElementById('bt-role-'+id);
    if(!select)return;
    const u=state.users.find(x=>Number(x.id)===id);
    const role=select.value;
    if(role===u?.role)return;
    if(!window.confirm(tx('ยืนยันเปลี่ยนสิทธิ์ผู้ใช้นี้?'))){select.value=u.role;return;}
    try{await api('/api/admin/users/'+id+'/role',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role})});refresh('users');}
    catch(e){alert(e.message);select.value=u.role;}
  }
  function contactForm(){
    const c=DB.contact;
    const fields=[['phone',tx('โทรศัพท์')],['email',tx('อีเมล')],['line','LINE'],['fb','Facebook'],['ig','Instagram'],['addr',tx('ที่อยู่')],['addrEn',typeof L!=='undefined'&&L?'Address (Thai)':'ที่อยู่ภาษาอังกฤษ'],['pay',tx('ข้อมูลชำระเงิน')],['hold',tx('ชั่วโมงถือที่นั่ง')]];
    return `<form class="card pad" onsubmit="BTBusiness.saveContact(event);return false"><div class="fg">${fields.map(([k,label])=>`<div><label>${label}</label><input name="${typeof L!=='undefined'&&L?(k==='addr'?'addrEn':k==='addrEn'?'addr':k):k}" value="${esc(k==='addr'?(typeof L!=='undefined'&&L?BTLocale.address(c.addr,c.addrEn):c.addr):k==='addrEn'?(typeof L!=='undefined'&&L?c.addr:(c.addrEn||BTLocale.address(c.addr,c.addrEn))):c[k]??'')}" ${k==='hold'?'type="number" min="1" max="720"':''}></div>`).join('')}</div><p id="bt-contact-error" class="err"></p><br><button class="btn">${tx("บันทึก")}</button></form>`;
  }
  async function refreshContact(){
    try{const data=await api('/api/site/contact');Object.assign(DB.contact,data);DB.contact.email="Bluetrail888@gmail.com";if(typeof draw==='function')draw();}
    catch(e){console.warn('Unable to load site contact settings',e);}
  }
  async function saveContact(event){
    event.preventDefault(); const b=event.target.querySelector('button');
    const payload=Object.fromEntries(new FormData(event.target).entries());b.disabled=true;
    try{const data=await api('/api/admin/site/contact',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});Object.assign(DB.contact,data);DB.contact.email="Bluetrail888@gmail.com";draw();toast(tx('บันทึกข้อมูลติดต่อแล้ว'));}
    catch(e){const box=document.getElementById('bt-contact-error');if(box)box.textContent=e.message;}
    finally{b.disabled=false;}
    return false;
  }

  function organizers(){
    const pending=panel('assignments',urls.assignments);
    if(pending)return pending;
    const peoplePending=panel('users',urls.users);
    const requestsPending=panel('requests',urls.requests);
    if(peoplePending || requestsPending)
      return peoplePending || requestsPending;

    const orgs=state.users.filter(u=>u.role==='ORGANIZER');
    const assignForm=`<form class="card pad" onsubmit="return BTBusiness.assign(event)">
      <h3>${tx("มอบหมายงานจากคำขอ Event")}</h3>
      <div class="fg">
        <div><label>${tx("คำขอ Event")}</label><select name="requestId" required>
          ${state.requests.map(r=>`<option value="${Number(r.id)}">#${Number(r.id)} ${esc(r.title)}</option>`).join('')}
        </select></div>
        <div><label>${tx("ผู้จัดงาน")}</label><select name="organizerId" required>
          ${orgs.map(u=>`<option value="${Number(u.id)}">${esc(u.name)}</option>`).join('')}
        </select></div>
      </div>
      <label>${tx("หมายเหตุ")}</label><textarea name="note" maxlength="2000"></textarea>
      <p class="err" id="bt-assign-error"></p>
      <button class="btn" type="submit"
        ${!state.requests.length||!orgs.length?'disabled':''}>${tx("มอบหมายงาน")}</button>
    </form>`;

    return `<div class="sh"><h2>${tx("ผู้จัดงาน")}</h2>
      <button class="btn sm o" onclick="BTBusiness.reloadOrganizers()">${tx("โหลดใหม่")}</button></div>
      ${assignForm}
      <div class="tw"><table>
        <tr><th>${tx("ชื่อ")}</th><th>${tx("อีเมล")}</th><th>${tx("จำนวนงานที่ได้รับ")}</th></tr>
        ${orgs.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td>
          <td>${state.assignments.filter(a=>Number(a.organizerId)===Number(u.id)).length}</td></tr>`).join('')}
      </table></div>
      <h3>${tx("งานที่มอบหมาย")}</h3>
      <p id="bt-assignment-action-message" role="status"></p>
      <div class="tw"><table>
        <tr><th>${BTLocale.text('งาน','Event')}</th><th>${tx("ผู้รับผิดชอบปัจจุบัน")}</th><th>${BTLocale.text('สถานะ','Status')}</th><th>${tx("จัดการการมอบหมาย")}</th></tr>
        ${state.assignments.map(a=>`<tr>
          <td>${esc(BTLocale.title(a))}<br><button type="button" class="btn sm o" onclick="BTEnhancements.work(${Number(a.id)},true)">${tx("รายละเอียด / ความคืบหน้า")}</button></td>
          <td>${esc(a.organizerName)}</td>
          <td><span class="badge">${esc(BTLocale.status(a.status))}</span></td>
          <td><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select id="bt-reassign-${Number(a.id)}" aria-label="${tx("เลือกผู้รับผิดชอบคนใหม่")}"
              style="min-width:160px;max-width:230px">
              <option value="">${tx("เลือกผู้รับผิดชอบคนใหม่")}</option>
              ${orgs.filter(u=>Number(u.id)!==Number(a.organizerId)).map(u=>
                `<option value="${Number(u.id)}">${esc(u.name)}</option>`).join('')}
            </select>
            <button type="button" class="btn sm o"
              onclick="BTBusiness.reassignWork(${Number(a.id)},this)">${tx("เปลี่ยนผู้รับผิดชอบ")}</button>
            <button type="button" class="btn sm o" style="color:#b42318;border-color:#f3b7b2"
              onclick="BTBusiness.cancelWork(${Number(a.id)},this)">${tx("ยกเลิกการมอบหมาย")}</button>
          </div></td>
        </tr>`).join('') || tx('<tr><td colspan="4">ยังไม่มีงานที่มอบหมาย</td></tr>')}
      </table></div>`;
  }

  async function reloadOrganizers(){
    await load('users',urls.users);
    await load('requests',urls.requests);
    await load('assignments',urls.assignments);
  }

  async function cancelWork(id,button){
    if(!window.confirm(tx('ยกเลิกการมอบหมายงานนี้ใช่ไหม? งานยังคงอยู่และสามารถมอบหมายใหม่ได้')))return;
    button.disabled=true;
    const message=document.getElementById('bt-assignment-action-message');
    try{
      await api('/api/admin/organizer-assignments/'+id,{method:'DELETE'});
      state.loaded.mine=false;
      await load('assignments',urls.assignments);
      if(typeof toast==='function')toast(tx('ยกเลิกการมอบหมายแล้ว'));
    }catch(e){
      if(message)message.textContent=e.message;
    }finally{button.disabled=false;}
  }

  async function reassignWork(id,button){
    const select=document.getElementById('bt-reassign-'+id);
    const message=document.getElementById('bt-assignment-action-message');
    if(!select?.value){
      if(message)message.textContent=tx('กรุณาเลือกผู้รับผิดชอบคนใหม่ก่อน');
      return;
    }
    const organizerId=Number(select.value);
    if(!window.confirm(tx('ยืนยันย้ายงานให้ผู้รับผิดชอบที่เลือก? สถานะการมอบหมายจะกลับเป็น ASSIGNED')))return;
    button.disabled=true;
    try{
      await api('/api/admin/organizer-assignments/'+id+'/organizer',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizerId})
      });
      state.loaded.mine=false;
      await load('assignments',urls.assignments);
      if(typeof toast==='function')toast(tx('เปลี่ยนผู้รับผิดชอบแล้ว'));
    }catch(e){
      if(message)message.textContent=e.message;
    }finally{button.disabled=false;}
  }

  async function assign(event){
    event.preventDefault();
    const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;
    const data=Object.fromEntries(new FormData(form).entries());
    try{await api('/api/admin/organizer-assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:Number(data.requestId),organizerId:Number(data.organizerId),note:data.note||''})});refresh('assignments');}
    catch(e){const box=document.getElementById('bt-assign-error');if(box)box.textContent=e.message;}
    finally{button.disabled=false;}
    return false;
  }

  let workTab='all',workQuery='';
  function workHistory(){
    const pending=panel('mine',urls.mine);
    if(pending)return `<section class="bt-account-history">${pending}</section>`;
    const tx=BTLocale.text,st=BTLocale.status;
    const rows=state.mine.filter(a=>(workTab==='all'||a.status===workTab)&&[a.eventTitle,BTLocale.place(a.location)].join(' ').toLowerCase().includes(workQuery.toLowerCase()));
    return `<section class="bt-account-history" data-work-history><div class="sh"><h2>${tx('ประวัติงานของฉัน','My work history')}</h2><button type="button" class="btn sm o" onclick="BTBusiness.refresh('mine')">${tx('โหลดใหม่','Refresh')}</button></div>
      <div class="bt-account-stats">${[['all','งานทั้งหมด','All work'],['ASSIGNED','รับมอบหมาย','Assigned'],['PROGRESS','กำลังดำเนินการ','In progress'],['DONE','เสร็จแล้ว','Completed']].map(([key,th,en])=>`<article><strong>${state.mine.filter(a=>key==='all'||a.status===key).length}</strong><span>${tx(th,en)}</span></article>`).join('')}</div>
      <div class="bt-history-tools"><div class="bt-history-tabs" role="group" aria-label="${tx('กรองงาน','Filter work')}">${[['all','ทั้งหมด','All'],['ASSIGNED','รับมอบหมาย','Assigned'],['PROGRESS','กำลังทำ','In progress'],['DONE','เสร็จแล้ว','Completed']].map(([key,th,en])=>`<button type="button" class="btn sm ${workTab===key?'':'o'}" aria-pressed="${workTab===key}" onclick="BTBusiness.filterWork('${key}')">${tx(th,en)}</button>`).join('')}</div><input class="bt-work-search" type="search" value="${esc(workQuery)}" placeholder="${tx('ค้นหางานหรือสถานที่','Search work or location')}" aria-label="${tx('ค้นหาประวัติงาน','Search work history')}" oninput="BTBusiness.findWork(this)"></div>
      ${rows.map(a=>`<article class="card pad" style="margin-top:14px"><div class="sh"><h3>${esc(BTLocale.title(a))}</h3><span class="badge">${esc(st(a.status))}</span></div><p>${esc(BTLocale.place(a.location))} · ${esc(BTLocale.eventDate(String(a.requestedDate||'').slice(0,10)))}</p>${BTEnhancements.progressBar(a.progress??(a.status==='DONE'?100:0))}<p class="mu">${tx('รายงาน','Reports')}: ${Number(a.reportCount||0)} · ${tx('อัปเดตล่าสุด','Last updated')}: ${esc(BTLocale.thaiTime(a.updatedAt||a.createdAt))}</p><button type="button" class="btn sm o" onclick="BTEnhancements.work(${Number(a.id)})">${tx('รายละเอียด / ประวัติรายงาน','Details / Report history')}</button></article>`).join('')||`<div class="card pad"><p>${tx('ยังไม่มีงานในหมวดนี้','No work in this category')}</p></div>`}</section>`;
  }
  function repaintWork(){const el=document.querySelector('[data-work-history]');if(el)el.outerHTML=workHistory();}
  function filterWork(tab){workTab=tab;repaintWork();}
  function findWork(input){workQuery=input.value;const caret=input.selectionStart;repaintWork();const next=document.querySelector('.bt-work-search');if(next){next.focus();next.setSelectionRange(caret,caret);}}

  function organizerPage(){
    const en=typeof L!=='undefined'&&!!L,tr=(th,eng)=>en?eng:th;
    const pending=panel('mine',urls.mine);if(pending)return `<div class="w pg">${pending}</div>`;
    return `<div class="w pg"><div class="sh"><h1>${tr('งานที่ได้รับมอบหมาย','Assigned work')}</h1><button class="btn sm o" onclick="BTBusiness.refresh('mine')">${tr(tx('โหลดใหม่'),'Refresh')}</button></div>${state.mine.map(a=>`<div class="card pad" style="margin-top:14px"><h3>${esc(BTLocale.title(a))}</h3><p>${esc(BTLocale.place(a.location))} · ${esc(BTLocale.eventDate(String(a.requestedDate||'').slice(0,10)))}</p><p>${tr('สถานะ','Status')}: ${esc(BTLocale.status(a.status))}</p>${BTEnhancements.progressBar(a.progress??(a.status==='DONE'?100:0))}<div class="ac"><button type="button" class="btn sm" onclick="BTEnhancements.work(${Number(a.id)})">${tr('รายละเอียด / รายงานความคืบหน้า','Details / Progress report')}</button></div></div>`).join('')||`<div class="card pad"><h3>${tr('ยังไม่มีงานที่ได้รับมอบหมาย','No assigned work yet')}</h3><p class="mu">${tr('งานจะแสดงที่นี่เมื่อแอดมินมอบหมายให้คุณ','Work will appear here when an admin assigns it to you.')}</p></div>`}</div>`;
  }
  async function workStatus(id,status){try{await api(`/api/organizer/assignments/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});refresh('mine');}catch(e){alert(e.message);}}
  function profileForm(){
    if(!window.ME)return tx('<p>กรุณาเข้าสู่ระบบ</p>');
    return `<div class="w" style="padding-top:20px;max-width:600px"><h1>${tx("บัญชีของฉัน")}</h1><form class="card pad" onsubmit="BTBusiness.saveProfile(event);return false"><label>${tx("ชื่อ")}</label><input name="name" required maxlength="100" value="${esc(ME.name)}"><label>${tx("โทรศัพท์")}</label><input name="phone" maxlength="30" value="${esc(ME.phone||'')}"><label>${tx("อีเมล")}</label><input disabled value="${esc(ME.email)}"><label>${tx("สิทธิ์")}</label><input disabled value="${esc(ME.role)}"><p id="bt-profile-error" class="err"></p><button class="btn" type="submit">${tx("บันทึกข้อมูล")}</button></form></div>`;
  }
  async function saveProfile(e){
    e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
    try{const user=await api('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))}); Object.assign(ME,user);if(typeof draw==='function')draw();if(typeof toast==='function')toast(tx('บันทึกข้อมูลบัญชีแล้ว'));}
    catch(err){const el=document.getElementById('bt-profile-error');if(el)el.textContent=err.message;}
    finally{b.disabled=false;}
  }
    return {workHistory,filterWork,findWork,users,role,contactForm,refreshContact,saveContact,organizers,organizerPage,refresh,workStatus,assign,reloadOrganizers,cancelWork,reassignWork,api,profileForm,saveProfile};
})();
