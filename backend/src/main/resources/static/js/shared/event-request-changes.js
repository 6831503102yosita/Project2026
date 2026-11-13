(() => {
  "use strict";
  const esc = v => String(v ?? "").replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const english = () => { try { return typeof L !== "undefined" ? !!L : JSON.parse(localStorage.getItem("lang") || "0") === 1; } catch { return false; } };
  const translations = {"รอพิจารณา": "Pending review", "อนุมัติแล้ว": "Approved", "ปฏิเสธแล้ว": "Rejected", "โหลด CSRF ไม่สำเร็จ": "Could not load security token", "CSRF ไม่ครบ": "Incomplete security token", "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนดำเนินการ": "The data has changed. Refresh before continuing.", "ดำเนินการไม่สำเร็จ (HTTP ": "Request failed (HTTP ", "ชื่องาน": "Event name", "สถานที่": "Location", "วันที่จัดงาน": "Start date", "วันจบงาน": "End date", "จำนวนคน": "Participants", "งบประมาณที่ลูกค้าเสนอ": "Proposed budget", "รายละเอียดงาน": "Event details", "เวลาเริ่ม": "Start time", "เวลาสิ้นสุด": "End time", "ค่าเดิม:": "Previous value:", "ค่าใหม่:": "New value:", "คำตอบจากแอดมิน:": "Admin reply:", "พิจารณาเมื่อ": "Reviewed on", "ยื่นคำขอเปลี่ยนแปลงรายละเอียด": "Request changes", "ระบุข้อมูลเดิม ข้อมูลใหม่ และเหตุผล เช่น เปลี่ยนจำนวนคนจาก 20 เป็น 30 คน\n      คำขอจะส่งให้แอดมินพิจารณา": "Enter the new details and a reason. Your request will be sent to an admin for review.", "ข้อมูลที่ต้องการเปลี่ยน": "Field to change", "ค่าใหม่ *": "New value *", "เพิ่มรายการที่ต้องการเปลี่ยน แล้วส่งทั้งหมดพร้อมกัน": "Add the fields you want to change and submit them together.", "เหตุผลหรือคำอธิบายประกอบ *": "Reason or explanation *", "ต้องการเปลี่ยน… จาก… เป็น… เนื่องจาก…": "I would like to change… from… to… because…", "ส่งคำขอเปลี่ยนแปลง": "Submit change request", "ประวัติคำขอเปลี่ยนแปลง": "Change request history", "กำลังโหลด…": "Loading…", "ยังไม่มีคำขอเปลี่ยนแปลงสำหรับงานนี้": "No change requests for this event.", "ยังไม่มีคำขอเปลี่ยนแปลง": "No change requests yet.", "ลบรายการนี้": "Remove field", "+ เพิ่มรายการเปลี่ยนแปลง": "+ Add another field", "เลือกข้อมูลแต่ละประเภทได้ครั้งเดียว กรุณาลบรายการซ้ำ": "Choose each field only once. Remove duplicate fields.", "กำลังส่ง…": "Submitting…", "ส่งสำเร็จ รอแอดมินพิจารณา": "Submitted. Awaiting admin review.", "ส่งสำเร็จ แต่โหลดประวัติไม่ได้ กรุณาเปิดหน้านี้ใหม่": "Submitted, but history could not be loaded. Reopen this page.", "คำขอ Event #": "Event request #", "ลูกค้า:": "Customer:", "ข้อความตอบกลับลูกค้า": "Reply to customer", "อนุมัติคำขอนี้": "Approve request", "ปฏิเสธคำขอนี้": "Reject request", "อนุมัติ": "Approve", "ปฏิเสธ": "Reject", "คำขอเปลี่ยนแปลงรายละเอียด": "Change requests", "ปิด": "Close", "เมื่ออนุมัติ ระบบจะอัปเดตทุกรายการในคำขอนี้พร้อมกัน และเก็บค่าเดิมในประวัติ": "Approval applies all changes together and keeps previous values in the history.", "บันทึกผลพิจารณาแล้ว": "Review saved.", "บันทึกผลแล้ว": "Decision saved.", "แจ้งเตือนคำขอเปลี่ยนแปลง (": "Change requests (", "เปิดรายการคำขอเปลี่ยนแปลงรายละเอียด": "View change requests", "มีคำขอเปลี่ยนรายละเอียดใหม่จากลูกค้า กดปุ่มแจ้งเตือนเพื่อดู": "A new change request has arrived. Select Change requests to view it.", "โหลดแจ้งเตือนไม่สำเร็จ รอลองใหม่": "Notifications could not be loaded. Retrying…", "คำขอเปลี่ยนแปลงและประวัติ": "Change requests and history", "อนุมัติแล้วข้อมูลในงานจะเปลี่ยนตามทุกรายการในคำขอ\n      ส่วนข้อมูลเดิมจะเก็บไว้ในประวัติ": "Approval applies all requested changes. Previous values remain in the history.", "กำลังโหลดประวัติ…": "Loading history…"};
  const translationKeys = Object.keys(translations).sort((a,b)=>b.length-a.length);
  const translationPattern = new RegExp(translationKeys.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");
  const tx = value => typeof value === "string" && english() ? value.replace(translationPattern,key=>translations[key]) : value;
  const label = s => ({
    PENDING:tx("รอพิจารณา"), APPROVED:tx("อนุมัติแล้ว"), REJECTED:tx("ปฏิเสธแล้ว")
  })[s] || s;
  const date = v => v ? new Date(v).toLocaleString(english() ? "en-GB" : "th-TH") : "";
  let role = "", account = "", busy = false;
  let observedAccount = "", previous = null;
  let items = [], panel = null, bell = null;

  async function api(url, method = "GET", body) {
    const headers = {"Accept":"application/json"};
    if (method !== "GET") {
      const tokenResponse = await fetch("/api/auth/csrf", {
        credentials:"same-origin", cache:"no-store"
      });
      if (!tokenResponse.ok) throw new Error(tx("โหลด CSRF ไม่สำเร็จ"));
      const csrf = await tokenResponse.json();
      if (!csrf.headerName || !csrf.token)
        throw new Error(tx("CSRF ไม่ครบ"));
      headers["Content-Type"] = "application/json";
      headers[csrf.headerName] = csrf.token;
    }
    const response = await fetch(url, {
      method, credentials:"same-origin", cache:"no-store",
      headers, ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });
    if (!response.ok) {
      if (response.status === 409)
        throw new Error(tx("ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนดำเนินการ"));
      throw new Error(tx("ดำเนินการไม่สำเร็จ (HTTP ") + response.status + ")");
    }
    return response.json();
  }

  const fieldLabels = new Proxy({
    title:"ชื่องาน", location:"สถานที่", requestedDate:"วันที่จัดงาน", endDate:"วันจบงาน",
    guestCount:"จำนวนคน", budget:"งบประมาณที่ลูกค้าเสนอ",
    description:"รายละเอียดงาน", startTime:"เวลาเริ่ม", endTime:"เวลาสิ้นสุด"
  }, {get:(target,key)=>tx(target[key])});
  const changeValue=(field,value)=>field==="location"?BTLocale.place(value):["requestedDate","endDate"].includes(field)?BTLocale.eventDate(value):["budget","guestCount"].includes(field)&&value!==null&&value!==""&&Number.isFinite(Number(value))?Number(value).toLocaleString(english()?"en-GB":"th-TH"):String(value??"-");
  function history(c) {
    return `<article style="padding:14px 0;border-top:1px solid var(--ln)">
      <strong>#${esc(c.id)} · ${esc(label(c.status))}</strong>
      <p class="mu">${esc(date(c.createdAt))}</p>
      ${(c.changes || []).map(item => `<p><b>${esc(fieldLabels[item.fieldName] || item.fieldName)}</b><br>
        ${tx("ค่าเดิม:")} ${esc(changeValue(item.fieldName,item.oldValue))} → ${tx("ค่าใหม่:")} ${esc(changeValue(item.fieldName,item.newValue))}</p>`).join("")}
      ${c.fieldName ? `<p><b>${esc(fieldLabels[c.fieldName] || c.fieldName)}</b></p>
      <p>${tx("ค่าเดิม:")} ${esc(changeValue(c.fieldName,c.oldValue))} → ${tx("ค่าใหม่:")} ${esc(changeValue(c.fieldName,c.newValue))}</p>` : ""}
      <p style="white-space:pre-wrap">${esc(c.details)}</p>
      ${c.adminNote ? `<p style="white-space:pre-wrap"><b>${tx("คำตอบจากแอดมิน:")}</b> ${esc(c.adminNote)}</p>` : ""}
      ${c.reviewedAt ? `<p class="mu">${tx("พิจารณาเมื่อ")} ${esc(date(c.reviewedAt))}</p>` : ""}
    </article>`;
  }

  async function attachCustomer() {
    const match = location.hash.match(/^#\/request\/(\d+)(?:\/)?$/);
    const container = document.getElementById("bt-request-detail");
    if (role !== "CUSTOMER" || !match || !container ||
        !container.querySelector(".card") ||
        container.querySelector(".err") ||
        container.querySelector("[data-bt-changes]")) return;

    const id = match[1];
    const section = document.createElement("section");
    section.dataset.btChanges = id;
    section.className = "card pad";
    section.style.marginTop = "16px";
    section.innerHTML = `
      <h3>${tx("ยื่นคำขอเปลี่ยนแปลงรายละเอียด")}</h3>
      <p class="mu">${tx("ระบุข้อมูลเดิม ข้อมูลใหม่ และเหตุผล เช่น เปลี่ยนจำนวนคนจาก 20 เป็น 30 คน\n      คำขอจะส่งให้แอดมินพิจารณา")}</p>
      <form>
        <label for="bt-change-field">${tx("ข้อมูลที่ต้องการเปลี่ยน")}</label>
        <select id="bt-change-field" style="width:100%;margin:10px 0">
          ${Object.entries(fieldLabels).map(([key,text]) =>
            `<option value="${key}">${text}</option>`).join("")}
        </select>
        <label for="bt-change-value">${tx("ค่าใหม่ *")}</label>
        <input id="bt-change-value" required maxlength="5000"
          style="width:100%;box-sizing:border-box;margin:10px 0">
        <p class="mu">${tx("เพิ่มรายการที่ต้องการเปลี่ยน แล้วส่งทั้งหมดพร้อมกัน")}</p>
        <label for="bt-change-text">${tx("เหตุผลหรือคำอธิบายประกอบ *")}</label>
        <textarea id="bt-change-text" required maxlength="5000" rows="5"
          style="width:100%;box-sizing:border-box;margin:10px 0"
          placeholder="${tx("ต้องการเปลี่ยน… จาก… เป็น… เนื่องจาก…")}"></textarea>
        <button class="btn" type="submit">${tx("ส่งคำขอเปลี่ยนแปลง")}</button>
      </form>
      <p data-message role="status"></p>
      <h3>${tx("ประวัติคำขอเปลี่ยนแปลง")}</h3>
      <div data-history aria-live="polite">${tx("กำลังโหลด…")}</div>`;
    container.append(section);
    const historyBox = section.querySelector("[data-history]");
    const message = section.querySelector("[data-message]");
    const form = section.querySelector("form");
    async function load() {
      const rows = await api(`/api/event-requests/${id}/changes`);
      if (section.isConnected)
        historyBox.innerHTML = rows.length
          ? rows.map(history).join("") : tx("<p>ยังไม่มีคำขอเปลี่ยนแปลง</p>");
    }

    const initialSelect = form.querySelector("#bt-change-field");
    const initialInput = form.querySelector("#bt-change-value");
    const rowTemplate = document.createElement("div");
    rowTemplate.className = "bt-change-row";
    rowTemplate.style.cssText =
      "border:1px solid #dce4f5;border-radius:12px;padding:14px;margin:10px 0";
    rowTemplate.innerHTML = `
      <label>${tx("ข้อมูลที่ต้องการเปลี่ยน")}</label>
      <select data-field style="width:100%;margin:10px 0">
        ${Object.entries(fieldLabels).map(([key,text]) =>
          `<option value="${key}">${text}</option>`).join("")}
      </select>
      <label>${tx("ค่าใหม่ *")}</label>
      <input data-value required maxlength="5000"
        style="width:100%;box-sizing:border-box;margin:10px 0">
      <button type="button" class="btn o sm" data-remove>${tx("ลบรายการนี้")}</button>`;
    const rowsBox = document.createElement("div");
    form.insertBefore(rowsBox, form.firstChild);
    form.querySelector('label[for="bt-change-field"]')?.remove();
    form.querySelector('label[for="bt-change-value"]')?.remove();
    initialSelect.remove();
    initialInput.remove();

    function addRow() {
      const used = new Set([...rowsBox.querySelectorAll("[data-field]")]
        .map(select => select.value));
      const available = Object.keys(fieldLabels).find(key => !used.has(key));
      if (!available) return;
      const row = rowTemplate.cloneNode(true);
      const select = row.querySelector("[data-field]");
      const input = row.querySelector("[data-value]");
      select.value = available;
      function configure() {
        input.value = "";
        const field = select.value;
        input.type = ["requestedDate","endDate"].includes(field) ? "date"
          : ["startTime","endTime"].includes(field) ? "time"
          : ["guestCount","budget"].includes(field) ? "number" : "text";
        input.removeAttribute("min");
        input.removeAttribute("step");
        if (field === "guestCount") {
          input.min = "1"; input.step = "1";
        }
        if (field === "budget") {
          input.min = "0"; input.step = "0.01";
        }
      }
      select.onchange = configure;
      row.querySelector("[data-remove]").onclick = () => {
        if (rowsBox.children.length > 1) row.remove();
      };
      configure();
      rowsBox.append(row);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn o";
    add.style.marginBottom = "16px";
    add.textContent = tx("+ เพิ่มรายการเปลี่ยนแปลง");
    add.onclick = addRow;
    rowsBox.after(add);
    addRow();
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const text = form.querySelector("textarea");
      if (!text.value.trim()) return;
      const entries = [...rowsBox.querySelectorAll(".bt-change-row")].map(row => ({
        fieldName:row.querySelector("[data-field]").value,
        newValue:row.querySelector("[data-value]").value.trim()
      }));
      if (new Set(entries.map(x => x.fieldName)).size !== entries.length) {
        message.textContent = tx("เลือกข้อมูลแต่ละประเภทได้ครั้งเดียว กรุณาลบรายการซ้ำ");
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      message.textContent = tx("กำลังส่ง…");
      try {
        await api(`/api/event-requests/${id}/changes`, "POST",
          {details:text.value.trim(), changes:entries});
        text.value = "";
        rowsBox.innerHTML = "";
        addRow();
        message.textContent = tx("ส่งสำเร็จ รอแอดมินพิจารณา");
        try { await load(); }
        catch { historyBox.textContent = tx("ส่งสำเร็จ แต่โหลดประวัติไม่ได้ กรุณาเปิดหน้านี้ใหม่"); }
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    try { await load(); }
    catch (e) { historyBox.textContent = e.message; }
  }

  function renderPanel() {
    if (!panel || !panel.isConnected) return;
    const list = panel.querySelector("[data-list]");
    list.innerHTML = items.length ? items.map(c => `
      <div class="card pad" style="margin-top:12px">
        <h3>${tx("คำขอ Event #")}${esc(c.eventRequestId)} · ${esc(c.eventTitle)}</h3>
        <p>${tx("ลูกค้า:")} ${esc(c.customerName)}</p>
        ${history(c)}${["APPROVED","REJECTED"].includes(c.status)?BTEventDecisionMail.fields(c.eventRequestId,c.id):""}
        ${c.status === "PENDING" ? `
          <label>${tx("ข้อความตอบกลับลูกค้า")}</label>
          <textarea rows="3" maxlength="2000" data-note="${Number(c.id)}"
            style="width:100%;box-sizing:border-box"></textarea>
          <p style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn" data-id="${Number(c.id)}" data-decision="APPROVED">${tx("อนุมัติ")}</button>
            <button class="btn o" data-id="${Number(c.id)}" data-decision="REJECTED">${tx("ปฏิเสธ")}</button>
          </p>` : ""}
      </div>`).join("") : tx("<p>ยังไม่มีคำขอเปลี่ยนแปลง</p>");
  }

  function openPanel() {
    if (panel?.isConnected && panel.open) return;
    if (panel) { panel.remove(); panel = null; }
    panel = document.createElement("dialog");
    panel.style.cssText =
      "background:var(--c);color:var(--tx);width:min(850px,90vw);max-height:85vh;overflow:auto;border:1px solid #dce4f5;border-radius:18px;padding:24px";
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:16px">
      <h2>${tx("คำขอเปลี่ยนแปลงรายละเอียด")}</h2>
      <button class="btn o" data-close>${tx("ปิด")}</button></div>
      <p class="mu">${tx("เมื่ออนุมัติ ระบบจะอัปเดตทุกรายการในคำขอนี้พร้อมกัน และเก็บค่าเดิมในประวัติ")}</p>
      <p data-message role="status"></p><div data-list></div>`;
    document.body.append(panel);
    panel.querySelector("[data-close]").onclick = () => panel.close();
    panel.addEventListener("close", () => { panel.remove(); panel = null; });
    panel.addEventListener("click", async e => {
      const button = e.target.closest("[data-decision]");
      if (!button) return;
      const id = button.dataset.id;
      const note = panel.querySelector(`[data-note="${id}"]`).value;
      const message = panel.querySelector("[data-message]");
      panel.querySelectorAll("[data-decision]").forEach(b => b.disabled = true);
      try {
        await api(`/api/admin/event-request-changes/${id}`, "PATCH",
          {status:button.dataset.decision, adminNote:note});
        message.textContent = tx("บันทึกผลแล้ว");
        items = await api("/api/admin/event-request-changes");
        renderPanel();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        panel?.querySelectorAll("[data-decision]").forEach(b => b.disabled = false);
      }
    });
    renderPanel();
    panel.showModal();
  }

  function clearAdmin() {
    bell?.remove(); bell = null;
    panel?.close();
    items = []; previous = null; observedAccount = "";
  }

  async function poll() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const response = await fetch("/api/auth/me", {
        credentials:"same-origin", cache:"no-store"
      });
      const user = response.ok ? await response.json() : {};
      role = String(user.role || "").toUpperCase();
      account = String(user.id || user.email || "");
      if (role !== "ADMIN") {
        clearAdmin();
        await attachCustomer();
        return;
      }
      if (observedAccount !== account) {
        clearAdmin();
        observedAccount = account;
      }
      const next = await api("/api/admin/event-request-changes");
      items = next;
      const pending = items.filter(c => c.status === "PENDING");
      if (!bell?.isConnected) {
        bell = document.createElement("button");
        bell.type = "button";
        bell.className = "btn";
        bell.style.cssText =
          "position:fixed;right:18px;bottom:18px;z-index:1500;max-width:90vw;box-shadow:0 4px 18px #0002";
        bell.onclick = openPanel;
        document.body.append(bell);
      }
      bell.textContent = `${tx("แจ้งเตือนคำขอเปลี่ยนแปลง (")}${pending.length})`;
      bell.title = tx("เปิดรายการคำขอเปลี่ยนแปลงรายละเอียด");
      const ids = new Set(items.map(c => String(c.id)));
      if (previous !== null &&
          pending.some(c => !previous.has(String(c.id)))) {
        const toast = document.createElement("div");
        toast.setAttribute("role","status");
        toast.style.cssText =
          "position:fixed;right:18px;bottom:85px;z-index:1600;background:#123272;color:white;padding:18px;border-radius:12px";
        toast.textContent = tx("มีคำขอเปลี่ยนรายละเอียดใหม่จากลูกค้า กดปุ่มแจ้งเตือนเพื่อดู");
        document.body.append(toast);
        setTimeout(() => toast.remove(), 7000);
      }
      previous = ids;
      // Preserve an admin's unfinished reply while the dialog is open.
    } catch (e) {
      console.warn("Change request notification:", e);
      if (bell) bell.textContent = tx("โหลดแจ้งเตือนไม่สำเร็จ รอลองใหม่");
    } finally { busy = false; }
  }


  window.BTRequestChangeSection = function(requestId) {
    const id = Number(requestId);
    const targetId = "bt-admin-change-history-" + id;

    Promise.resolve().then(async () => {
      const target = document.getElementById(targetId);
      if (!target) return;
      try {
        const all = await api("/api/admin/event-request-changes");
        if (!target.isConnected) return;
        const rows = all.filter(c => Number(c.eventRequestId) === id);
        target.innerHTML = rows.length ? rows.map(c => `
          <div style="padding:12px 0">
            ${history(c)}${["APPROVED","REJECTED"].includes(c.status)?BTEventDecisionMail.fields(id,c.id):""}
            ${c.status === "PENDING" ? `
              <label for="bt-inline-note-${Number(c.id)}">${tx("ข้อความตอบกลับลูกค้า")}</label>
              <textarea id="bt-inline-note-${Number(c.id)}"
                data-inline-note="${Number(c.id)}"
                rows="3" maxlength="2000"
                style="width:100%;box-sizing:border-box;margin:10px 0"></textarea>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn"
                  data-inline-id="${Number(c.id)}"
                  data-inline-decision="APPROVED">${tx("อนุมัติคำขอนี้")}</button>
                <button type="button" class="btn o"
                  data-inline-id="${Number(c.id)}"
                  data-inline-decision="REJECTED">${tx("ปฏิเสธคำขอนี้")}</button>
              </div>` : ""}
          </div>`).join("") : tx("<p>ยังไม่มีคำขอเปลี่ยนแปลงสำหรับงานนี้</p>");

        target.addEventListener("click", async event => {
          const button = event.target.closest("[data-inline-decision]");
          if (!button || !target.contains(button)) return;
          const changeId = button.dataset.inlineId;
          const note = target.querySelector(
            `[data-inline-note="${changeId}"]`).value;
          const message = document.getElementById(targetId + "-message");
          target.querySelectorAll("button").forEach(b => b.disabled = true);
          try {
            await api(`/api/admin/event-request-changes/${changeId}`, "PATCH", {
              status:button.dataset.inlineDecision, adminNote:note
            });
            if (message) message.textContent = tx("บันทึกผลพิจารณาแล้ว");
            await BTAdminRequests.load();
            if (target.isConnected)
              A.show(BTAdminRequests.details(id));
            poll();
          } catch (error) {
            if (message) message.textContent = error.message;
          } finally {
            target.querySelectorAll("button").forEach(b => b.disabled = false);
          }
        });
      } catch (error) {
        if (target.isConnected) target.textContent = error.message;
      }
    });

    return `<section class="card pad" style="margin-top:16px">
      <h3>${tx("คำขอเปลี่ยนแปลงและประวัติ")}</h3>
      <p class="mu">${tx("อนุมัติแล้วข้อมูลในงานจะเปลี่ยนตามทุกรายการในคำขอ\n      ส่วนข้อมูลเดิมจะเก็บไว้ในประวัติ")}</p>
      <p id="${targetId}-message" role="status"></p>
      <div id="${targetId}">${tx("กำลังโหลดประวัติ…")}</div>
    </section>`;
  };

  let lastLanguage = english();
  function syncLanguage() {
    const next = english();
    if (next === lastLanguage) return;
    lastLanguage = next;
    if (bell) {
      bell.textContent = tx("แจ้งเตือนคำขอเปลี่ยนแปลง (") + items.filter(c=>c.status === "PENDING").length + ")";
      bell.title = tx("เปิดรายการคำขอเปลี่ยนแปลงรายละเอียด");
    }
  }
  let queued = false;
  function scheduleAttach() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncLanguage();
      attachCustomer().catch(console.warn);
    });
  }
  function start() {
    new MutationObserver(scheduleAttach)
      .observe(document.body, {childList:true,subtree:true});
    window.addEventListener("hashchange", poll);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) poll();
    });
    poll();
    setInterval(poll, 15000);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
