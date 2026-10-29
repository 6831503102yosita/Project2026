
window.BTPayments = (() => {
  const escapeHTML = value => String(value ?? "").replace(
    /[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",
      '"':"&quot;","'":"&#39;"
    }[c])
  );

  const money = value => "฿" + Number(value || 0)
    .toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const adminState = {
    loaded: false,
    loading: false,
    data: [],
    error: ""
  };

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });

    if (!response.ok) {
      let message = await response.text();
      throw new Error("HTTP " + response.status +
        (message ? ": " + message.slice(0, 160) : ""));
    }

    return response.json();
  }

  async function csrfHeader() {
    const csrf = await request("/api/auth/csrf");
    if (!csrf.token || !csrf.headerName) {
      throw new Error("ไม่พบ CSRF Token");
    }
    return {[csrf.headerName]: csrf.token};
  }

  function dialog(body) {
    document.getElementById("md").innerHTML = `
      <div class="md">
        <div class="card pad"
          style="width:min(95vw,600px);max-height:85vh;overflow:auto">
          ${body}
          <p style="margin-top:16px">
            <button class="btn o" type="button"
              onclick="document.getElementById('md').innerHTML=''">
              ปิดหน้าต่าง
            </button>
          </p>
        </div>
      </div>`;
  }

  async function openCustomer(bookingId, total, bookingStatus) {
    dialog("<h2>กำลังโหลดข้อมูลการชำระเงิน...</h2>");

    try {
      const records = await request(
        "/api/payments/booking/" + bookingId
      );

      const history = records.map(p => `
        <div class="card pad" style="margin-top:10px">
          <b>Payment #${escapeHTML(p.id)}</b>
          <p>ยอดเงิน: ${money(p.amount)}</p>
          <p>สถานะ: <b>${escapeHTML(p.status)}</b></p>
          ${p.status === "REJECTED" ? `
            <div style="
              background:#fff1f2;color:#9f1239;
              padding:12px;border-radius:10px;
              margin:10px 0
            ">
              <strong>เหตุผลที่ปฏิเสธ</strong>
              <p style="margin:6px 0">
                ${escapeHTML(p.rejectionReason || "ไม่ระบุเหตุผล")}
              </p>
              <small>สามารถส่งสลิปใหม่ได้หาก Booking ยังเป็น PENDING</small>
            </div>
          ` : ""}
          ${p.hasSlip ? `
            <a target="_blank" rel="noopener"
              href="/api/payments/${Number(p.id)}/slip">
              ดูสลิป
            </a>` : ""}
        </div>
      `).join("");

      const blocked = records.some(p =>
        ["PENDING", "APPROVED"].includes(p.status)
      );

      const canUpload = bookingStatus === "PENDING" && !blocked;

      dialog(`
        <h2>ชำระเงิน Booking #${Number(bookingId)}</h2>
        <h3>ยอดชำระ ${money(total)}</h3>
        <p class="mu">
          โอนเงินตามช่องทางที่บริษัทแจ้งไว้
          แล้วอัปโหลดหลักฐานการชำระเงิน
        </p>
        ${history || "<p>ยังไม่มีหลักฐานการชำระเงิน</p>"}
        ${canUpload ? `
          <form onsubmit="return BTPayments.submit(event,${Number(bookingId)})">
            <label>เลือกภาพสลิป (JPG, PNG, WebP ไม่เกิน 5 MB)</label>
            <input name="file" type="file"
              accept="image/jpeg,image/png,image/webp" required>
            <p class="err" id="bt-pay-error"></p>
            <button class="btn" type="submit">
              ส่งสลิปให้ Admin ตรวจสอบ
            </button>
          </form>
        ` : `<p class="mu">
          ${blocked
            ? "มีรายการชำระเงินรอตรวจสอบหรืออนุมัติแล้ว"
            : "Booking นี้ไม่สามารถส่งสลิปได้"}
        </p>`}
      `);
    } catch (error) {
      dialog(`<h2>ไม่สามารถโหลด Payment</h2>
        <p class="err">${escapeHTML(error.message)}</p>`);
    }
  }

  async function submit(event, bookingId) {
    event.preventDefault();

    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById("bt-pay-error");
    const file = form.elements.file.files[0];

    if (!file || file.size > 5000000 || file.size === 0 ||
        !["image/jpeg","image/png","image/webp"].includes(file.type)) {
      errorBox.textContent = "กรุณาเลือกภาพ JPG, PNG หรือ WebP ไม่เกิน 5 MB";
      return false;
    }

    button.disabled = true;
    errorBox.textContent = "กำลังส่งสลิป...";

    try {
      const headers = await csrfHeader();
      const data = new FormData();
      data.append("file", file);

      const result = await request(
        `/api/payments/booking/${bookingId}/slip`,
        {method:"POST", headers, body:data}
      );

      invalidateBookingPayment(bookingId);
      dialog(`
        <div style="text-align:center;color:#172554;padding:12px 0">
          <div style="
            width:80px;height:80px;margin:0 auto 18px;
            border-radius:50%;background:#dcfce7;color:#16a34a;
            display:grid;place-items:center;font-size:42px
          ">✓</div>

          <h2 style="font-size:26px;margin-bottom:8px">
            อัปโหลดสลิปสำเร็จ!
          </h2>

          <p style="color:#64748b;margin-bottom:22px">
            ส่งหลักฐานให้ Admin ตรวจสอบแล้ว
          </p>

          <div style="
            background:#f1f5ff;border:1px solid #dbeafe;
            border-radius:16px;padding:20px;text-align:left;
            line-height:2
          ">
            <div style="display:flex;justify-content:space-between">
              <span>Booking ID</span>
              <strong>#${Number(bookingId)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>Payment ID</span>
              <strong>#${Number(result.id)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>ยอดชำระ</span>
              <strong style="color:#1d4ed8">
                ${money(result.amount)}
              </strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>สถานะ</span>
              <strong style="
                background:#fef3c7;color:#92400e;
                border-radius:20px;padding:0 12px;font-size:13px
              ">รอตรวจสอบ</strong>
            </div>
          </div>

          <p style="
            margin:20px 0;color:#64748b;font-size:14px;
            line-height:1.7
          ">
            ระบบได้รับหลักฐานการชำระเงินแล้ว<br>
            กรุณารอ Admin ตรวจสอบยอดโอนจริง<br>
            รายการจองยังไม่ถือว่าชำระเงินสำเร็จ
          </p>

          <button type="button"
            style="
              width:100%;padding:14px;border:0;border-radius:12px;
              background:#1d4ed8;color:white;
              font-weight:700;font-size:15px;cursor:pointer
            "
            onclick="document.getElementById('md').innerHTML=''">
            กลับไปที่การจองของฉัน
          </button>

          <button type="button"
            style="
              margin-top:12px;padding:10px;background:transparent;
              color:#1d4ed8;border:0;cursor:pointer
            "
            onclick="BTPayments.openCustomer(
              ${Number(bookingId)},
              ${Number(result.amount)},
              'PENDING'
            )">
            ดูรายละเอียดการชำระเงิน
          </button>
        </div>
      `);
    } catch (error) {
      errorBox.textContent = "ส่งไม่สำเร็จ: " + error.message;
    } finally {
      button.disabled = false;
    }

    return false;
  }

  async function loadAdmin() {
    if (adminState.loading) return;

    adminState.loading = true;
    adminState.error = "";

    try {
      adminState.data = await request("/api/admin/payments");
      adminState.loaded = true;
    } catch (error) {
      adminState.error = error.message;
      adminState.loaded = false;
    } finally {
      adminState.loading = false;
      if (typeof draw === "function") draw();
    }
  }

  function refreshAdmin() {
    adminState.loaded = false;
    loadAdmin();
  }

  function renderAdmin() {
    if (!adminState.loaded &&
        !adminState.loading &&
        !adminState.error) {
      loadAdmin();
    }

    if (adminState.error) {
      return `<div class="card pad">
        <h3>Payment Verification</h3>
        <p class="err">${escapeHTML(adminState.error)}</p>
        <button class="btn" onclick="BTPayments.refreshAdmin()">
          โหลดใหม่
        </button>
      </div>`;
    }

    if (!adminState.loaded) {
      return `<div class="card pad">กำลังโหลด Payments...</div>`;
    }

    const rows = [...adminState.data].reverse().map(p => `
      <tr>
        <td>${escapeHTML(p.id)}</td>
        <td>${escapeHTML(p.bookingId)}</td>
        <td>${escapeHTML(p.customerId)}</td>
        <td>${money(p.amount)}</td>
        <td>
          <span class="badge">${escapeHTML(p.status)}</span>
          ${p.status === "REJECTED" && p.rejectionReason
            ? `<div style="font-size:12px;color:#b91c1c;margin-top:6px">
                ${escapeHTML(p.rejectionReason)}
               </div>`
            : ""}
        </td>
        <td>
          ${p.hasSlip ? `
            <a class="btn sm o" target="_blank" rel="noopener"
              href="/api/payments/${Number(p.id)}/slip">
              ดูสลิป
            </a>` : ""}
          ${p.status === "PENDING" ? `
            <button class="btn sm g"
              onclick="BTPayments.decide(${Number(p.id)},'APPROVED')">
              อนุมัติ
            </button>
            <button class="btn sm r"
              onclick="BTPayments.decide(${Number(p.id)},'REJECTED')">
              ปฏิเสธ
            </button>` : ""}
        </td>
      </tr>
    `).join("");

    return `
      <div class="sh">
        <h3>Payment Verification (${adminState.data.length})</h3>
        <button class="btn sm o"
          onclick="BTPayments.refreshAdmin()">โหลดใหม่</button>
      </div>
      <p class="mu">
        ตรวจสอบสลิปและยอดเงินเข้าบัญชีธนาคารจริง
        ก่อนกดอนุมัติ ระบบยังไม่ตรวจสอบยอดโอนอัตโนมัติ
      </p>
      <div class="tw">
        <table>
          <tr>
            <th>Payment</th>
            <th>Booking</th>
            <th>Customer ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
          ${rows}
        </table>
      </div>`;
  }

  async function decide(id, status) {
    const message = status === "APPROVED"
      ? "ยืนยันว่าตรวจสอบเงินเข้าบัญชีจริงแล้ว และต้องการอนุมัติ?"
      : "ต้องการปฏิเสธสลิปนี้?";

    const approve = status === "APPROVED";

    dialog(`
      <div style="text-align:center;color:#172554;padding:12px 0">
        <div style="
          width:72px;height:72px;border-radius:50%;
          background:${approve ? "#dcfce7" : "#fee2e2"};
          color:${approve ? "#16a34a" : "#dc2626"};
          display:grid;place-items:center;
          margin:0 auto 20px;font-size:36px
        ">${approve ? "✓" : "!"}</div>

        <h2 style="margin:0 0 12px;font-size:24px">
          ${approve ? "ยืนยันการอนุมัติ?" : "ยืนยันการปฏิเสธ?"}
        </h2>

        <p style="color:#64748b;line-height:1.7">
          Payment #${Number(id)}
        </p>

        <div style="
          background:${approve ? "#eff6ff" : "#fff7ed"};
          border-radius:14px;padding:18px;
          margin:20px 0;text-align:left;line-height:1.8
        ">
          ${approve
            ? "โปรดยืนยันว่าตรวจสอบเงินเข้าบัญชีธนาคารจริงแล้ว เมื่ออนุมัติ ระบบจะเปลี่ยน Booking เป็น CONFIRMED"
            : "ระบบจะบันทึก Payment เป็น REJECTED และลูกค้าจะสามารถส่งสลิปใหม่ได้"}
        </div>

        ${!approve ? `
          <div style="text-align:left;margin-bottom:18px">
            <label for="bt-reject-reason"
              style="display:block;font-weight:700;margin-bottom:8px">
              เหตุผลการปฏิเสธ
            </label>
            <textarea id="bt-reject-reason"
              maxlength="500" rows="3"
              placeholder="เช่น ภาพสลิปไม่ชัดเจน หรือยอดโอนไม่ตรง"
              style="
                width:100%;box-sizing:border-box;
                padding:12px;border:1px solid #cbd5e1;
                border-radius:12px;resize:vertical;
                font:inherit
              "></textarea>
            <p id="bt-decision-error"
              style="color:#dc2626;font-size:13px"></p>
          </div>
        ` : ""}

        <div style="display:flex;gap:12px">
          <button type="button"
            style="
              flex:1;padding:14px;border-radius:12px;
              border:1px solid #cbd5e1;background:white;
              color:#334155;font-weight:700;cursor:pointer
            "
            onclick="document.getElementById('md').innerHTML=''">
            ยกเลิก
          </button>

          <button type="button"
            id="bt-confirm-decision"
            style="
              flex:1;padding:14px;border:0;
              border-radius:12px;color:white;font-weight:700;
              background:${approve ? "#16a34a" : "#dc2626"};
              cursor:pointer
            "
            onclick="BTPayments.applyDecision(${Number(id)},'${status}')">
            ${approve ? "ยืนยันอนุมัติ" : "ยืนยันปฏิเสธ"}
          </button>
        </div>
      </div>
    `);
  }

  let decisionBusy = false;

  async function applyDecision(id, status) {
    if (decisionBusy) return;

    const reason = status === "REJECTED"
      ? (document.getElementById("bt-reject-reason")?.value || "").trim()
      : "";

    if (status === "REJECTED" && !reason) {
      const error = document.getElementById("bt-decision-error");
      if (error) error.textContent = "กรุณาระบุเหตุผลการปฏิเสธ";
      return;
    }

    decisionBusy = true;

    const button = document.getElementById("bt-confirm-decision");
    if (button) {
      button.disabled = true;
      button.textContent = "กำลังบันทึก...";
    }

    try {
      const headers = await csrfHeader();

      await request(`/api/admin/payments/${id}/status`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({status, reason})
      });

      document.getElementById("md").innerHTML = "";
      refreshAdmin();
      if (window.BTBookings) {
        BTBookings.refresh("admin");
      }
    } catch (error) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      decisionBusy = false;
      const button = document.getElementById("bt-confirm-decision");
      if (button) {
        button.disabled = false;
        button.textContent = status === "APPROVED"
          ? "ยืนยันอนุมัติ" : "ยืนยันปฏิเสธ";
      }
    }
  }


  const bookingPaymentCache = new Map();
  const bookingPaymentLoading = new Set();

  function invalidateBookingPayment(bookingId) {
    bookingPaymentCache.delete(Number(bookingId));
  }

  function bookingButtonStyle(bookingId) {
    const id = Number(bookingId);

    if (!bookingPaymentCache.has(id) &&
        !bookingPaymentLoading.has(id)) {

      bookingPaymentLoading.add(id);

      request(`/api/payments/booking/${id}`)
        .then(payments => {
          const latest = [...payments]
            .sort((a, b) => Number(b.id) - Number(a.id))[0];

          bookingPaymentCache.set(
            id,
            latest ? latest.status : "NONE"
          );
        })
        .catch(() => {
          bookingPaymentCache.set(id, "UNKNOWN");
        })
        .finally(() => {
          bookingPaymentLoading.delete(id);

          if (location.hash.startsWith("#/bookings") &&
              typeof draw === "function") {
            draw();
          }
        });
    }

    const status = bookingPaymentCache.get(id);

    if (status === "REJECTED") {
      return 'style="background:#dc2626;color:#fff;border-color:#dc2626;font-weight:700"';
    }

    if (status === "APPROVED") {
      return 'style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700"';
    }

    return 'style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;font-weight:700"';
  }

return {
    openCustomer, submit, renderAdmin, refreshAdmin,
    decide, applyDecision, bookingButtonStyle,
    invalidateBookingPayment
  };
})();
