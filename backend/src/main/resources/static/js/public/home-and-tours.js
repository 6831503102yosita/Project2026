function pgHome(){
const all=(API_EVENTS||[]).filter(e=>!e.arch);
const featured=all.filter(e=>e.feat);
const f=(featured.length?featured:all).slice(0,6);
const highlighted=all.filter(e=>(e.orig>e.price&&e.orig>0)||e.seats<=5);const pr=(highlighted.length?highlighted:all.filter(e=>e.feat).length?all.filter(e=>e.feat):all).slice(0,6);
const cu=[...all].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,8);
return`<section class="bt-discover"><div class="w"><div class="bt-discover-intro"><p class="bt-eyebrow">BLUETRAIL · TOURS & EVENTS</p><h1>${L?'Your next great experience starts here':'ทริปที่ใช่ เริ่มต้นที่นี่'}</h1><p>${L?'Find a new destination, join an activity, or plan an event of your own.':'ค้นหาจุดหมายใหม่ ร่วมกิจกรรมที่ชอบ หรือให้เราช่วยจัดงานในแบบของคุณ'}</p></div><form class="srch bt-travel-search" onsubmit="return A.hs(event)"><div class="bt-search-field"><label for="hq">${L?'Where would you like to go?':'อยากไปที่ไหน หรือทำอะไร?'}</label><div>${ic('search')}<input id="hq" placeholder="${t('sph')}" value="${Z(F.q)}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="bt-search-suggestions" oninput="if(!event.isComposing)BTSearch.suggest(this)" oncompositionend="BTSearch.suggest(this)" onkeydown="BTSearch.key(event)"><div id="bt-search-suggestions" class="bt-search-suggestions" role="listbox" hidden></div></div></div><button class="btn">${t('search')} ${ic('search')}</button></form><div class="bt-quick-search"><span>${L?'Explore':'สำรวจ'}</span>${[...new Set(all.map(e=>e.prov).filter(k=>P[k]))].slice(0,5).map(k=>`<button type="button" onclick="F.q='';F.cat='tour';F.prov='${k}';F.reg=P['${k}'][2];PGS.pe=0;go('/events');draw()">${Z(P[k][L])}</button>`).join('')}<a href="#/events">${L?'All experiences':'ดูทั้งหมด'} →</a></div></div></section><div class="w bt-home-featured">
${!f.length ? `<div class="card pad" style="padding:48px 24px;text-align:center"><h2>${L?'Discover new experiences with BlueTrail':'ค้นพบประสบการณ์ใหม่ไปกับ BlueTrail'}</h2><p>${L?'Explore tours and activities, or ask our team to plan your event.':'พบกับทัวร์และกิจกรรมที่น่าสนใจ หรือส่งคำขอให้ทีมงานช่วยจัดกิจกรรมเฉพาะของคุณ'}</p><a class="btn" href="#/custom">${L?'Plan an event':'ส่งคำขอจัด Event'}</a></div>` : `<div class="car" id="car">${f.map((e,i)=>`<div class="sl${i==CI?' on':''}" style="background-image:url('${Z(e.imageUrl || img(e.theme))}')"><div class="tx"><span class="tag" style="width:fit-content">${t(e.cat)}</span><h2>${Z(nm(e))}</h2><p>${Z(ds(e))}</p><div>${ic('cal')} ${dt(e.date)} · ${ic('pin')} ${lc(e)} · <b>${fm(e.price)}</b></div><a class="btn wh sm" style="width:fit-content" href="#/api-detail/${e.id}">${t('det')}</a></div></div>`).join('')}<button class="cn" style="left:10px" onclick="A.car(-1)">‹</button><button class="cn" style="right:10px" onclick="A.car(1)">›</button><div class="dots">${f.map((e,i)=>`<i class="${i==CI?'on':''}" onclick="A.car(0,${i})"></i>`).join('')}</div></div>`}
<div class="cta"><div><h3>${ic('spark')} ${t('ctah')}</h3><p>${t('ctap')}</p></div><a class="btn wh" href="#/custom">${t('ctab')} →</a></div></div>
<section class="s"><div class="w"><h2>${t('rec')}</h2><div class="grid">${pr.length?pr.map(apiEventCard).join(''):`<p class="mu">${L?"No recommendations available yet":"ยังไม่มีรายการแนะนำ"}</p>`}</div></div></section>
<section class="s"><div class="w"><div class="sh"><h2>${t('cur')}</h2><a href="#/events">${t('seeall')}</a></div><div class="grid">${cu.map(apiEventCard).join('')}</div></div></section>`}
function mysqlEventsSection() {
  if (F.cat === 'tour') return '';

  const events = (API_EVENTS || []).filter(e => {
    if (e.arch) return false;
    if (F.reg && e.region !== F.reg) return false;
    if (F.prov && e.prov !== F.prov) return false;

    const query = F.q.trim().toLowerCase();
    return !query || [
      e.th, e.en, e.cat,
      P[e.prov]?.[0], P[e.prov]?.[1]
    ].join(' ').toLowerCase().includes(query);
  });

  return `<section class="s" id="mysql-events-list">
    <div class="w">
      <h2>${L ? 'Events from MySQL' : 'อีเวนต์จาก MySQL'}</h2>
      ${API_EVENTS === null
        ? '<p>Loading events...</p>'
        : events.length
          ? `<div class="grid">${events.map(apiEventCard).join('')}</div>`
          : `<p class="mu">${L ? 'No matching events found.' : 'ไม่พบอีเวนต์ที่ตรงกับการค้นหา'}</p>`}
    </div>
  </section>`;
}

