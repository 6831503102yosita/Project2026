/* Suggestions use current server data; searching stays bilingual. */
window.BTSearch=(()=>{
 const norm=v=>String(v||'').normalize('NFC').trim().toLowerCase();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let options=[];
 function suggest(input){
  F.q=input.value;
  const box=document.getElementById('bt-search-suggestions');if(!box)return;
  const q=norm(input.value);options=[];
  if(q){const seen=new Set();for(const e of API_EVENTS||[]){if(e.arch)continue;
   const pair=P[e.prov];const raw=e.location||pair?.[0]||'';
   const names=[raw,pair?.[0],pair?.[1]].filter(Boolean);
   if(names.some(x=>norm(x).startsWith(q))&&!seen.has(norm(raw))){seen.add(norm(raw));options.push({label:BTLocale.place(raw),query:raw,type:'place'});}
   if([e.th,e.en].some(x=>norm(x).startsWith(q)))options.push({label:nm(e),id:e.id,type:'event'});
  }}
  box.innerHTML=options.map((o,i)=>`<button type="button" role="option" aria-selected="false" data-index="${i}">${esc(o.label)}<small>${o.type==='place'?(L?'Destination':'สถานที่'):(L?'Tour / Event':'ทัวร์ / กิจกรรม')}</small></button>`).join('');
  box.hidden=!options.length;input.setAttribute('aria-expanded',String(!!options.length));
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(Number(b.dataset.index)));
 }
 function choose(i){const o=options[i];if(!o)return;if(o.type==='event')go('/api-detail/'+o.id);else{F={cat:'',reg:'',prov:'',q:o.query};PGS.pe=0;go('/events');draw();}}
 function key(e){const box=document.getElementById('bt-search-suggestions');if(!box||box.hidden)return;
  if(e.key==='Escape'){box.hidden=true;document.getElementById('hq')?.setAttribute('aria-expanded','false');}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const buttons=[...box.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
 }
 document.addEventListener('keydown',e=>{if(e.target.closest?.('.bt-search-suggestions'))key(e);});
 document.addEventListener('click',e=>{if(!e.target.closest('.bt-travel-search')){const b=document.getElementById('bt-search-suggestions');if(b)b.hidden=true;document.getElementById('hq')?.setAttribute('aria-expanded','false');}});
 return {suggest,choose,key};
})();
