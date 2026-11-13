
window.BTPayments = (() => {
  const escapeHTML = value => String(value ?? "").replace(
    /[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",
      '"':"&quot;","'":"&#39;"
    }[c])
  );

  const isEnglish=()=>typeof L!=="undefined"&&!!L;
  const dictionary={"ไม่พบ CSRF Token": "Security token unavailable", "ปิดหน้าต่าง": "Close", "กำลังโหลดข้อมูลการชำระเงิน...": "Loading payment details…", "ยอดเงิน:": "Amount:", "สถานะ:": "Status:", "เหตุผลที่ปฏิเสธ": "Reason for rejection", "ไม่ระบุเหตุผล": "No reason provided", "สามารถส่งสลิปใหม่ได้หาก Booking ยังเป็น PENDING": "You can upload a new slip while the booking is pending.", "ดูสลิป": "View slip", "ชำระเงิน Booking #": "Payment for booking #", "ยอดชำระ": "Amount due", "โอนเงินตามช่องทางที่บริษัทแจ้งไว้\n          แล้วอัปโหลดหลักฐานการชำระเงิน": "Transfer the amount using the payment instructions provided, then upload your payment slip.", "ยังไม่มีหลักฐานการชำระเงิน": "No payment slip yet.", "เลือกภาพสลิป (JPG, PNG, WebP ไม่เกิน 5 MB)": "Select a slip image (JPG, PNG or WebP, up to 5 MB)", "ส่งสลิปให้ Admin ตรวจสอบ": "Submit slip for review", "มีรายการชำระเงินรอตรวจสอบหรืออนุมัติแล้ว": "A payment is pending review or has already been approved.", "Booking นี้ไม่สามารถส่งสลิปได้": "This booking cannot accept payment slips.", "ไม่สามารถโหลด Payment": "Could not load payment details", "กรุณาเลือกภาพ JPG, PNG หรือ WebP ไม่เกิน 5 MB": "Choose a JPG, PNG or WebP image up to 5 MB.", "กำลังส่งสลิป...": "Uploading slip…", "อัปโหลดสลิปสำเร็จ!": "Slip uploaded successfully!", "ส่งหลักฐานให้ Admin ตรวจสอบแล้ว": "Your payment slip has been sent for admin review.", "รอตรวจสอบ": "Pending review", "สถานะ": "Status", "ระบบได้รับหลักฐานการชำระเงินแล้ว": "Your payment slip has been received.", "กรุณารอ Admin ตรวจสอบยอดโอนจริง": "Please wait for an admin to verify the payment.", "รายการจองยังไม่ถือว่าชำระเงินสำเร็จ": "The booking is not yet confirmed as paid.", "กลับไปที่การจองของฉัน": "Back to my bookings", "ดูรายละเอียดการชำระเงิน": "View payment details", "ส่งไม่สำเร็จ: ": "Upload failed: ", "โหลดใหม่": "Refresh", "กำลังโหลด Payments...": "Loading payments…", "อนุมัติ": "Approve", "ปฏิเสธ": "Reject", "ยืนยันว่าตรวจสอบเงินเข้าบัญชีจริงแล้ว และต้องการอนุมัติ?": "Have you verified receipt of the payment and want to approve?", "ต้องการปฏิเสธสลิปนี้?": "Reject this payment slip?", "ยืนยันการอนุมัติ?": "Confirm approval?", "ยืนยันการปฏิเสธ?": "Confirm rejection?", "โปรดยืนยันว่าตรวจสอบเงินเข้าบัญชีธนาคารจริงแล้ว เมื่ออนุมัติ ระบบจะเปลี่ยน Booking เป็น CONFIRMED": "Confirm that the bank transfer has been received. Approval changes the booking to CONFIRMED.", "ระบบจะบันทึก Payment เป็น REJECTED และลูกค้าจะสามารถส่งสลิปใหม่ได้": "The payment will be marked REJECTED and the customer can submit another slip.", "เหตุผลการปฏิเสธ": "Reason for rejection", "เช่น ภาพสลิปไม่ชัดเจน หรือยอดโอนไม่ตรง": "For example, an unreadable slip or an incorrect amount", "ยกเลิก": "Cancel", "ยืนยันอนุมัติ": "Confirm approval", "ยืนยันปฏิเสธ": "Confirm rejection", "กรุณาระบุเหตุผลการปฏิเสธ": "Enter a reason for rejection.", "กำลังบันทึก...": "Saving…", "บันทึกไม่สำเร็จ: ": "Save failed: "};
  const pattern=new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");
  const tx=s=>isEnglish()?s.replace(pattern,key=>dictionary[key]):s;
  const paymentStatus=code=>code==='PENDING'?(isEnglish()?'Pending review':'รอตรวจสอบ'):BTLocale.status(code);
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
      throw new Error(tx("ไม่พบ CSRF Token"));
    }
    return {[csrf.headerName]: csrf.token};
  }

  function dialog(body) {
    document.getElementById("md").innerHTML = `
      <div class="md">
        <div class="card pad bt-payment-dialog" role="dialog" aria-modal="true"
          style="width:min(95vw,600px);max-height:85vh;overflow:auto">
          ${body}
          <p style="margin-top:16px">
            <button class="btn o" type="button"
              onclick="document.getElementById('md').innerHTML=''">
              ${tx("ปิดหน้าต่าง")}
            </button>
          </p>
        </div>
      </div>`;
  }

  async function openCustomer(bookingId, total, bookingStatus) {
    dialog(tx("<h2>กำลังโหลดข้อมูลการชำระเงิน...</h2>"));

    try {
      const records = await request(
        "/api/payments/booking/" + bookingId
      );

      const history = records.map(p => `
        <div class="card pad" style="margin-top:10px">
          <b>${isEnglish()?'Payment':'การชำระเงิน'} #${escapeHTML(p.id)}</b>
          <p>${tx("ยอดเงิน:")} ${money(p.amount)}</p>
          <p>${tx("สถานะ:")} <b>${escapeHTML(paymentStatus(p.status))}</b></p>
          ${p.status === "REJECTED" ? `
            <div style="
              background:#fff1f2;color:#9f1239;
              padding:12px;border-radius:10px;
              margin:10px 0
            ">
              <strong>${tx("เหตุผลที่ปฏิเสธ")}</strong>
              <p style="margin:6px 0">
                ${escapeHTML(p.rejectionReason || tx("ไม่ระบุเหตุผล"))}
              </p>
              <small>${tx("สามารถส่งสลิปใหม่ได้หาก Booking ยังเป็น PENDING")}</small>
            </div>
          ` : ""}
          ${p.hasSlip ? `
            <a target="_blank" rel="noopener"
              href="/api/payments/${Number(p.id)}/slip">
              ${tx("ดูสลิป")}
            </a>` : ""}
        </div>
      `).join("");

      const blocked = records.some(p =>
        ["PENDING", "APPROVED"].includes(p.status)
      );

      const canUpload = bookingStatus === "PENDING" && !blocked;

      dialog(`
        <h2>${tx("ชำระเงิน Booking #")}${Number(bookingId)}</h2>
        <h3>${tx("ยอดชำระ")} ${money(total)}</h3>
        <p class="mu">
          ${tx("โอนเงินตามช่องทางที่บริษัทแจ้งไว้\n          แล้วอัปโหลดหลักฐานการชำระเงิน")}
        </p>
        ${history || tx("<p>ยังไม่มีหลักฐานการชำระเงิน</p>")}
        ${canUpload ? `
          <form onsubmit="return BTPayments.submit(event,${Number(bookingId)})">
            <label>${tx("เลือกภาพสลิป (JPG, PNG, WebP ไม่เกิน 5 MB)")}</label>
            <input name="file" type="file"
              accept="image/jpeg,image/png,image/webp" required>
            <p class="err" id="bt-pay-error"></p>
            <button class="btn" type="submit">
              ${tx("ส่งสลิปให้ Admin ตรวจสอบ")}
            </button>
          </form>
        ` : `<p class="mu">
          ${blocked
            ? (records.some(p=>p.status==='APPROVED')?paymentStatus('APPROVED'):paymentStatus('PENDING'))
            : tx("Booking นี้ไม่สามารถส่งสลิปได้")}
        </p>`}
      `);
    } catch (error) {
      dialog(`<h2>${tx("ไม่สามารถโหลด Payment")}</h2>
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
      errorBox.textContent = tx("กรุณาเลือกภาพ JPG, PNG หรือ WebP ไม่เกิน 5 MB");
      return false;
    }

    button.disabled = true;
    errorBox.textContent = tx("กำลังส่งสลิป...");

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
        <div style="text-align:center;color:var(--tx);padding:12px 0">
          <div style="
            width:80px;height:80px;margin:0 auto 18px;
            border-radius:50%;background:#dcfce7;color:#16a34a;
            display:grid;place-items:center;font-size:42px
          ">✓</div>

          <h2 style="font-size:26px;margin-bottom:8px">
            ${tx("อัปโหลดสลิปสำเร็จ!")}
          </h2>

          <p style="color:#64748b;margin-bottom:22px">
            ${tx("ส่งหลักฐานให้ Admin ตรวจสอบแล้ว")}
          </p>

          <div style="
            background:var(--bg);border:1px solid var(--ln);
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
              <span>${tx("ยอดชำระ")}</span>
              <strong style="color:#1d4ed8">
                ${money(result.amount)}
              </strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>${tx("สถานะ")}</span>
              <strong style="
                background:#fef3c7;color:#92400e;
                border-radius:20px;padding:0 12px;font-size:13px
              ">${tx("รอตรวจสอบ")}</strong>
            </div>
          </div>

          <p style="
            margin:20px 0;color:#64748b;font-size:14px;
            line-height:1.7
          ">
            ${tx("ระบบได้รับหลักฐานการชำระเงินแล้ว")}<br>
            ${tx("กรุณารอ Admin ตรวจสอบยอดโอนจริง")}<br>
            ${tx("รายการจองยังไม่ถือว่าชำระเงินสำเร็จ")}
          </p>

          <button type="button"
            style="
              width:100%;padding:14px;border:0;border-radius:12px;
              background:#1d4ed8;color:white;
              font-weight:700;font-size:15px;cursor:pointer
            "
            onclick="document.getElementById('md').innerHTML=''">
            ${tx("กลับไปที่การจองของฉัน")}
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
            ${tx("ดูรายละเอียดการชำระเงิน")}
          </button>
        </div>
      `);
    } catch (error) {
      errorBox.textContent = tx("ส่งไม่สำเร็จ: ") + error.message;
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
          ${tx("โหลดใหม่")}
        </button>
      </div>`;
    }

    if (!adminState.loaded) {
      return `<div class="card pad">${tx("กำลังโหลด Payments...")}</div>`;
    }

    const rows = [...adminState.data].reverse().map(p => `
      <tr>
        <td>${escapeHTML(p.id)}</td>
        <td>${escapeHTML(p.bookingId)}</td>
        <td>${escapeHTML(p.customerId)}</td>
        <td>${money(p.amount)}</td>
        <td>
          <span class="badge">${escapeHTML(paymentStatus(p.status))}</span>
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
              ${tx("ดูสลิป")}
            </a>` : ""}
          ${p.status === "PENDING" ? `
            <button class="btn sm g"
              onclick="BTPayments.decide(${Number(p.id)},'APPROVED')">
              ${tx("อนุมัติ")}
            </button>
            <button class="btn sm r"
              onclick="BTPayments.decide(${Number(p.id)},'REJECTED')">
              ${tx("ปฏิเสธ")}
            </button>` : ""}
          <button class="btn sm o" type="button" ${p.status==='APPROVED'?'':'disabled'}
            onclick="BTPayments.sendConfirmation(${Number(p.bookingId)},this)">
            ${isEnglish()?'Send confirmation email':'ส่งอีเมลยืนยันสลิป'}</button>
          <span role="status" class="bt-payment-email-status"></span>
        </td>
      </tr>
    `).join("");

    return `
      <div class="sh">
        <h3>${isEnglish()?'Payment Verification':'ตรวจสอบการชำระเงิน'} (${adminState.data.length})</h3>
        <button class="btn sm o"
          onclick="BTPayments.refreshAdmin()">${tx("โหลดใหม่")}</button>
      </div>
      <div class="tw">
        <table>
          <tr>
            <th>${isEnglish()?'Payment':'รหัสการชำระเงิน'}</th>
            <th>${isEnglish()?'Booking':'รหัสการจอง'}</th>
            <th>${isEnglish()?'Customer ID':'รหัสลูกค้า'}</th>
            <th>${isEnglish()?'Amount':'ยอดเงิน'}</th>
            <th>${isEnglish()?'Status':'สถานะ'}</th>
            <th>${isEnglish()?'Actions':'จัดการ'}</th>
          </tr>
          ${rows}
        </table>
      </div>`;
  }

  async function decide(id, status) {
    const message = status === "APPROVED"
      ? tx("ยืนยันว่าตรวจสอบเงินเข้าบัญชีจริงแล้ว และต้องการอนุมัติ?")
      : tx("ต้องการปฏิเสธสลิปนี้?");

    const approve = status === "APPROVED";

    dialog(`
      <div style="text-align:center;color:var(--tx);padding:12px 0">
        <div style="
          width:72px;height:72px;border-radius:50%;
          background:${approve ? "#dcfce7" : "#fee2e2"};
          color:${approve ? "#16a34a" : "#dc2626"};
          display:grid;place-items:center;
          margin:0 auto 20px;font-size:36px
        ">${approve ? "✓" : "!"}</div>

        <h2 style="margin:0 0 12px;font-size:24px">
          ${approve ? tx("ยืนยันการอนุมัติ?") : tx("ยืนยันการปฏิเสธ?")}
        </h2>

        <p style="color:#64748b;line-height:1.7">
          Payment #${Number(id)}
        </p>

        <div style="
          background:${approve ? "#eff6ff" : "#fff7ed"};color:#172554;
          border-radius:14px;padding:18px;
          margin:20px 0;text-align:left;line-height:1.8
        ">
          ${approve
            ? tx("โปรดยืนยันว่าตรวจสอบเงินเข้าบัญชีธนาคารจริงแล้ว เมื่ออนุมัติ ระบบจะเปลี่ยน Booking เป็น CONFIRMED")
            : tx("ระบบจะบันทึก Payment เป็น REJECTED และลูกค้าจะสามารถส่งสลิปใหม่ได้")}
        </div>

        ${!approve ? `
          <div style="text-align:left;margin-bottom:18px">
            <label for="bt-reject-reason"
              style="display:block;font-weight:700;margin-bottom:8px">
              ${tx("เหตุผลการปฏิเสธ")}
            </label>
            <textarea id="bt-reject-reason"
              maxlength="500" rows="3"
              placeholder="${tx("เช่น ภาพสลิปไม่ชัดเจน หรือยอดโอนไม่ตรง")}"
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
            ${tx("ยกเลิก")}
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
            ${approve ? tx("ยืนยันอนุมัติ") : tx("ยืนยันปฏิเสธ")}
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
      if (error) error.textContent = tx("กรุณาระบุเหตุผลการปฏิเสธ");
      return;
    }

    decisionBusy = true;

    const button = document.getElementById("bt-confirm-decision");
    if (button) {
      button.disabled = true;
      button.textContent = tx("กำลังบันทึก...");
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
      alert(tx("บันทึกไม่สำเร็จ: ") + error.message);
    } finally {
      decisionBusy = false;
      const button = document.getElementById("bt-confirm-decision");
      if (button) {
        button.disabled = false;
        button.textContent = status === "APPROVED"
          ? tx("ยืนยันอนุมัติ") : tx("ยืนยันปฏิเสธ");
      }
    }
  }


  const bookingPaymentCache = new Map();
  const bookingPaymentUpdated = new Map();
  const bookingPaymentLoading = new Set();

  function invalidateBookingPayment(bookingId) {
    bookingPaymentCache.delete(Number(bookingId));
  }

  function bookingButtonStyle(bookingId) {
    const id = Number(bookingId);

    if ((!bookingPaymentCache.has(id) || Date.now()-(bookingPaymentUpdated.get(id)||0)>=10000) &&
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
          bookingPaymentUpdated.set(id,Date.now());
          bookingPaymentLoading.delete(id);

          if (location.hash.startsWith("#/bookings") &&
              window.BTBookings) {
            BTBookings.repaint();
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

  const confirmationCooldown=new Map();
  async function sendConfirmation(id,button){
    if(button.disabled)return;
    const text=(th,en)=>isEnglish()?en:th;
    const status=button.parentElement.querySelector('.bt-payment-email-status');
    const key=String(id),until=confirmationCooldown.get(key)||0;
    if(until>Date.now()){status.textContent=text('กรุณารอ 1 นาทีก่อนส่งอีกครั้ง','Please wait 1 minute before resending');return;}
    button.disabled=true;status.textContent=text('กำลังส่งอีเมล…','Sending email…');
    let queued=false;
    try{
      const headers=await csrfHeader();
      await request('/api/admin/bookings/'+id+'/payment-confirmation-email',{method:'POST',headers});
      queued=true;confirmationCooldown.set(key,Date.now()+60000);
      let mail;
      for(let attempt=0;attempt<12;attempt++){
        mail=await request('/api/admin/bookings/'+id+'/email');
        if(mail.status!=='PENDING')break;
        if(attempt<11)await new Promise(resolve=>setTimeout(resolve,3000));
      }
      status.textContent=mail.status==='SENT'?text('ส่งอีเมลยืนยันสลิปแล้ว','Confirmation email sent'):mail.status==='FAILED'?text('ส่งอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง','Email delivery failed; please retry'):text('อีเมลอยู่ในคิว ยังไม่ได้ยืนยันการส่ง','Email queued; delivery not yet confirmed');
    }catch(error){status.textContent=text('ส่งอีเมลไม่สำเร็จ: ','Email failed: ')+error.message;}
    finally{
      if(!queued){button.disabled=false;return;}
      const tick=()=>{if(!button.isConnected)return;const seconds=Math.max(0,Math.ceil(((confirmationCooldown.get(key)||0)-Date.now())/1000));button.disabled=seconds>0;button.textContent=seconds?text('ส่งอีกครั้งได้ใน '+seconds+' วินาที','Resend in '+seconds+' seconds'):text('ส่งอีเมลยืนยันสลิป','Send confirmation email');if(seconds)setTimeout(tick,1000);};tick();
    }
  }

return {
    sendConfirmation, openCustomer, submit, renderAdmin, refreshAdmin,
    decide, applyDecision, bookingButtonStyle,
    invalidateBookingPayment
  };
})();
