/* BlueTrail UI language and modal accessibility patch, 2026-10-30.
 * Additive frontend only; does not change API/DB status codes or customer data.
 */
(function () {
  'use strict';
  const translations = new Map(Object.entries({
    'การจองของฉัน':'My Bookings','โหลดข้อมูลใหม่':'Refresh','รายการจองทั้งหมด':'All Bookings',
    'ใบเสนอราคา':'Quotations','ใบเสนอราคา (PDF)':'Quotation (PDF)',
    'ใบเสนอราคา (2)':'Quotations (2)','ผู้จัดงาน':'Organizers','ผู้ใช้':'Users',
    'จัดการ Event / Tour':'Manage Events / Tours','การจองของฉัน (1)':'My Bookings (1)',
    'เลขที่':'No.','รหัสลูกค้า':'Customer ID','งาน':'Event','ที่นั่ง':'Seats',
    'ยอดรวม':'Total','สถานะ':'Status','วันที่จอง':'Booking Date',
    'ชื่อ':'Name','อีเมล':'Email','หมายเหตุ':'Notes','ประเภท':'Type',
    'สถานที่':'Location','วันที่':'Date','ราคา':'Price','จัดการ':'Actions',
    'รอตรวจสอบ':'Pending Review','รอชำระ':'Pending Payment','ผู้จัด':'Organizer',
    'แก้ไข':'Edit','ประวัติ':'History','ปิดรับจอง':'Close Bookings',
    'เปิดรับจอง':'Open Bookings','ลบ':'Delete','เพิ่ม Event / Tour':'+ Add Event / Tour',
    '+ เพิ่ม Event / Tour':'+ Add Event / Tour','ผู้จัดงาน':'Organizers',
    'มอบหมายงานจากคำขอ Event':'Assign Organizer from Event Request',
    'คำขอ Event':'Event Request','หมายเหตุ':'Notes','มอบหมายงาน':'Assign',
    'งานที่มอบหมาย':'Assigned Events','จำนวนงานที่ได้รับ':'Assigned Jobs',
    'บันทึกสิทธิ์':'Save Role','สร้างใบเสนอราคา':'Create Quotation',
    '+ สร้างใบเสนอราคา':'+ Create Quotation',
    'แม่แบบใบเสนอราคา':'Quotation Template','แม่แบบเอกสาร':'Document Template',
    'ดูรายละเอียด':'View Details','ประวัติ':'History','เลขที่':'No.',
    'ข้อมูลจาก MySQL · เชื่อมกับ Event Requests':'Data from MySQL · Linked to Event Requests',
    'ชื่อบริษัท':'Company Name','เลขผู้เสียภาษี':'Tax ID','โทรศัพท์':'Phone',
    'อีเมล':'Email','ที่อยู่':'Address','เงื่อนไขชำระเงิน':'Payment Terms',
    'เงื่อนไขการชำระเงิน':'Payment Terms','ข้อความท้ายเอกสาร':'Document Footer',
    'บันทึกลง MySQL':'Save Template','บันทึกลง MySQL สำเร็จ':'Saved to MySQL successfully',
    'ยกเลิก':'Cancel','ปิด':'Close','กลับ':'Back',
    'ชำระเงิน / ดูสลิป':'Pay / View Slip','ชำระเงิน':'Payment',
    'จำนวน':'Quantity','รอชำระเงิน':'Pending Payment',
    'รายละเอียด':'Details','ยอดสุทธิ':'Net Total','ส่งแล้ว':'Sent',
    'อนุมัติ':'Approved','ปฏิเสธ':'Rejected','เพิ่ม':'Add',
    'ชื่อผู้ติดต่อ':'Contact Name','สร้างใบเสนอราคาใหม่':'New Quotation',
    'คำขอจัด Event':'Event Requests','คำขอ Event ทั้งหมด':'All Event Requests',
    'อัปโหลดสลิป':'Upload Slip','ตรวจสอบสลิป':'Verify Slip',
    'ข้อมูลติดต่อ':'Contact Information','บันทึก':'Save',
    'บันทึกการแก้ไข':'Save Changes','ดูตัวอย่าง':'Preview',
    'วันหมดอายุ':'Expiry Date','จำนวนที่นั่ง':'Seats',
    'ภาค/จังหวัด':'Region / Province','ข้อมูลผู้ใช้':'User Information'
  }));
  const patterns = [
    [/^การจองของฉัน\s*\((\d+)\)$/,'My Bookings ($1)'],
    [/^รายการจองทั้งหมด\s*\((\d+)\)$/,'All Bookings ($1)'],
    [/^ใบเสนอราคา\s*\((\d+)\)$/,'Quotations ($1)'],
    [/^ผู้ใช้\s*\((\d+)\)$/,'Users ($1)'],
    [/^ผู้จัดงาน\s*\((\d+)\)$/,'Organizers ($1)'],
    [/^จัดการ Event\s*\/\s*Tour\s*\((\d+)\)$/,'Manage Events / Tours ($1)'],
    [/^\+\s*เพิ่ม Event\s*\/\s*Tour$/,'+ Add Event / Tour']
  ];
  const isEnglish = () => {
    try { return typeof L !== 'undefined' ? !!L : JSON.parse(localStorage.getItem('lang') || '0') === 1; }
    catch (_) { return false; }
  };
  function translate(s) {
    const trimmed = s.trim();
    if (!trimmed) return null;
    let translated = translations.get(trimmed);
    if (!translated) for (const [re, value] of patterns) {
      if (re.test(trimmed)) { translated = trimmed.replace(re,value); break; }
    }
    return translated && translated !== trimmed ? s.replace(trimmed,translated) : null;
  }
  function localise(root) {
    if (!root || !isEnglish()) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes=[];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,pre,code,[contenteditable="true"],option')) return;
      const next = translate(node.nodeValue || '');
      if (next !== null) node.nodeValue = next;
    });
    // Only fixed UI placeholders; never translate customer-provided data.
    root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      const next=translate(el.getAttribute('placeholder')||'');
      if (next !== null) el.setAttribute('placeholder',next);
    });
  }
  function closeModal() {
    const md=document.getElementById('md');
    if (!md || !md.firstElementChild) return;
    const form=md.querySelector('#bt-template-form');
    if (form && form.dataset.btDirty === '1') {
      if (!window.confirm(isEnglish() ? 'Discard unsaved template changes?' : 'ยกเลิกการแก้ไขแม่แบบที่ยังไม่ได้บันทึกหรือไม่?')) return;
    }
    md.innerHTML='';
    document.body.style.overflow='';
  }
  function patchModal() {
    const md=document.getElementById('md');
    if (!md || !md.firstElementChild) return;
    const dialog = md.querySelector('[role="dialog"]') || md.querySelector('.md > .card');
    if (!dialog || dialog.querySelector('.bt-patch-modal-close')) return;
    const close=document.createElement('button');
    close.type='button';close.className='bt-patch-modal-close';
    close.setAttribute('aria-label',isEnglish()?'Close dialog':'ปิดหน้าต่าง');
    close.textContent='×';
    close.style.cssText='position:sticky;top:4px;float:right;z-index:999;display:grid;place-items:center;width:40px;height:40px;margin:-4px -4px 8px 8px;border-radius:10px;border:1px solid #c4d3e7;background:#fff;color:#172554;font-size:28px;line-height:1;cursor:pointer;box-shadow:0 2px 8px #10234a24';
    close.addEventListener('click',closeModal);
    dialog.insertBefore(close,dialog.firstChild);
    const form=md.querySelector('#bt-template-form');
    if (form && !form.dataset.btPatch) {
      form.dataset.btPatch='1';
      form.addEventListener('input',()=>form.dataset.btDirty='1');
      form.addEventListener('change',()=>form.dataset.btDirty='1');
      const cancel=document.createElement('button');
      cancel.type='button';cancel.className='btn o bt-patch-cancel';
      cancel.textContent=isEnglish()?'Cancel':'ยกเลิก';
      cancel.style.marginLeft='10px';
      cancel.addEventListener('click',closeModal);
      form.appendChild(cancel);
    }
  }
  let pending=false;
  function update(){
    if (pending) return;
    pending=true;
    queueMicrotask(()=>{
      pending=false;
      localise(document.getElementById('app'));
      localise(document.getElementById('md'));
      patchModal();
    });
  }
  document.addEventListener('keydown',e=>{
    if (e.key==='Escape' && document.getElementById('md')?.firstElementChild) {
      e.preventDefault();e.stopImmediatePropagation();closeModal();
    }
  },true);
  const observer=new MutationObserver(update);
  const start=()=>{
    const app=document.getElementById('app'),md=document.getElementById('md');
    if(app) observer.observe(app,{childList:true,subtree:true,characterData:true});
    if(md) observer.observe(md,{childList:true,subtree:true,characterData:true});
    update();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.BlueTrailFix={refresh:update,closeModal};
})();
