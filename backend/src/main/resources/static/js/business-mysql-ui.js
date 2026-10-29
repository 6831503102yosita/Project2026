window.BTBusiness = (() => {
  const state={users:[],assignments:[],mine:[],requests:[],loading:{},loaded:{},error:{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url,options={}){
    const headers={...(options.headers||{})};
    if(options.method && options.method !== 'GET'){
      const r=await fetch('/api/auth/csrf',{credentials:'same-origin'});
      if(!r.ok)throw Error('CSRF '+r.status);
      const c=await r.json(); headers[c.headerName]=c.token;
    }
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});
    if(!r.ok)throw Error('HTTP '+r.status+' '+(await r.text()).slice(0,150));
    return r.status===204?null:r.json();
  }
  async function load(key,url){
    if(state.loading[key])return;
    state.loading[key]=true;state.error[key]='';
    try{state[key]=await api(url);state.loaded[key]=true;}
    catch(e){state.error[key]=e.message;}
    finally{state.loading[key]=false; if(typeof draw==='function')draw();}
  }
  function panel(key,url){
    if(!state.loaded[key]&&!state.loading[key]&&!state.error[key])load(key,url);
    if(state.error[key])return `<div class="card pad"><p class="err">${esc(state.error[key])}</p><button class="btn" onclick="BTBusiness.refresh('${key}')">ลองใหม่</button></div>`;
    if(!state.loaded[key])return '<div class="card pad">กำลังโหลดข้อมูล...</div>';
    return null;
  }
  const urls={users:'/api/admin/users',assignments:'/api/admin/organizer-assignments',mine:'/api/organizer/assignments/my',requests:'/api/admin/event-requests'};
  function refresh(key){state.loaded[key]=false;state.error[key]='';load(key,urls[key]);}
  function users(){
    const loading=panel('users',urls.users);if(loading)return loading;
    return `<div class="sh"><h2>ผู้ใช้ (${state.users.length})</h2><button class="btn sm o" onclick="BTBusiness.refresh('users')">โหลดใหม่</button></div><div class="tw"><table><tr><th>ชื่อ</th><th>อีเมล</th><th>Role</th><th></th></tr>${state.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select id="bt-role-${Number(u.id)}">${['CUSTOMER','ORGANIZER','ADMIN'].map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${r}</option>`).join('')}</select></td><td><button class="btn sm o" onclick="BTBusiness.role(${Number(u.id)})">บันทึกสิทธิ์</button></td></tr>`).join('')}</table></div>`;
  }
  async function role(id){
    const select=document.getElementById('bt-role-'+id);
    if(!select)return;
    const u=state.users.find(x=>Number(x.id)===id);
    const role=select.value;
    if(role===u?.role)return;
    if(!window.confirm('ยืนยันเปลี่ยนสิทธิ์ผู้ใช้นี้?')){select.value=u.role;return;}
    try{await api('/api/admin/users/'+id+'/role',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role})});refresh('users');}
    catch(e){alert(e.message);select.value=u.role;}
  }
  function contactForm(){
    const c=DB.contact;
    const fields=[['phone','โทรศัพท์'],['email','อีเมล'],['line','LINE'],['fb','Facebook'],['ig','Instagram'],['addr','ที่อยู่'],['pay','ข้อมูลชำระเงิน'],['hold','ชั่วโมงถือที่นั่ง']];
    return `<form class="card pad" onsubmit="BTBusiness.saveContact(event);return false"><div class="fg">${fields.map(([k,label])=>`<div><label>${label}</label><input name="${k}" value="${esc(c[k]??'')}" ${k==='hold'?'type="number" min="1" max="720"':''}></div>`).join('')}</div><p id="bt-contact-error" class="err"></p><br><button class="btn">บันทึก</button></form>`;
  }
  async function refreshContact(){
    try{const data=await api('/api/site/contact');Object.assign(DB.contact,data);if(typeof draw==='function')draw();}
    catch(e){console.warn('Unable to load site contact settings',e);}
  }
  async function saveContact(event){
    event.preventDefault(); const b=event.target.querySelector('button');
    const payload=Object.fromEntries(new FormData(event.target).entries());b.disabled=true;
    try{const data=await api('/api/admin/site/contact',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});Object.assign(DB.contact,data);draw();toast('บันทึกข้อมูลติดต่อแล้ว');}
    catch(e){const box=document.getElementById('bt-contact-error');if(box)box.textContent=e.message;}
    finally{b.disabled=false;}
    return false;
  }
  function organizers(){
    const pending=panel('assignments',urls.assignments);if(pending)return pending;
    if(!state.loaded.users&&!state.loading.users&&!state.error.users)load('users',urls.users);
    if(!state.loaded.requests&&!state.loading.requests&&!state.error.requests)load('requests',urls.requests);
    const orgs=state.users.filter(u=>u.role==='ORGANIZER');
    const assignForm=state.loaded.users&&state.loaded.requests ? `<form class="card pad" onsubmit="return BTBusiness.assign(event)"><h3>มอบหมายงานจากคำขอ Event</h3><div class="fg"><div><label>คำขอ Event</label><select name="requestId" required>${state.requests.map(r=>`<option value="${Number(r.id)}">#${Number(r.id)} ${esc(r.title)}</option>`).join('')}</select></div><div><label>ผู้จัดงาน</label><select name="organizerId" required>${orgs.map(u=>`<option value="${Number(u.id)}">${esc(u.name)}</option>`).join('')}</select></div></div><label>หมายเหตุ</label><textarea name="note" maxlength="2000"></textarea><p class="err" id="bt-assign-error"></p><button class="btn" type="submit" ${!state.requests.length||!orgs.length?'disabled':''}>มอบหมายงาน</button></form>`: '<div class="card pad">กำลังโหลดรายชื่อผู้จัดงานและคำขอ...</div>';
    return `<div class="sh"><h2>ผู้จัดงาน</h2><button class="btn sm o" onclick="BTBusiness.refresh('assignments')">โหลดใหม่</button></div>${assignForm}<div class="tw"><table><tr><th>ชื่อ</th><th>อีเมล</th><th>จำนวนงานที่ได้รับ</th></tr>${orgs.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${state.assignments.filter(a=>Number(a.organizerId)===Number(u.id)).length}</td></tr>`).join('')}</table></div><h3>งานที่มอบหมาย</h3><div class="tw"><table><tr><th>งาน</th><th>ผู้จัดงาน</th><th>สถานะ</th></tr>${state.assignments.map(a=>`<tr><td>${esc(a.eventTitle)}</td><td>${esc(a.organizerName)}</td><td>${esc(a.status)}</td></tr>`).join('')}</table></div>`;
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
  function organizerPage(){
    const pending=panel('mine',urls.mine);if(pending)return `<div class="w pg">${pending}</div>`;
    return `<div class="w pg"><h1>งานที่ได้รับมอบหมาย</h1><button class="btn sm o" onclick="BTBusiness.refresh('mine')">โหลดใหม่</button>${state.mine.map(a=>`<div class="card pad" style="margin-top:14px"><h3>${esc(a.eventTitle)}</h3><p>${esc(a.location)} · ${esc(String(a.requestedDate||'').slice(0,10))}</p><p>สถานะ: ${esc(a.status)}</p><div class="ac"><button class="btn sm o" onclick="BTBusiness.workStatus(${Number(a.id)},'PROGRESS')">กำลังดำเนินการ</button><button class="btn sm" onclick="BTBusiness.workStatus(${Number(a.id)},'DONE')">เสร็จแล้ว</button></div></div>`).join('')||'<p>ยังไม่มีงานที่ได้รับมอบหมาย</p>'}</div>`;
  }
  async function workStatus(id,status){try{await api(`/api/organizer/assignments/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});refresh('mine');}catch(e){alert(e.message);}}
  function profileForm(){
    if(!window.ME)return '<p>กรุณาเข้าสู่ระบบ</p>';
    return `<div class="w" style="padding-top:20px;max-width:600px"><h1>บัญชีของฉัน</h1><form class="card pad" onsubmit="BTBusiness.saveProfile(event);return false"><label>ชื่อ</label><input name="name" required maxlength="100" value="${esc(ME.name)}"><label>โทรศัพท์</label><input name="phone" maxlength="30" value="${esc(ME.phone||'')}"><label>อีเมล</label><input disabled value="${esc(ME.email)}"><label>สิทธิ์</label><input disabled value="${esc(ME.role)}"><p id="bt-profile-error" class="err"></p><button class="btn" type="submit">บันทึกข้อมูล</button></form></div>`;
  }
  async function saveProfile(e){
    e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
    try{const user=await api('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))}); Object.assign(ME,user);if(typeof draw==='function')draw();if(typeof toast==='function')toast('บันทึกข้อมูลบัญชีใน MySQL แล้ว');}
    catch(err){const el=document.getElementById('bt-profile-error');if(el)el.textContent=err.message;}
    finally{b.disabled=false;}
  }
    return {users,role,contactForm,refreshContact,saveContact,organizers,organizerPage,refresh,workStatus,assign,api,profileForm,saveProfile};
})();
