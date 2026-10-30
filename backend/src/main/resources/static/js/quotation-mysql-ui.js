
window.BTQuotation = (() => {
  const admin = {
    loaded: false, loading: false,
    quotations: [], requests: [], error: ""
  };

  const customer = {
    loaded: false, loading: false,
    quotations: [], error: ""
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));

  const money = n => {
    const v = Number(n || 0);
    return "฿" + v.toLocaleString("th-TH", {
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  async function request(url, options = {}) {
    const r = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });

    if (!r.ok) {
      const body = await r.text();
      throw new Error("HTTP " + r.status + ": " + body.slice(0, 180));
    }

    return r.json();
  }

  async function csrf() {
    const data = await request("/api/auth/csrf");

    if (!data.headerName || !data.token)
      throw new Error("CSRF token not available");

    return { [data.headerName]: data.token };
  }

  function redraw() {
    if ((typeof AT !== "undefined" && AT === "qt") ||
        location.hash.startsWith("#/quotations")) {
      if (typeof draw === "function") draw();
    }
  }

  // Keep a single in-flight fetch so callers can await the *actual* result.
  // Reload on creation: requests may have been submitted since last visit.
  let adminLoadPromise = null;
  function loadAdmin(force = false) {
    if (adminLoadPromise) return adminLoadPromise;
    if (admin.loaded && !force) return Promise.resolve();
    admin.loading = true;
    admin.error = "";
    adminLoadPromise = (async () => {
      try {
        const [quotations, requests] = await Promise.all([
          request("/api/admin/quotations"),
          request("/api/admin/event-requests")
        ]);
        if (!Array.isArray(requests) || !Array.isArray(quotations)) {
          throw new Error("Invalid data returned from quotation or event request API");
        }
        admin.quotations = quotations;
        admin.requests = requests;
        admin.loaded = true;
      } catch (e) {
        admin.error = e.message;
        admin.loaded = false;
        throw e;
      } finally {
        admin.loading = false;
        adminLoadPromise = null;
        redraw();
      }
    })();
    return adminLoadPromise;
  }

  async function loadCustomer() {
    if (customer.loading) return;

    customer.loading = true;
    customer.error = "";

    try {
      customer.quotations = await request("/api/quotations/my");
      customer.loaded = true;
    } catch (e) {
      customer.error = e.message;
      customer.loaded = false;
    } finally {
      customer.loading = false;
      redraw();
    }
  }

  function refreshAdmin() {
    admin.loaded = false;
    admin.error = "";
    loadAdmin().catch(() => {});
  }

  function refreshCustomer() {
    customer.loaded = false;
    customer.error = "";
    loadCustomer();
  }

  // The customer-facing API already restricts quotations by the authenticated
  // customer's Event Requests. Never load all admin quotations for this view.
  async function fetchMy() {
    const quotes = await request('/api/quotations/my');
    if (!Array.isArray(quotes)) throw new Error('Invalid quotation response');
    customer.quotations = quotes;
    customer.loaded = true;
    customer.error = '';
    return quotes;
  }

  async function openCustomerFromRequest(id) {
    try {
      await fetchMy();
      const q = customer.quotations.find(x => Number(x.id) === Number(id));
      if (!q) throw new Error(typeof L !== 'undefined' && L
        ? 'Quotation not found for your account'
        : 'ไม่พบใบเสนอราคาของบัญชีนี้');
      open(q.id, 'customer');
    } catch (e) {
      alert((typeof L !== 'undefined' && L
        ? 'Cannot open quotation: ' : 'เปิดใบเสนอราคาไม่ได้: ') + e.message);
    }
  }

  // Fetch current database state on every fresh visit, not only once per page load.
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#/quotations")) refreshCustomer();
  });

  function itemHTML(description = "", qty = 1, unitPrice = 0) {
    return `<div class="bt-quote-item"
      style="
        display:grid;grid-template-columns:2fr 1fr 1fr auto;
        gap:8px;margin:10px 0
      ">
      <label style="display:block">
        รายการค่าใช้จ่าย
        <input class="bt-item-description"
        placeholder="เช่น ค่าอาหาร"
        value="${esc(description)}" required maxlength="500">
      </label>

      <label style="display:block">
        จำนวน
        <input class="bt-item-qty" type="number"
          min="1" step="1"
          value="${Number(qty)}" required>
      </label>

      <label style="display:block">
        ราคาต่อหน่วย (บาท)
        <input class="bt-item-price" type="number"
          min="0" step="1"
          value="${Number(unitPrice)}" required>
      </label>

      <div style="display:flex;flex-direction:column;
        justify-content:flex-end;min-width:0">

        <span style="font-size:13px;font-weight:600;
          margin-bottom:6px">
          จัดการ
        </span>

        <button class="btn sm o" type="button"
          style="height:46px;min-height:46px;
            width:100%;padding:0 10px;
            align-self:stretch"
          onclick="this.closest('.bt-quote-item').remove();
                   BTQuotation.calculate()">
          ลบ
        </button>
      </div>
    </div>`;
  }

  function addItem() {
    const container = document.getElementById("bt-quote-items");
    if (!container) return;

    if (container.children.length >= 100) return;

    container.insertAdjacentHTML("beforeend", itemHTML());
    calculate();
  }

  function calculate() {
    const form = document.getElementById("bt-quote-form");
    if (!form) return;

    let subtotal = 0;

    form.querySelectorAll(".bt-quote-item").forEach(row => {
      const q = Number(row.querySelector(".bt-item-qty").value || 0);
      const p = Number(row.querySelector(".bt-item-price").value || 0);
      subtotal += q * p;
    });

    const discount = Number(form.elements.discount.value || 0);
    const rate = Number(form.elements.taxPercent.value || 0);

    const net = subtotal - discount;
    const tax = net * rate / 100;

    const output = document.getElementById("bt-quote-total");
    if (output) {
      output.textContent = money(Math.max(0, net + tax));
    }
  }

  function dialog(body) {
    const modal = document.getElementById("md");

    modal.innerHTML = `
      <div class="md">
        <div class="card pad" role="dialog" aria-modal="true"
          style="
            width:min(95vw,960px);
            max-height:85vh;overflow:auto;
            border-radius:20px
          ">
          ${body}
        </div>
      </div>`;
  }

  async function createForRequest(id) {
    return create(id);
  }

  async function create(selectedRequestId = null) {
    // Always fetch fresh requests; do not trust the cached list.
    // A newly submitted Event Request must be selectable immediately.
    try {
      await loadAdmin(true);
    } catch (e) {
      dialog(`<div class="sh"><h2>โหลดคำขอ Event ไม่สำเร็จ</h2><button class="btn o sm" type="button" onclick="document.getElementById('md').innerHTML=''">ปิด</button></div>
        <p class="err">${esc(e.message)}</p>
        <p class="mu">ลองเข้าสู่ระบบ Admin อีกครั้งหรือกดสร้างใบเสนอราคาใหม่</p>`);
      return;
    }

    if (selectedRequestId !== null && selectedRequestId !== undefined &&
        !admin.requests.some(r => Number(r.id) === Number(selectedRequestId))) {
      dialog(`<div class="sh"><h2>ไม่พบคำขอ Event #${esc(selectedRequestId)}</h2><button class="btn o sm" type="button" onclick="document.getElementById('md').innerHTML=''">ปิด</button></div>
        <p>ระบบโหลดข้อมูลคำขอล่าสุดแล้ว แต่ไม่พบ ID ที่เลือก กรุณาตรวจสอบว่าคำขอยังอยู่ใน MySQL</p>`);
      return;
    }

    if (!admin.requests.length) {
      return dialog(`
        <h2>ยังไม่มีคำขอ Event</h2>
        <p>ไม่พบคำขอ Event ใน MySQL หลังโหลดข้อมูลล่าสุด</p>
        <button class="btn o"
          onclick="document.getElementById('md').innerHTML=''">
          ปิด
        </button>
      `);
    }

    dialog(`
      <h2>สร้างใบเสนอราคา</h2>
      <p class="mu">
        ใบเสนอราคานี้จะบันทึกลง MySQL
        และผูกกับคำขอ Event ของลูกค้า
      </p>

      <form id="bt-quote-form"
        onsubmit="return BTQuotation.save(event)"
        oninput="BTQuotation.calculate()">

        <label>เลือกคำขอ Event</label>
        <select name="eventRequestId" required
          style="width:100%;margin-bottom:16px">
          ${admin.requests.map(r => `
            <option value="${Number(r.id)}">
              #${Number(r.id)} — ${esc(r.title)}
              (${esc(r.customerName || r.customerEmail || "")})
            </option>
          `).join("")}
        </select>

        <section class="bt-doc-fields">
          <h3>ข้อมูลเอกสารใบเสนอราคา</h3>
          <div class="bt-doc-grid">
            <label>ชื่อบริษัทผู้ออกเอกสาร<input name="issuerName" required maxlength="200" placeholder="BlueTrail"></label>
            <label>เลขผู้เสียภาษี<input name="issuerTax" maxlength="30"></label>
            <label>อีเมลบริษัท<input name="issuerEmail" type="email" maxlength="200"></label>
            <label>เบอร์โทรบริษัท<input name="issuerPhone" maxlength="40"></label>
            <label class="bt-wide">ที่อยู่บริษัท<textarea name="issuerAddress" rows="2" maxlength="500"></textarea></label>
            <label>ชื่อลูกค้า/บริษัท<input name="customerName" required maxlength="200"></label>
            <label>เบอร์โทรลูกค้า<input name="customerPhone" maxlength="40"></label>
            <label>อีเมลลูกค้า<input name="customerEmail" type="email" maxlength="200"></label>
            <label class="bt-wide">ที่อยู่ลูกค้า<textarea name="customerAddress" rows="2" maxlength="500"></textarea></label>
            <label>วันที่ออกใบเสนอราคา<input name="issueDate" type="date" required></label>
            <label>ใช้ได้ถึงวันที่<input name="validUntil" type="date" required></label>
            <label>ธนาคาร<input name="bankName" maxlength="150"></label>
            <label>เลขบัญชี<input name="bankAccount" maxlength="70"></label>
            <label>SWIFT / ช่องทางอื่น<input name="swift" maxlength="120"></label>
            <label class="bt-wide">เงื่อนไขการชำระเงิน<textarea name="paymentTerms" rows="2" maxlength="1200"></textarea></label>
            <label class="bt-wide">หมายเหตุท้ายเอกสาร<textarea name="footerNote" rows="2" maxlength="1200"></textarea></label>
          </div>
        </section>
        <style>
          .bt-doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 20px}
          .bt-doc-grid label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}
          .bt-doc-grid input,.bt-doc-grid textarea{width:100%;box-sizing:border-box}
          .bt-doc-grid .bt-wide{grid-column:1/-1}
          @media(max-width:650px){.bt-doc-grid{grid-template-columns:1fr}}
          .bt-print-paper{color:#111;background:white;padding:35px;line-height:1.6;font-family:Arial,sans-serif}
          .bt-print-header{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #ccc;padding-bottom:15px}
          .bt-print-paper table{width:100%;border-collapse:collapse;margin:24px 0}
          .bt-print-paper th,.bt-print-paper td{padding:8px;text-align:left;border-bottom:1px solid #ddd}
          .bt-print-paper .right{text-align:right}
        </style>
        <h3>รายการค่าใช้จ่าย</h3>
        <div id="bt-quote-items">
          ${itemHTML("ค่าจัดงาน", 1, 0)}
        </div>

        <button class="btn sm o" type="button"
          onclick="BTQuotation.addItem()">
          + เพิ่มรายการ
        </button>

        <div class="fg" style="margin-top:18px">
          <div>
            <label>ส่วนลด (บาท)</label>
            <input name="discount" type="number"
              min="0" step="1" value="0" required>
          </div>
          <div>
            <label>ภาษี (%)</label>
            <input name="taxPercent" type="number"
              min="0" max="100" step="1" value="0" required>
          </div>
        </div>

        <label style="display:block;margin-top:14px">
          หมายเหตุ
        </label>
        <textarea name="adminNote" rows="3"
          maxlength="5000"
          style="width:100%;box-sizing:border-box"></textarea>

        <h3 style="margin:18px 0">
          ยอดรวมประมาณการ:
          <span id="bt-quote-total" style="color:#1d4ed8">
            ฿0.00
          </span>
        </h3>

        <p class="mu" style="font-size:12px">
          ยอดเงินจริงจะคำนวณอีกครั้งบน Backend
        </p>

        <p id="bt-quote-error" style="color:#dc2626"></p>

        <div class="rw">
          <button class="btn o" type="button" onclick="BTQuotation.previewForm()">ดูตัวอย่างเอกสาร</button>
          <button class="btn" type="submit">
            บันทึกฉบับร่าง
          </button>
          <button class="btn o" type="button"
            onclick="document.getElementById('md').innerHTML=''">
            ยกเลิก
          </button>
        </div>
      </form>
    `);
    const form=document.getElementById('bt-quote-form');
    if(form){
      const today=new Date().toISOString().slice(0,10);
      form.elements.issueDate.value=today;
      const exp=new Date(Date.now()+14*86400000);
      form.elements.validUntil.value=exp.toISOString().slice(0,10);
      form.elements.eventRequestId.addEventListener('change',()=>populateCustomer());
      populateCustomer();
      loadIssuerTemplate();
    }
    if (selectedRequestId !== null && selectedRequestId !== undefined) {
      const form = document.getElementById('bt-quote-form');
      if (form && form.elements.eventRequestId) {
        form.elements.eventRequestId.value = String(selectedRequestId);
        form.elements.eventRequestId.dispatchEvent(new Event('change'));
      }
    }

  }

  function populateCustomer(){
    const f=document.getElementById('bt-quote-form');if(!f)return;
    const r=admin.requests.find(x=>Number(x.id)===Number(f.elements.eventRequestId.value));
    if(!r)return;
    f.elements.customerName.value=r.customerName||r.contactName||'';
    f.elements.customerEmail.value=r.customerEmail||r.contactEmail||'';
    f.elements.customerPhone.value=r.customerPhone||r.contactPhone||'';
  }

  async function loadIssuerTemplate(){
    try{
      const response=await fetch('/api/admin/quotation-template',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const raw=await response.text();
      const v=JSON.parse(raw||'{}');
      const f=document.getElementById('bt-quote-form');if(!f||!v)return;
      const pairs={issuerName:'name',issuerTax:'tax',issuerPhone:'phone',issuerEmail:'email',issuerAddress:'addr',paymentTerms:'terms',footerNote:'foot'};
      Object.entries(pairs).forEach(([field,key])=>{if(f.elements[field]&&v[key])f.elements[field].value=v[key];});
    }catch(e){ /* No saved template yet; the admin can fill the fields manually. */ }
  }

  async function save(event) {
    event.preventDefault();

    const form = event.target;
    const btn = form.querySelector('[type="submit"]');
    const error = document.getElementById("bt-quote-error");

    const items = [...form.querySelectorAll(".bt-quote-item")]
      .map(row => ({
        description: row.querySelector(".bt-item-description").value.trim(),
        quantity: Number(row.querySelector(".bt-item-qty").value),
        unitPrice: Number(row.querySelector(".bt-item-price").value)
      }));

    const keys=['issuerName','issuerTax','issuerPhone','issuerEmail','issuerAddress',
      'customerName','customerPhone','customerEmail','customerAddress',
      'issueDate','validUntil','bankName','bankAccount','swift','paymentTerms','footerNote'];
    const doc=Object.fromEntries(keys.map(k=>[k,String(form.elements[k]?.value||'').trim()]));
    if(!doc.issuerName||!doc.customerName||!doc.issueDate||!doc.validUntil||doc.validUntil<doc.issueDate){
      error.textContent='กรอกชื่อผู้ออกเอกสาร ชื่อลูกค้า และตรวจวันที่เอกสารให้ถูกต้อง';
      return false;
    }
    const payload = {
      documentJson:JSON.stringify(doc),
      eventRequestId: Number(form.elements.eventRequestId.value),
      items,
      discount: Number(form.elements.discount.value),
      taxPercent: Number(form.elements.taxPercent.value),
      adminNote: form.elements.adminNote.value.trim()
    };

    if (!items.length ||
        items.some(x => !x.description ||
          !Number.isSafeInteger(x.quantity) || x.quantity <= 0 ||
          !Number.isSafeInteger(x.unitPrice) || x.unitPrice < 0) ||
        !Number.isSafeInteger(payload.discount) ||
        payload.discount < 0 ||
        !Number.isSafeInteger(payload.taxPercent) ||
        payload.taxPercent < 0 ||
        payload.taxPercent > 100) {
      error.textContent = "ตรวจสอบรายการค่าใช้จ่าย";
      return false;
    }

    btn.disabled = true;
    error.textContent = "กำลังบันทึก...";

    try {
      const headers = await csrf();

      await request("/api/admin/quotations", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      document.getElementById("md").innerHTML = "";
      refreshAdmin();
    } catch (e) {
      error.textContent = "บันทึกไม่สำเร็จ: " + e.message;
    } finally {
      btn.disabled = false;
    }

    return false;
  }

  function quoteDocument(q){
    let d={};try{d=JSON.parse(q.documentJson||'{}')}catch(e){}
    return d&&typeof d==='object'?d:{};
  }
  // One shared, print-ready document for Admin preview, sent quotations and customers.
  // Company/customer values are snapshots from quotation_documents, not mutable global settings.
  function paper(q){
    const d = quoteDocument(q);
    const safe = v => esc(v || '—');
    const date = v => {
      if (!v) return '—';
      const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return esc(v);
      const dt = new Date(Date.UTC(+match[1], +match[2]-1, +match[3]));
      return esc(new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(dt));
    };
    const rows = (q.items || []).map((x, i) => `<tr>
      <td class="btq-desc"><span class="btq-row-number">${i+1}</span>${safe(x.description)}</td>
      <td class="btq-num">${safe(x.quantity)}</td>
      <td class="btq-num">${money(x.unitPrice)}</td>
      <td class="btq-num btq-subtotal">${money(x.lineTotal ?? (Number(x.quantity||0)*Number(x.unitPrice||0)))}</td>
    </tr>`).join('');
    const net = Number(q.subtotal||0) - Number(q.discount||0);
    const rate = net>0 ? Number(q.taxAmount||0)/net*100 : 0;
    const rateLabel = Number.isFinite(rate) && rate>0 ? ` (${Number(rate.toFixed(2))}%)` : '';
    const contact = [d.issuerPhone, d.issuerEmail].filter(Boolean).map(esc).join(' · ');
    const notes = [d.paymentTerms, d.footerNote, q.adminNote].filter(Boolean);
    const noteRows = notes.length ? notes.map((v,i)=>`<li><span>${i+1}.</span><div>${esc(v)}</div></li>`).join('')
      : '<li><span>1.</span><div>โปรดตรวจสอบรายละเอียดและติดต่อผู้เสนอราคาหากมีข้อสงสัย</div></li>';
    return `<style>
      .btq-document,.btq-document *{box-sizing:border-box}
      .btq-document{--btq-navy:#10244c;--btq-blue:#1762d2;--btq-muted:#64748b;--btq-line:#d9e4f2;
        width:min(100%,850px);min-height:950px;margin:0 auto;padding:44px 46px 54px;background:#fff!important;
        color:#18233a!important;font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif!important;font-size:12px;line-height:1.6;
        box-shadow:0 8px 35px rgba(13,41,84,.09);position:relative;isolation:isolate}
      .btq-document::after{content:"";position:absolute;bottom:0;right:0;width:64%;height:65px;
        background:linear-gradient(152deg,transparent 30%,#e8f2ff 31%,#cfe3ff 65%,#e8f2ff 100%);
        clip-path:polygon(0 100%,100% 0,100% 100%);z-index:-1;pointer-events:none}
      .btq-document h1,.btq-document h2,.btq-document h3,.btq-document p{margin:0}
      .btq-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:26px;border-bottom:1.5px solid #bed0e7}
      .btq-brand{display:flex;align-items:center;gap:14px;min-width:0}
      .btq-mark{flex:0 0 48px;width:48px;height:53px;display:grid;place-items:center;background:linear-gradient(145deg,#15a7eb,#1556d0);
        border-radius:12px 19px 12px 19px;color:white!important;font-size:35px;font-weight:900;font-style:italic;line-height:1}
      .btq-brand-name{font-size:34px;font-weight:800;line-height:1.12;letter-spacing:-1px;color:#10244c}
      .btq-brand-name span{color:#1263d6}
      .btq-caption{font-size:9px;letter-spacing:2px;color:#6d85a6;text-transform:uppercase;margin-top:5px}
      .btq-doc-meta{min-width:210px;display:grid;grid-template-columns:auto auto;gap:2px 12px;align-items:baseline}
      .btq-doc-meta dt{color:#708099}.btq-doc-meta dd{margin:0;color:#10244c;font-weight:700;text-align:right}
      .btq-intro{display:grid;grid-template-columns:minmax(0,1fr) 1.45fr;gap:22px;align-items:start;margin:30px 0 28px}
      .btq-section-kicker{font-size:11px;letter-spacing:1.7px;color:#1263d6;font-weight:800;margin-bottom:10px}
      .btq-client-name{font-size:20px;font-weight:800;color:#13264c;overflow-wrap:anywhere}
      .btq-client-addr{white-space:pre-line;margin-top:8px;color:#64748b;overflow-wrap:anywhere}
      .btq-title{text-align:center;padding-top:6px}.btq-title h1{font-size:31px;letter-spacing:.25px;font-weight:800;color:#10244c}
      .btq-title-rule{width:64px;height:4px;background:#1762d2;border-radius:5px;margin:11px auto 15px}
      .btq-title p{color:#63748f;font-size:11px;max-width:360px;margin:auto}
      .btq-items{width:100%;border-collapse:collapse;margin:0 0 26px;table-layout:fixed}
      .btq-items thead{background:#eaf3ff}.btq-items thead th{color:#10244c;font-size:11px;text-transform:uppercase;letter-spacing:.9px;
        padding:13px 12px;border-bottom:1px solid #d4e2f3;text-align:right}
      .btq-items thead th:first-child{text-align:left;width:53%}.btq-items thead th:nth-child(2){width:10%}
      .btq-items thead th:nth-child(3){width:18%}.btq-items thead th:nth-child(4){width:19%}
      .btq-items tbody td{border-bottom:1px solid #e2eaf5;padding:12px;color:#1c2b46;vertical-align:top;overflow-wrap:anywhere}
      .btq-items tbody tr:nth-child(even){background:#fafcff}.btq-num{text-align:right;white-space:nowrap}
      .btq-desc{font-weight:600}.btq-row-number{display:inline-block;color:#95aac6;font-size:10px;width:22px;font-weight:400}
      .btq-summary{display:flex;justify-content:flex-end;margin:2px 0 28px}
      .btq-totals{width:min(100%,310px);font-size:12px}
      .btq-total-line{display:flex;align-items:center;justify-content:space-between;padding:7px 9px;border-bottom:1px solid #e3ebf6;gap:20px}
      .btq-total-line span:first-child{color:#6b7c94}.btq-total-line strong{color:#1b2e51;font-weight:700}
      .btq-grand-total{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:7px;
        border-radius:7px;padding:11px 12px;background:#e6f2ff;color:#103b82;font-size:19px;font-weight:800}
      .btq-grand-total strong{font-size:23px;color:#0755be;white-space:nowrap}
      .btq-bottom{border-top:1.5px solid #bed0e7;padding-top:23px;display:grid;grid-template-columns:1fr 1fr;gap:25px}
      .btq-payment-box{padding:14px 16px;background:#f2f7fd;border-radius:9px}
      .btq-detail-row{display:grid;grid-template-columns:114px minmax(0,1fr);gap:9px;margin:6px 0}
      .btq-detail-row span{color:#6d7e98}.btq-detail-row strong{color:#13274d;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
      .btq-notes{border-left:1px solid #c6d9f0;padding-left:25px;min-width:0}
      .btq-notes ol{list-style:none;padding:0;margin:0}.btq-notes li{display:flex;gap:9px;margin:8px 0;color:#62738d;overflow-wrap:anywhere;white-space:pre-line}
      .btq-notes li span{color:#1762d2;font-weight:700}
      .btq-footer{margin-top:24px;font-size:10px;color:#7b8ba1;padding-bottom:12px}
      .btq-footer strong{color:#1c4c90}
      @media(max-width:650px){.btq-document{padding:20px;min-height:auto;font-size:11px}
        .btq-head{align-items:flex-start;flex-wrap:wrap}.btq-brand-name{font-size:27px}.btq-intro{grid-template-columns:1fr;gap:20px}
        .btq-title{text-align:left}.btq-title h1{font-size:24px}.btq-title-rule{margin:9px 0}
        .btq-bottom{grid-template-columns:1fr}.btq-notes{border-left:none;border-top:1px solid #dae6f4;padding:16px 0 0}
        .btq-items thead th,.btq-items tbody td{padding:8px 4px;font-size:10px}.btq-row-number{display:none}}
      @page{size:A4 portrait;margin:11mm}
      @media print{html,body{background:#fff!important;color:#18233a!important;margin:0!important;padding:0!important}
        .btq-document{width:100%;min-height:0;box-shadow:none!important;padding:10mm 8mm!important;margin:0!important}
        .btq-head,.btq-intro,.btq-summary,.btq-bottom,.btq-items tr{break-inside:avoid;page-break-inside:avoid}
        .btq-document{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style><article class="btq-document bt-print-paper" id="bt-quotation-paper">
      <header class="btq-head">
        <div class="btq-brand"><div class="btq-mark" aria-hidden="true">B</div>
          <div><div class="btq-brand-name">Blue<span>Trail</span></div><div class="btq-caption">Tour &amp; Event Management</div></div>
        </div>
        <dl class="btq-doc-meta"><dt>Quotation No.</dt><dd>${safe(q.quotationNumber)}</dd>
          <dt>Issue Date</dt><dd>${date(d.issueDate)}</dd>
          <dt>Valid Through</dt><dd>${date(d.validUntil)}</dd></dl>
      </header>
      <section class="btq-intro"><div><div class="btq-section-kicker">BILL TO</div>
        <div class="btq-client-name">${safe(d.customerName || q.eventTitle)}</div>
        <div class="btq-client-addr">${safe(d.customerAddress)}</div>
        <div class="btq-client-addr">Tel: ${safe(d.customerPhone)}<br>Email: ${safe(d.customerEmail)}</div></div>
        <div class="btq-title"><h1>PRICE QUOTATION</h1><div class="btq-title-rule"></div>
          <p>Thank you for your interest in our services. We are pleased to provide the following quotation for your consideration.</p></div></section>
      <table class="btq-items"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody></table>
      <div class="btq-summary"><div class="btq-totals">
        <div class="btq-total-line"><span>Subtotal</span><strong>${money(q.subtotal)}</strong></div>
        <div class="btq-total-line"><span>Discount</span><strong>− ${money(q.discount)}</strong></div>
        <div class="btq-total-line"><span>Tax${rateLabel}</span><strong>${money(q.taxAmount)}</strong></div>
        <div class="btq-grand-total"><span>Total</span><strong>${money(q.totalAmount)}</strong></div>
      </div></div>
      <section class="btq-bottom"><div><div class="btq-section-kicker">PAYMENT INFORMATION</div>
        <div class="btq-payment-box">
          <div class="btq-detail-row"><span>Company</span><strong>${safe(d.issuerName || 'BlueTrail')}</strong></div>
          <div class="btq-detail-row"><span>Address</span><strong>${safe(d.issuerAddress)}</strong></div>
          <div class="btq-detail-row"><span>Bank</span><strong>${safe(d.bankName)}</strong></div>
          <div class="btq-detail-row"><span>Account number</span><strong>${safe(d.bankAccount)}</strong></div>
          <div class="btq-detail-row"><span>SWIFT / Other</span><strong>${safe(d.swift)}</strong></div>
          ${d.issuerTax?`<div class="btq-detail-row"><span>Tax ID</span><strong>${esc(d.issuerTax)}</strong></div>`:''}
        </div></div>
        <div class="btq-notes"><div class="btq-section-kicker">NOTES &amp; TERMS</div><ol>${noteRows}</ol></div>
      </section>
      <footer class="btq-footer"><strong>${safe(d.issuerName || 'BlueTrail')}</strong>
        ${contact ? ` · ${contact}` : ''}<br>Thank you for your business.</footer>
    </article>`;
  }
  function previewForm(){
    const f=document.getElementById('bt-quote-form');if(!f)return;
    const keys=['issuerName','issuerTax','issuerPhone','issuerEmail','issuerAddress','customerName',
      'customerPhone','customerEmail','customerAddress','issueDate','validUntil',
      'bankName','bankAccount','swift','paymentTerms','footerNote'];
    const d=Object.fromEntries(keys.map(k=>[k,String(f.elements[k]?.value||'').trim()]));
    const items=[...f.querySelectorAll('.bt-quote-item')].map(row=>{
      const quantity=Number(row.querySelector('.bt-item-qty').value||0);
      const unitPrice=Number(row.querySelector('.bt-item-price').value||0);
      return {description:row.querySelector('.bt-item-description').value,quantity,unitPrice,lineTotal:quantity*unitPrice};
    });
    const subtotal=items.reduce((a,b)=>a+b.lineTotal,0),discount=Number(f.elements.discount.value||0);
    const taxAmount=Math.max(0,subtotal-discount)*Number(f.elements.taxPercent.value||0)/100;
    const q={quotationNumber:'PREVIEW — DRAFT',documentJson:JSON.stringify(d),items,subtotal,
      discount,taxAmount,totalAmount:Math.max(0,subtotal-discount)+taxAmount,adminNote:f.elements.adminNote.value};
    const w=window.open('','_blank');if(!w){alert('กรุณาอนุญาตให้เปิดหน้าต่าง Preview');return;}
    w.document.open();
    w.document.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BlueTrail — Quotation Preview</title><style>body{background:#f1f5fb;margin:0;padding:28px 8px}</style></head><body>'+paper(q)+'</body></html>');
    w.document.close();
  }
  function printQuote(id,role){
    const source=role==='admin'?admin.quotations:customer.quotations;
    const q=source.find(x=>Number(x.id)===Number(id));if(!q)return;
    const w=window.open('','_blank');if(!w){alert('กรุณาอนุญาตให้เปิดหน้าต่างเพื่อพิมพ์');return;}
    const html=`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quotation ${esc(q.quotationNumber)}</title><style>body{background:#f1f5fb;margin:0;padding:20px 4px}@media print{body{padding:0}}</style></head><body>${paper(q)}<script>window.onload=()=>window.print()<\/script></body></html>`;
    w.document.open();w.document.write(html);w.document.close();
  }
  function detail(q, isAdmin) {
    const items = (q.items || []).map(x => `
      <tr>
        <td>${esc(x.description)}</td>
        <td>${esc(x.quantity)}</td>
        <td>${money(x.unitPrice)}</td>
        <td>${money(x.lineTotal)}</td>
      </tr>
    `).join("");

    return `
      ${q.documentJson?paper(q):''}
      <div style="margin:12px 0"><button type="button" class="btn o" onclick="BTQuotation.printQuote(${Number(q.id)},'${isAdmin?'admin':'customer'}')">พิมพ์ / บันทึกเป็น PDF</button></div>
      <h2>${esc(q.quotationNumber)}</h2>
      <p>${esc(q.eventTitle)}</p>
      <p>สถานะ: <b>${esc(q.status)}</b></p>

      <div class="tw">
        <table>
          <tr>
            <th>รายละเอียด</th>
            <th>จำนวน</th>
            <th>ราคาต่อหน่วย</th>
            <th>รวม</th>
          </tr>
          ${items}
        </table>
      </div>

      <div style="margin-top:18px;line-height:2">
        <p>ยอดก่อนส่วนลด: ${money(q.subtotal)}</p>
        <p>ส่วนลด: ${money(q.discount)}</p>
        <p>ภาษี: ${money(q.taxAmount)}</p>
        <h2 style="color:#1d4ed8">
          ยอดสุทธิ ${money(q.totalAmount)}
        </h2>
      </div>

      ${q.adminNote ? `
        <p><b>หมายเหตุ Admin:</b> ${esc(q.adminNote)}</p>
      ` : ""}

      ${q.customerNote ? `
        <p><b>ข้อความตอบกลับ:</b> ${esc(q.customerNote)}</p>
      ` : ""}

      ${!isAdmin && q.status === "SENT" ? `
        <label>หมายเหตุถึง Admin (ถ้ามี)</label>
        <textarea id="bt-quote-customer-note"
          rows="3" maxlength="5000"
          style="width:100%;box-sizing:border-box"></textarea>

        <div class="rw" style="margin-top:15px">
          <button class="btn" onclick="
            BTQuotation.respond(${Number(q.id)},'ACCEPTED')">
            ตอบรับใบเสนอราคา
          </button>
          <button class="btn r" onclick="
            BTQuotation.respond(${Number(q.id)},'REJECTED')">
            ปฏิเสธใบเสนอราคา
          </button>
        </div>
      ` : ""}

      ${isAdmin && q.status === "DRAFT" ? `
        <button class="btn" onclick="
          BTQuotation.send(${Number(q.id)})">
          ส่งใบเสนอราคาให้ลูกค้า
        </button>
      ` : ""}

      <p id="bt-quote-action-error" style="color:#dc2626"></p>
      <button class="btn o" type="button"
        style="margin-top:16px"
        onclick="document.getElementById('md').innerHTML=''">
        ปิด
      </button>`;
  }

  function open(id, role) {
    const source = role === "admin"
      ? admin.quotations : customer.quotations;

    const q = source.find(x => Number(x.id) === Number(id));
    if (!q) return;

    dialog(detail(q, role === "admin"));
  }

  function send(id) {
    confirmSendPrompt(id);
  }

  function confirmSendPrompt(id) {
    const q = admin.quotations.find(
      x => Number(x.id) === Number(id)
    );

    if (!q) return;

    dialog(`
      <h2 style="color:#172554">ยืนยันส่งใบเสนอราคา</h2>
      <p>ต้องการส่งใบเสนอราคานี้ให้ลูกค้าผ่าน BlueTrail ใช่หรือไม่?</p>

      <div style="background:#f1f5f9;padding:16px;border-radius:14px">
        <strong>${esc(q.quotationNumber)}</strong>
        <p>${esc(q.eventTitle)}</p>
        <strong>ยอดสุทธิ ${money(q.totalAmount)}</strong>
      </div>

      <p class="mu" style="margin-top:16px">
        ลูกค้าจะสามารถดู ตอบรับ หรือปฏิเสธใบเสนอราคาได้
      </p>

      <p id="bt-quote-action-error" style="color:#dc2626"></p>

      <div style="display:flex;gap:10px;
        justify-content:flex-end;margin-top:18px">
        <button class="btn o" type="button"
          onclick="document.getElementById('md').innerHTML=''">
          ยกเลิก
        </button>
        <button class="btn" type="button"
          onclick="BTQuotation.confirmSend(${Number(id)})">
          ยืนยันส่ง
        </button>
      </div>
    `);
  }

  async function confirmSend(id) {
    try {
      const headers = await csrf();

      await request(`/api/admin/quotations/${id}/send`, {
        method: "PATCH", headers
      });

      document.getElementById("md").innerHTML = "";
      refreshAdmin();
    } catch (e) {
      const box = document.getElementById("bt-quote-action-error");
      if (box) box.textContent = e.message;
    }
  }

  async function respond(id, status) {
    if (!confirm(
      status === "ACCEPTED"
        ? "ยืนยันตอบรับใบเสนอราคา?"
        : "ยืนยันปฏิเสธใบเสนอราคา?"
    )) return;

    const note =
      document.getElementById("bt-quote-customer-note")?.value || "";

    try {
      const headers = await csrf();

      await request(`/api/quotations/${id}/respond`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({status, note})
      });

      document.getElementById("md").innerHTML = "";
      refreshCustomer();
    } catch (e) {
      const box = document.getElementById("bt-quote-action-error");
      if (box) box.textContent = e.message;
    }
  }


  async function openTemplate() {
    try {
      const r = await fetch("/api/admin/quotation-template", {
        credentials: "same-origin", cache: "no-store"
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const raw = await r.text();
      const data = JSON.parse(raw || "{}");
      const fields = [
        ["name","ชื่อบริษัท"],["tax","เลขผู้เสียภาษี"],
        ["phone","โทรศัพท์"],["email","อีเมล"],
        ["addr","ที่อยู่"],["terms","เงื่อนไขชำระเงิน"],
        ["note","หมายเหตุ"],["foot","ข้อความท้ายเอกสาร"]
      ];
      dialog(`
        <h2>แม่แบบใบเสนอราคา</h2>
        <form id="bt-template-form"
          onsubmit="BTQuotation.saveTemplate(event);return false">
          ${fields.map(([key,label]) => `
            <label>${label}</label>
            <input name="${key}" value="${esc(data[key] ?? "")}">
          `).join("")}
          <p class="err" id="bt-template-error"></p>
          <button class="btn" type="submit">บันทึกลง MySQL</button>
        </form>
      `);
    } catch(e) {
      dialog(`<p class="err">${esc(e.message)}</p>`);
    }
  }

  async function saveTemplate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const headers = await csrf();
      await request("/api/admin/quotation-template", {
        method: "PUT",
        headers: {...headers, "Content-Type": "application/json"},
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.target).entries())
        )
      });
      document.getElementById("md").innerHTML = "";
      alert("บันทึกแม่แบบลง MySQL สำเร็จ");
    } catch(err) {
      document.getElementById("bt-template-error").textContent =
        err.message;
    } finally {
      btn.disabled = false;
    }
  }

  async function showRevisions(id) {
    try {
      const rows = await request(
        `/api/admin/quotations/${Number(id)}/revisions`
      );
      dialog(`
        <h2>ประวัติใบเสนอราคา #${Number(id)}</h2>
        ${rows.length ? rows.map(r => `
          <div class="card pad">
            <b>Revision ${Number(r.revision)}</b>
            <p>${esc(r.createdAt || "")}</p>
            <p>${esc(r.createdBy || "")}</p>
            <pre style="white-space:pre-wrap;overflow:auto">${
              esc(r.snapshotJson || "")
            }</pre>
          </div>
        `).join("") : "<p>ยังไม่มี Revision ใน MySQL</p>"}
        <button class="btn o"
          onclick="document.getElementById('md').innerHTML=''">
          ปิด
        </button>
      `);
    } catch(e) {
      dialog(`<p class="err">${esc(e.message)}</p>`);
    }
  }

  function renderAdmin() {
    if (!admin.loaded && !admin.loading && !admin.error)
      loadAdmin().catch(() => {});

    if (admin.error) return `
      <div class="card pad">
        <p style="color:#dc2626">${esc(admin.error)}</p>
        <button class="btn" onclick="BTQuotation.refreshAdmin()">
          โหลดใหม่
        </button>
      </div>`;

    if (!admin.loaded) return `
      <div class="card pad">กำลังโหลดใบเสนอราคาจาก MySQL...</div>`;

    const rows = admin.quotations.map(q => `
      <tr>
        <td>${esc(q.quotationNumber)}</td>
        <td>${esc(q.eventTitle)}</td>
        <td>${money(q.totalAmount)}</td>
        <td><span class="badge">${esc(q.status)}</span></td>
        <td>
          <button class="btn sm o"
            onclick="BTQuotation.open(${Number(q.id)},'admin')">
            ดูรายละเอียด
          </button>
          <button class="btn sm o"
            onclick="BTQuotation.showRevisions(${Number(q.id)})">
            ประวัติ
          </button>
        </td>
      </tr>
    `).join("");

    return `
      <div class="sh">
        <h2>ใบเสนอราคา (${admin.quotations.length})</h2>
        <div class="rw">
          <button class="btn" onclick="BTQuotation.create()">
            + สร้างใบเสนอราคา
          </button>
          <button class="btn o"
            onclick="BTQuotation.openTemplate()">
            แม่แบบใบเสนอราคา
          </button>
          <button class="btn o"
            onclick="BTQuotation.refreshAdmin()">
            โหลดใหม่
          </button>
        </div>
      </div>

      <p class="mu">ข้อมูลจาก MySQL · เชื่อมกับ Event Requests</p>

      <div class="tw">
        <table>
          <tr>
            <th>เลขที่</th><th>งาน</th>
            <th>ยอดรวม</th><th>สถานะ</th><th>จัดการ</th>
          </tr>
          ${rows || `<tr><td colspan="5">
            ยังไม่มีใบเสนอราคา
          </td></tr>`}
        </table>
      </div>`;
  }

  function renderCustomer() {
    if (!customer.loaded && !customer.loading && !customer.error)
      loadCustomer();

    if (customer.error) return `
      <div class="w" style="padding-top:30px">
        <p style="color:#dc2626">${esc(customer.error)}</p>
        <button class="btn"
          onclick="BTQuotation.refreshCustomer()">โหลดใหม่</button>
      </div>`;

    if (!customer.loaded) return `
      <div class="w" style="padding-top:30px">
        กำลังโหลดใบเสนอราคาของคุณ...
      </div>`;

    const cards = customer.quotations.map(q => `
      <div class="card pad" style="margin-top:14px">
        <div class="sh">
          <h3>${esc(q.quotationNumber)}</h3>
          <span class="badge">${esc(q.status)}</span>
        </div>

        <p>${esc(q.eventTitle)}</p>
        <h2 style="color:#172554">${money(q.totalAmount)}</h2>

        <button class="btn sm"
          onclick="BTQuotation.open(${Number(q.id)},'customer')">
          ดูใบเสนอราคา
        </button>
      </div>
    `).join("");

    return `
      <div class="w" style="padding:28px 0 60px;max-width:900px">
        <div class="sh">
          <h1>ใบเสนอราคาของฉัน</h1>
          <button class="btn sm o"
            onclick="BTQuotation.refreshCustomer()">
            โหลดใหม่
          </button>
        </div>
        <p class="mu">
          ${typeof L !== "undefined" && L ? "Quotations sent to your signed-in account" : "ใบเสนอราคาที่ส่งถึงบัญชีที่เข้าสู่ระบบนี้"}
        </p>
        ${cards || `<div class="card pad">
          ${typeof L !== "undefined" && L ? "No sent quotations for this account. Ask the admin to confirm Send, and verify the quotation belongs to your Event Request." : "ยังไม่มีใบเสนอราคาที่ส่งถึงบัญชีนี้ โปรดให้ Admin กดยืนยันส่งใบเสนอราคา และตรวจสอบว่าเลือกคำขอ Event ของบัญชีนี้ถูกต้อง"}
        </div>`}
      </div>`;
  }

  function customerShortcut() {
    return `<div class="w" style="padding-top:16px">
      <a class="btn sm o" href="#/quotations">
        ดูใบเสนอราคาของฉัน
      </a>
    </div>`;
  }

  return {
    renderAdmin, renderCustomer, customerShortcut,
    refreshAdmin, refreshCustomer, fetchMy, openCustomerFromRequest,
    create, createForRequest, addItem, calculate, save,
    open, send, confirmSend, respond, previewForm, printQuote,
    openTemplate, saveTemplate, showRevisions
  };
})();
