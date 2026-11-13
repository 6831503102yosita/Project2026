window.BTBookings = (() => {
  const states = {
    my: {data: [], loaded: false, loading: false, error: ""},
    admin: {data: [], loaded: false, loading: false, error: ""}
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));

  const money = v => "฿" + Number(v || 0).toLocaleString(
    "th-TH", {minimumFractionDigits: 2, maximumFractionDigits: 2}
  );

  let owner="";
  const session=()=>typeof ME!=="undefined"&&ME?String(ME.id||ME.email||"")+":"+ME.role:"";
  function repaint() {
    const target=document.querySelector('[data-bt-bookings="my"]');
    if(target && location.hash.split("?")[0]==="#/bookings") target.outerHTML=render("my");
  }
  async function load(kind, silent=false) {
    const requestOwner=session();
    const state = states[kind];
    if (state.loading) return;

    state.loading = true;
    state.changed=false;
    state.error = "";

    try {
      const url = kind === "admin"
        ? "/api/admin/bookings"
        : "/api/bookings/my";

      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) throw new Error("HTTP " + response.status);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid API response");

      if(requestOwner!==session()) return;
      const changed=JSON.stringify(state.data)!==JSON.stringify(data);
      if(changed && kind==="my" && window.BTPayments) {
        data.forEach(b=>BTPayments.invalidateBookingPayment(Number(b.id)));
      }
      state.changed=changed;
      state.data = data;
      state.loaded = true;
    } catch (e) {
      if(!silent && requestOwner===session()){state.error = e.message;state.loaded = false;}
    } finally {
      state.loading = false;
      if(silent){if(requestOwner===session() && state.loaded)repaint();}
      else if (typeof draw === "function") draw();
    }
  }

  function refresh(kind) {
    states[kind].loaded = false;
    states[kind].error = "";
    load(kind);
  }

  function render(kind) {
    if(owner!==session()) {
      owner=session();
      Object.values(states).forEach(s=>{s.data=[];s.loaded=false;s.error="";});
    }
    const state = states[kind];
    const admin = kind === "admin";
    const en = typeof L !== "undefined" && !!L;
    const title = admin
      ? (en ? "Admin Bookings" : "รายการจองทั้งหมด")
      : (en ? "My Bookings" : "การจองของฉัน");

    const refreshButton = `<button class="btn sm o"
      onclick="BTBookings.refresh('${kind}')">
      ${en ? "Refresh" : "โหลดข้อมูลใหม่"}
    </button>`;

    if (!state.loaded && !state.loading && !state.error) {
      load(kind);
    }

    if (state.error) {
      return `<div class="card pad" data-bt-bookings="${kind}"><h3>${title}</h3>
        <p class="err">${esc(state.error)}</p>${refreshButton}</div>`;
    }

    if (!state.loaded) {
      return `<div class="card pad" data-bt-bookings="${kind}"><h3>${title}</h3>
        <p>${en ? "Loading..." : "กำลังโหลดรายการจอง..."}</p>
      </div>`;
    }

    const rows = [...state.data].reverse().map(b => `
      <tr>
        <td>${esc(b.id)}</td>
        ${admin ? `<td>${esc(b.contactName || b.customerName || "—")}</td><td style="overflow-wrap:anywhere">${esc(b.contactEmail || b.customerEmail || "—")}</td>` : ""}
        <td><div class="bt-booking-event"><div>${esc(BTLocale.title(b))}</div><div class="mu">${esc(BTLocale.place(b.location||''))}</div>${!admin?`<button class="btn sm o" type="button" style="display:inline-flex;margin-top:8px;align-self:flex-start" onclick="BTEnhancements.booking(${Number(b.id)})">${en?"Details / Email":"รายละเอียด / อีเมล"}</button>`:""}</div></td>
        <td>${Number(b.quantity||0).toLocaleString("th-TH")}</td>
        <td>${money(b.totalPrice)}</td>
        <td class="bt-booking-status"><span class="badge ${!admin ? 'bt-booking-state bt-booking-state-'+esc(b.status) : ''}">${esc(BTLocale.status(b.status))}</span>
        ${!admin && b.status === 'PENDING' && b.paymentDueAt ? `<div class="mu bt-due" data-due="${esc(b.paymentDueAt)}">${en ? 'Payment deadline' : 'กำหนดชำระ'}: ${esc(BTLocale.thaiTime(b.paymentDueAt))}</div>` : ''}
        </td>
        ${!admin ? `<td class="bt-booking-actions">${['PENDING', 'CONFIRMED'].includes(b.status) ? `<button class="btn sm o"
          ${BTPayments.bookingButtonStyle(Number(b.id))}
          onclick="BTPayments.openCustomer(
            ${Number(b.id)},
            ${Number(b.totalPrice)},
            '${esc(b.status)}'
          )">${b.status === 'CONFIRMED'
            ? (en ? 'View Payment' : 'ดูการชำระเงิน')
            : (en ? 'Pay / View Slip' : 'ชำระเงิน / ดูสลิป')}</button>` : ""}</td>` : ""}
        <td>${esc(BTLocale.thaiTime(b.bookingDate))}</td>
      </tr>
    `).join("");

    return `<div class="w" data-bt-bookings="${kind}" style="padding-top:20px">
      ${!admin ? `<style>
      [data-bt-bookings="my"] .tw{overflow-x:auto}
      [data-bt-bookings="my"] table{width:100%;border-collapse:collapse}
      [data-bt-bookings="my"] th,[data-bt-bookings="my"] td{vertical-align:middle!important}
      [data-bt-bookings="my"] .bt-booking-event{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;line-height:1.5}
      [data-bt-bookings="my"] .bt-booking-event>.mu{margin:2px 0 0}
      [data-bt-bookings="my"] .bt-booking-status{min-width:190px}
      [data-bt-bookings="my"] .bt-due{margin-top:7px;font-size:.85rem;line-height:1.5}
      [data-bt-bookings="my"] .bt-booking-actions{width:1%;white-space:nowrap;padding-left:20px;padding-right:20px}
      [data-bt-bookings="my"] .bt-booking-actions .btn{margin:0;white-space:nowrap}
      [data-bt-bookings="my"] .bt-booking-state-PENDING{background:#fff0bd;color:#74520b}
      [data-bt-bookings="my"] .bt-booking-state-CONFIRMED{background:#d7f2dd;color:#185e2b}
      [data-bt-bookings="my"] .bt-booking-state-EXPIRED{background:#e5e7eb;color:#454c58}
      </style>` : ""}
      <div class="sh"><h2>${title} (${state.data.length})</h2>
        ${refreshButton}</div>
      ${state.data.length ? `<div class="tw"><table>
        <tr>
          <th>ID</th>
          ${admin ? `<th>${en ? "Customer name" : "ชื่อลูกค้า"}</th><th>${en ? "Customer email" : "อีเมลลูกค้า"}</th>` : ""}
          <th>${en ? "Event" : "งาน"}</th>
          <th>${en ? "Seats" : "ที่นั่ง"}</th>
          <th>${en ? "Total" : "ยอดรวม"}</th>
          <th>${en ? "Status" : "สถานะ"}</th>
          ${!admin ? `<th>${en ? "Actions" : "การดำเนินการ"}</th>` : ""}
          <th>${en ? "Booked at" : "วันที่จอง"}</th>
        </tr>
        ${rows}
      </table></div>` : `<div class="card pad">
        ${en ? "No bookings yet" : "ยังไม่มีรายการจอง"}
      </div>`}
    </div>`;
  }

  function poll(){
    if(document.hidden || location.hash!=="#/bookings" || typeof ME==="undefined" || ME?.role!=="customer")return;
    load("my",true);
  }
  setInterval(poll,10000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll();});
  window.addEventListener("focus",poll);
  window.addEventListener("hashchange",poll);
  return {
    repaint,
    renderMy: () => render("my"),
    renderAdmin: () => render("admin"),
    refresh
  };
})();