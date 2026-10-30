/* BlueTrail dashboard: read-only numbers from protected /api/admin/overview */
window.BTAdminOverview = (() => {
  let data = null, loading = false, error = '', loaded = false, lastLoaded = 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const th = () => typeof L === 'undefined' || L === 0;
  const label = (a,b) => th() ? a : b;
  const num = n => Number(n ?? 0).toLocaleString(th()?'th-TH':'en-US');
  const money = n => '฿' + Number(n || 0).toLocaleString(th()?'th-TH':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const date = v => {if (!v) return '—'; const parsed = new Date(v); return Number.isNaN(parsed.getTime()) ? esc(v) : parsed.toLocaleDateString(th()?'th-TH':'en-GB',{day:'numeric',month:'short',year:'numeric'});};
  const statuses = {
    pending:['คำขอใหม่','New'], new:['คำขอใหม่','New'], review:['กำลังตรวจสอบ','Under review'], under_review:['กำลังตรวจสอบ','Under review'],
    info:['รอข้อมูลเพิ่มเติม','More info needed'], confirm:['รอลูกค้ายืนยัน','Waiting for customer'],
    waiting_confirmation:['รอลูกค้ายืนยัน','Waiting for customer'], confirmed:['ยืนยันแล้ว','Confirmed'],
    progress:['กำลังดำเนินการ','In progress'], in_progress:['กำลังดำเนินการ','In progress'],
    done:['เสร็จสิ้น','Completed'], completed:['เสร็จสิ้น','Completed'], cancel:['ยกเลิก','Cancelled'], cancelled:['ยกเลิก','Cancelled']
  };
  async function load(force=false) {
    if (loading) return;
    if (!force && loaded && Date.now() - lastLoaded < 45000) return;
    loading = true; error = '';
    try {
      const response = await fetch('/api/admin/overview',{credentials:'same-origin',cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      data = await response.json(); loaded = true; lastLoaded = Date.now();
    } catch (e) { error = e.message || String(e); loaded = false; }
    finally {
      loading = false;
      if (typeof AT !== 'undefined' && AT === 'ov' && location.hash.startsWith('#/admin') && typeof draw === 'function') draw();
    }
  }
  function refresh() { loaded = false; error = ''; load(true); }
  function metric(icon,n,a,b,accent='blue') {
    return `<div class="bto-stat"><div class="bto-icon ${accent}" aria-hidden="true">${icon}</div><strong>${num(n)}</strong><span>${esc(label(a,b))}</span></div>`;
  }
  function render() {
    if (!loaded && !loading && !error) load();
    if (loaded && !loading && Date.now() - lastLoaded > 45000) load(true);
    if (error) return `<div class="card pad"><p class="err">${esc(label('ไม่สามารถโหลดข้อมูล Dashboard: ','Unable to load dashboard: '))}${esc(error)}</p><button class="btn" onclick="BTAdminOverview.refresh()">${label('ลองใหม่','Retry')}</button></div>`;
    if (!data) return `<div class="card pad" role="status">${label('กำลังโหลดภาพรวมจาก MySQL…','Loading overview from MySQL…')}</div>`;
    const rows = Array.isArray(data.recentRequests) ? data.recentRequests : [];
    return `<style>
      .bto{font-family:inherit}.bto-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px;flex-wrap:wrap}
      .bto-top h2{margin:0;font-size:1.3rem}.bto-top p{color:var(--mu);margin:5px 0 0}
      .bto-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}
      .bto-stat{background:var(--card,#fff);border:1px solid var(--ln,#e5e7eb);border-radius:17px;padding:21px;display:flex;flex-direction:column;gap:8px;min-height:140px;box-shadow:0 4px 18px rgba(15,23,42,.025)}
      .bto-stat strong{font-size:1.75rem;line-height:1.1;color:var(--tx,#172554)}.bto-stat span{color:var(--mu,#64748b);font-size:.88rem}
      .bto-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:#eef4ff;color:#2557dc}
      .bto-icon.orange{background:#fff1e5;color:#e66d14}.bto-icon.green{background:#e8fbf1;color:#0e9f65}.bto-icon.purple{background:#f3ebff;color:#8b5cf6}
      .bto-panel{background:var(--card,#fff);border:1px solid var(--ln,#e5e7eb);border-radius:18px;padding:20px;margin-top:20px}
      .bto-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.bto-panel-head h3{margin:0 0 12px;font-size:1.07rem}
      .bto-panel-head button{border:0;background:transparent;color:#2563eb;cursor:pointer;font-weight:700}
      .bto-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px 12px;border-radius:12px;text-decoration:none;color:inherit}
      .bto-item:nth-child(even){background:var(--bg,#f4f7ff)}.bto-item b{display:block}.bto-item small{display:block;margin-top:5px;color:var(--mu,#64748b)}
      .bto-status{background:#e8eefc;color:#1d4ed8;border-radius:30px;font-size:.75rem;font-weight:700;padding:6px 11px;white-space:nowrap}
      .bto-revenue{margin-top:20px;background:linear-gradient(110deg,#183779,#2056dd);border-radius:18px;color:white;padding:22px 25px}
      .bto-revenue span{opacity:.88}.bto-revenue strong{font-size:2rem;display:block;margin-top:5px}
      .bto-muted{color:var(--mu,#64748b);padding:18px 6px}
      @media(max-width:1150px){.bto-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.bto-grid{grid-template-columns:1fr}.bto-stat{min-height:105px}.bto-item{align-items:flex-start;flex-direction:column}}
    </style><section class="bto">
      <div class="bto-top"><div><h2>${label('ภาพรวมระบบ','Overview')}</h2><p>${label('อัปเดตจากข้อมูลในระบบ BlueTrail','Live data from BlueTrail')}</p></div><button class="btn sm o" onclick="BTAdminOverview.refresh()">↻ ${label('รีเฟรช','Refresh')}</button></div>
      <div class="bto-grid">
        ${metric('▦',data.activeEvents,'จัดการ Event/ทัวร์','Events/Tours','orange')}
        ${metric('▤',data.bookings,'การจองทั้งหมด','All bookings')}
        ${metric('▣',data.requests,'คำขอจัด Event','Event requests','purple')}
        ${metric('♙',data.users,'ผู้ใช้ทั้งหมด','Users','green')}
        ${metric('✉',data.newRequests,'คำขอใหม่','New requests','orange')}
        ${metric('⌕',data.reviewRequests,'กำลังตรวจสอบ','Under review','purple')}
        ${metric('⌛',data.waitingRequests,'รอลูกค้ายืนยัน','Waiting for customer')}
        ${metric('✓',data.confirmedRequests,'ยืนยันแล้ว','Confirmed','green')}
        ${metric('↗',data.inProgressRequests,'กำลังดำเนินการ','In progress','orange')}
        ${metric('✔',data.completedRequests,'เสร็จสิ้น','Completed','green')}
        ${metric('▧',data.pendingSlips,'สลิปรอตรวจสอบ','Pending slips','purple')}
        ${metric('➤',data.sentQuotations,'ใบเสนอราคาที่ส่งแล้ว','Sent quotations')}
      </div>
      <section class="bto-panel"><div class="bto-panel-head"><h3>${label('คำขอจัด Event ล่าสุด','Latest event requests')}</h3><button type="button" onclick="A.tab('rq')">${label('ดูทั้งหมด →','View all →')}</button></div>
      ${rows.length ? rows.map(r => {
        const st=String(r.status||'').toLowerCase(), names=statuses[st]||[st,st];
        return `<div class="bto-item"><div><b>${esc(r.title || label('ไม่มีชื่อ','Untitled'))}</b><small>${esc(r.customerName || '')} · ${esc(r.location || '—')} · ${date(r.requestedDate)}</small></div><span class="bto-status">${esc(names[th()?0:1])}</span></div>`;
      }).join('') : `<p class="bto-muted">${label('ยังไม่มีคำขอจัด Event','No event requests yet')}</p>`}</section>
      <div class="bto-revenue"><span>${label('ยอดเงินชำระที่อนุมัติแล้ว (เฉพาะ Payments)','Approved payments received (payments only)')}</span><strong>${money(data.approvedRevenue)}</strong></div>
    </section>`;
  }
  return {render,refresh};
})();
