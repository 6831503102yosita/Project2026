
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

  async function load(kind) {
    const state = states[kind];
    if (state.loading) return;

    state.loading = true;
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

      state.data = data;
      state.loaded = true;
    } catch (e) {
      state.error = e.message;
      state.loaded = false;
    } finally {
      state.loading = false;
      if (typeof draw === "function") draw();
    }
  }

  function refresh(kind) {
    states[kind].loaded = false;
    states[kind].error = "";
    load(kind);
  }

  function render(kind) {
    const state = states[kind];
    const admin = kind === "admin";
    const en = Boolean(window.L);
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
      return `<div class="card pad"><h3>${title}</h3>
        <p class="err">${esc(state.error)}</p>${refreshButton}</div>`;
    }

    if (!state.loaded) {
      return `<div class="card pad"><h3>${title}</h3>
        <p>${en ? "Loading..." : "กำลังโหลดรายการจอง..."}</p>
      </div>`;
    }

    const rows = [...state.data].reverse().map(b => `
      <tr>
        <td>${esc(b.id)}</td>
        ${admin ? `<td>${esc(b.userId)}</td>` : ""}
        <td>${esc(b.eventTitle)}</td>
        <td>${esc(b.quantity)}</td>
        <td>${money(b.totalPrice)}</td>
        <td><span class="badge">${esc(b.status)}</span>
        ${!admin && b.status === 'PENDING' && b.paymentDueAt ? `<div class="mu bt-due" data-due="${esc(b.paymentDueAt)}">${en?'Payment deadline':'กำหนดชำระ'}: ${esc(String(b.paymentDueAt).replace('T',' ').slice(0,16))}</div>` : ''}
        ${!admin && b.status === 'PENDING' ? `<button class="btn sm o"
          ${BTPayments.bookingButtonStyle(Number(b.id))}
          onclick="BTPayments.openCustomer(
            ${Number(b.id)},
            ${Number(b.totalPrice)},
            '${esc(b.status)}'
          )">ชำระเงิน / ดูสลิป</button>` : ""}
        </td>
        <td>${esc(String(b.bookingDate || "").replace("T", " ").slice(0, 16))}</td>
      </tr>
    `).join("");

    return `<div class="w" style="padding-top:20px">
      <div class="sh"><h2>${title} (${state.data.length})</h2>
        ${refreshButton}</div>
      ${state.data.length ? `<div class="tw"><table>
        <tr>
          <th>ID</th>
          ${admin ? `<th>${en ? "Customer ID" : "รหัสลูกค้า"}</th>` : ""}
          <th>${en ? "Event" : "งาน"}</th>
          <th>${en ? "Seats" : "ที่นั่ง"}</th>
          <th>${en ? "Total" : "ยอดรวม"}</th>
          <th>${en ? "Status" : "สถานะ"}</th>
          <th>${en ? "Booked at" : "วันที่จอง"}</th>
        </tr>
        ${rows}
      </table></div>` : `<div class="card pad">
        ${en ? "No bookings yet" : "ยังไม่มีรายการจอง"}
      </div>`}
    </div>`;
  }

  return {
    renderMy: () => render("my"),
    renderAdmin: () => render("admin"),
    refresh
  };
})();
