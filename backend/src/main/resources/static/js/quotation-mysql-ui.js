
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

  async function loadAdmin() {
    if (admin.loading) return;

    admin.loading = true;
    admin.error = "";

    try {
      const [quotations, requests] = await Promise.all([
        request("/api/admin/quotations"),
        request("/api/admin/event-requests")
      ]);

      admin.quotations = quotations;
      admin.requests = requests;
      admin.loaded = true;
    } catch (e) {
      admin.error = e.message;
      admin.loaded = false;
    } finally {
      admin.loading = false;
      redraw();
    }
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
    loadAdmin();
  }

  function refreshCustomer() {
    customer.loaded = false;
    customer.error = "";
    loadCustomer();
  }

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
            width:min(95vw,700px);
            max-height:85vh;overflow:auto;
            border-radius:20px
          ">
          ${body}
        </div>
      </div>`;
  }

  function create() {
    if (!admin.requests.length) {
      return dialog(`
        <h2>ยังไม่มีคำขอ Event</h2>
        <p>ต้องมี Event Request จากลูกค้าก่อนสร้างใบเสนอราคา</p>
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

    const payload = {
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
      loadAdmin();

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
          ใบเสนอราคาที่ Admin ส่งให้คุณผ่าน BlueTrail
        </p>
        ${cards || `<div class="card pad">
          ยังไม่มีใบเสนอราคาที่ส่งถึงคุณ
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
    refreshAdmin, refreshCustomer,
    create, addItem, calculate, save,
    open, send, confirmSend, respond,
    openTemplate, saveTemplate, showRevisions
  };
})();