function getUnifiedEvents() {
  return (API_EVENTS || [])
    .filter(e => !e.arch)
    .map(e => ({ source: 'mysql', event: e }));
}

function getFilteredUnifiedEvents() {
  const normalize=value=>String(value??'').normalize('NFC').trim().toLowerCase();
  const query=normalize(F.q);
  const fields=e=>[e.th,e.en,e.location,e.loc,P[e.prov]?.[0],P[e.prov]?.[1]].filter(Boolean).map(normalize);
  const prefix=e=>fields(e).some(value=>value.startsWith(query));
  const single=Array.from(query).length===1;
  return getUnifiedEvents().filter(({event:e})=>{
    if(F.cat&&e.cat!==F.cat)return false;
    if(F.reg&&e.region!==F.reg)return false;
    if(F.prov&&e.prov!==F.prov)return false;
    return !query||fields(e).some(value=>value.startsWith(query));
  }).sort((a,b)=>!query?0:Number(prefix(b.event))-Number(prefix(a.event)));
}

function pgEvents(){const l=getFilteredUnifiedEvents();
const h=[F.cat?t(F.cat):t('events')];if(F.prov)h.push(P[F.prov][L]);else if(F.reg)h.push((L?'':'ภาค')+R[F.reg][L]+(L?' Region':''));
const pl=(k,v,lab,on)=>`<button class="pill${on?' on':''}" onclick="A.f('${k}','${v}')">${lab}</button>`;
return`<div class="w"><h1 id="head" style="margin-top:20px">${h.join(' ')}</h1><p class="mu">${l.length} ${L?'results':'รายการ'}</p></div>
<div class="bar" id="bar"><div class="w"><div class="rw">${pl('cat','',t('all'),!F.cat)}${pl('cat','tour',t('tour'),F.cat=='tour')}${pl('cat','event',t('event'),F.cat=='event')}<input style="width:210px" placeholder="${t('search')}…" value="${Z(F.q)}" id="bt-live-search" type="search" oninput="if(!event.isComposing)BTEnhancements.search(this)" oncompositionend="BTEnhancements.search(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();BTEnhancements.search(this)}"><button type="button" class="btn sm" onclick="BTEnhancements.search(document.getElementById('bt-live-search'))" aria-label="${t('search')}">${ic('search')} ${t('search')}</button>${(F.cat||F.reg||F.prov||F.q)?`<button class="pill" onclick="A.f('clear')">${ic('x')} ${t('clear')}</button>`:''}</div>
${F.cat=='tour'?`<div class="rw">${pl('reg','',t('all'),!F.reg)}${Object.keys(R).map(k=>pl('reg',k,R[k][L],F.reg==k)).join('')}</div>`:''}
${F.cat=='tour'&&F.reg?`<div class="rw">${pl('prov','',t('all'),!F.prov)}${Object.keys(P).filter(k=>P[k][2]==F.reg).map(k=>pl('prov',k,P[k][L],F.prov==k)).join('')}</div>`:''}</div></div>
<div class="w" style="padding-top:18px">${l.length?`<div class="grid">${l.slice((_pg=pager('pe',l.length,12)).s,_pg.e).map(({source,event})=>source==='mysql'?apiEventCard(event):card(event)).join('')}</div>${_pg.html}`:emp(L?'No tours or events found.':'ไม่พบทัวร์หรือ Event ที่ตรงกับเงื่อนไข',`<button class="btn" onclick="A.f('clear')">${t('clear')}</button>`)}</div>`}
function pgDetail(id){const e=ev(id);if(!e)return emp();return`<div class="w" style="padding-top:20px"><a href="#/events">← ${t('events')}</a><div class="two" style="margin-top:12px"><img src="${Z(e.imageUrl || img(e.theme))}" alt="${Z(nm(e))}" style="border-radius:18px;width:100%;aspect-ratio:16/10;object-fit:cover"><div><span class="tag">${t(e.cat)}</span><h1>${Z(nm(e))}</h1><p>${Z(ds(e))}</p><div class="card pad">${ic('cal')} ${t('date')}: ${dt(e.date)}<br>${ic('clock')} ${e.st} – ${e.et}<br>${ic('pin')} ${lc(e)}<br>${ic('map')} ${P[e.prov][L]} · ${R[e.region][L]}<br>${ic('seat')} ${e.seats>0?t('left')+' '+e.seats:t('full')}${dc(e)?`<br><span class="badge hot">${t('off')} ${dc(e)}%</span>`:''}<div class="pr"><b style="font-size:1.8rem">${fm(e.price)}</b>${e.orig>e.price?`<s>${fm(e.orig)}</s>`:''}</div>${e.seats>0?`<a class="btn" href="#/book/${e.id}">${t('book')}</a>`:`<span class="badge er">${t('full')}</span>`}</div></div></div></div>`}
const need=r=>{if(!ME){go('/login');return 0}if(r&&ME.role!=r){return 0}return 1};
const lock=()=>emp(L?'Access denied':'ไม่มีสิทธิ์เข้าถึง');
