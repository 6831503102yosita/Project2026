window.BTBanks=(()=>{
 const accounts=Object.freeze([
 {id:'KBANK',th:'กสิกรไทย',en:'Kasikornbank',number:'342-8-49829-0'},
 {id:'SCB',th:'ไทยพาณิชย์',en:'Siam Commercial Bank',number:'581-736492-8'},
 {id:'BBL',th:'กรุงเทพ',en:'Bangkok Bank',number:'729-4-05183-6'}].map(Object.freeze));
 const holder='บริษัท บลูเทรลรวย จำกัด';
 const en=()=>typeof L!=='undefined'&&!!L;
 function fields(selected='',booking=false,editable=false){return `<div class="bt-bank-fields" data-edit-account="${editable}" style="grid-column:1/-1;margin:16px 0"><label>${en()?'Bank for payment':'เลือกธนาคารที่จะชำระเงิน'} *</label><select name="bankId" required onchange="BTBanks.sync(this.form)" style="width:100%"><option value="">${en()?'Select a bank':'เลือกธนาคาร'}</option>${accounts.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${en()?a.en:a.th}</option>`).join('')}</select><div class="bt-bank-details" ${selected?'':'hidden'}><label>${en()?'Account number':'เลขบัญชี'}</label><input name="bankAccount" ${editable?'':'readonly aria-readonly="true"'}><label>${en()?'Account name':'ชื่อบัญชี'}</label><input name="accountName" readonly aria-readonly="true"><input type="hidden" name="bankName"><input type="hidden" name="swift" value=""><button type="button" class="btn ol sm" onclick="BTBanks.copy(this)">${en()?'Copy account number':'คัดลอกเลขบัญชี'}</button><span role="status" class="bt-bank-copy-status"></span></div></div>`;}
 function sync(form){if(!form)return;const a=accounts.find(a=>a.id===form.elements.bankId?.value);const box=form.querySelector('.bt-bank-details');if(box)box.hidden=!a;
 for(const [k,v] of Object.entries({bankName:a?.th||'',bankAccount:a?.number||'',accountName:a?holder:'',swift:''})){if(form.elements[k])form.elements[k].value=v;}
 const status=form.querySelector('.bt-bank-copy-status');if(status)status.textContent='';}
 function select(form,id){if(form?.elements.bankId){form.elements.bankId.value=accounts.some(a=>a.id===id)?id:'';sync(form);}}
 async function copy(btn){const value=btn.form.elements.bankAccount.value;if(!value)return;const status=btn.form.querySelector('.bt-bank-copy-status');try{await navigator.clipboard.writeText(value);status.textContent=en()?'Copied':'คัดลอกแล้ว';}catch(e){status.textContent=en()?'Please select and copy the account number':'กรุณาเลือกเลขบัญชีแล้วคัดลอก';}}
 function refresh(){
  const english=en();
  document.querySelectorAll('.bt-bank-fields').forEach(box=>{
   const labels=box.querySelectorAll('label');
   const words=english?['Bank for payment *','Account number','Account name']:['เลือกธนาคารที่จะชำระเงิน *','เลขบัญชี','ชื่อบัญชี'];
   labels.forEach((label,i)=>{if(words[i]&&label.textContent!==words[i])label.textContent=words[i];});
   const select=box.querySelector('select[name="bankId"]');
   if(select)Array.from(select.options).forEach(option=>{const a=accounts.find(a=>a.id===option.value);const text=a?(english?a.en:a.th):(english?'Select a bank':'เลือกธนาคาร');if(option.textContent!==text)option.textContent=text;});
   const btn=box.querySelector('button');const text=english?'Copy account number':'คัดลอกเลขบัญชี';if(btn&&btn.textContent!==text)btn.textContent=text;
  });
  document.querySelectorAll('input[type="file"][name="slip"]').forEach(input=>{
   if(!input.closest('.bt-slip-picker')){
    const wrap=document.createElement('div');wrap.className='bt-slip-picker';
    input.before(wrap);wrap.append(input);
    const label=document.createElement('label');label.className='bt-slip-button';
    if(!input.id)input.id='bt-booking-slip-file';label.htmlFor=input.id;
    const text=document.createElement('span');text.className='bt-slip-filename';
    wrap.append(label,text);input.addEventListener('change',refresh);
   }
   const wrap=input.closest('.bt-slip-picker');const label=wrap.querySelector('.bt-slip-button');
   const text=english?'Choose file':'เลือกไฟล์';if(label.textContent!==text)label.textContent=text;
   const filename=Array.from(input.files||[]).map(f=>f.name).join(', ')||(english?'No file selected':'ไม่ได้เลือกไฟล์');
   const span=wrap.querySelector('.bt-slip-filename');if(span.textContent!==filename)span.textContent=filename;
  });
 }
 function start(){refresh();new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return Object.freeze({fields,sync,select,copy,refresh});
})();
