
window.BTAdminEvents = (() => {
  const state = {
    loaded: false, loading: false, rows: [], error: ""
  };

  const esc = x => String(x ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;",
       '"':"&quot;", "'":"&#39;" })[c]);

  const money = x => "฿" + Number(x || 0).toLocaleString("th-TH");

  async function request(url, options = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status + ": " +
        (await res.text()).slice(0, 160));
    }

    return res.json();
  }

  async function csrf() {
    const data = await request("/api/auth/csrf");
    return { [data.headerName]: data.token };
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.error = "";

    try {
      state.rows = await request("/api/admin/events");
      state.loaded = true;
    } catch (e) {
      state.error = e.message;
    } finally {
      state.loading = false;
      if (typeof draw === "function" && AT === "ev") draw();
    }
  }


  function deleteEvent(id, confirmed = false) {
    const e = state.rows.find(
      x => Number(x.id) === Number(id)
    );

    if (!e) return;

    const modal = document.getElementById("md");

    if (!confirmed) {
      modal.innerHTML = `
        <div class="md">
          <div class="card pad" role="dialog"
            aria-modal="true"
            style="
              width:min(92vw,480px);
              border-radius:22px;
              padding:28px;
              text-align:center;
              color:#172554
            ">

            <div style="
              width:72px;height:72px;
              background:#fee2e2;color:#dc2626;
              border-radius:50%;
              display:grid;place-items:center;
              margin:0 auto 18px;
              font-size:34px;font-weight:700
            ">!</div>

            <h2>ยืนยันการลบ Event?</h2>

            <p style="
              font-weight:700;
              margin:14px 0;
              overflow-wrap:anywhere
            ">
              ${esc(e.title)}
            </p>

            <div style="
              background:#fff1f2;
              padding:16px;
              border-radius:14px;
              text-align:left;
              line-height:1.8;
              color:#9f1239
            ">
              การลบจะนำ Event นี้ออกจาก MySQL
              และไม่สามารถกู้คืนผ่านปุ่ม Undo ได้

              <br>

              หาก Event มี Booking หรือประวัติ
              ระบบจะไม่อนุญาตให้ลบ
            </div>

            <p id="bt-delete-error"
              style="color:#dc2626;margin-top:12px"></p>

            <div style="
              display:flex;
              justify-content:center;
              gap:12px;
              margin-top:20px
            ">
              <button class="btn o" type="button"
                onclick="
                  document.getElementById('md').innerHTML=''
                ">
                ยกเลิก
              </button>

              <button class="btn" type="button"
                id="bt-delete-confirm"
                style="background:#dc2626"
                onclick="
                  BTAdminEvents.deleteEvent(${Number(id)},true)
                ">
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>`;

      return;
    }

    performDelete(id);
  }

  async function performDelete(id) {
    const button = document.getElementById("bt-delete-confirm");
    const errorBox = document.getElementById("bt-delete-error");

    if (!button || button.disabled) return;

    button.disabled = true;
    button.textContent = "กำลังลบ...";

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!csrfResponse.ok) {
        throw new Error("ไม่สามารถรับ CSRF Token ได้");
      }

      const csrf = await csrfResponse.json();

      if (!csrf.headerName || !csrf.token) {
        throw new Error("CSRF Token ไม่ถูกต้อง");
      }

      const response = await fetch(
        `/api/admin/events/${Number(id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            [csrf.headerName]: csrf.token
          }
        }
      );

      if (response.status === 409) {
        throw new Error(
          "Event นี้มี Booking หรือประวัติอยู่ " +
          "กรุณาใช้ปุ่มปิดรับจองแทน"
        );
      }

      if (response.status === 403) {
        throw new Error(
          "ไม่มีสิทธิ์ลบ Event หรือ Session หมดอายุ"
        );
      }

      if (!response.ok) {
        throw new Error(
          "ลบไม่สำเร็จ (HTTP " + response.status + ")"
        );
      }

      document.getElementById("md").innerHTML = "";

      refresh();

    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
      }

      button.disabled = false;
      button.textContent = "ยืนยันลบ";
    }
  }

  function refresh() {
    state.loaded = false;
    state.error = "";
    load();
  }

  const field = (label, name, value, type = "text") => `
    <label style="display:block;margin:12px 0 4px">
      ${label}
    </label>
    <input
      name="${name}"
      type="${type}"
      value="${esc(value)}"
      required
      style="width:100%;box-sizing:border-box"
    >`;

  function edit(id) {
    const e = state.rows.find(x => Number(x.id) === Number(id));

    if (id && !e) return alert("ไม่พบ Event");

    const date = e?.eventDate
      ? String(e.eventDate).slice(0, 16)
      : "";

    const dialog = document.getElementById("md");

    dialog.innerHTML = `
      <div class="md">
        <div class="card pad"
          style="width:min(95vw,620px);max-height:85vh;overflow:auto">
          <h2>${e ? "แก้ไข Event / Tour" : "เพิ่ม Event / Tour"}</h2>

          <form onsubmit="return BTAdminEvents.save(event,${Number(id)})">
            ${field("ชื่อ Event / Tour", "title", e?.title || "")}

            <label style="display:block;margin:12px 0 4px">
              ประเภท
            </label>
            <select name="category"
              style="width:100%;box-sizing:border-box">
              <option value="event"
                ${e?.category === "event" ? "selected" : ""}>
                Event
              </option>
              <option value="tour"
                ${e?.category === "tour" ? "selected" : ""}>
                Tour
              </option>
            </select>

            ${field("สถานที่", "location", e?.location || "")}
            ${field("วันที่จัดงาน", "eventDate", date, "datetime-local")}
            ${field("ราคา (บาท)", "price", e?.price ?? 0, "number")}
            ${field("จำนวนที่นั่งทั้งหมด", "totalSeats",
                    e?.totalSeats ?? 20, "number")}

            <label style="display:block;margin:12px 0 4px">
              รายละเอียด
            </label>
            <textarea name="description" rows="4"
              style="width:100%;box-sizing:border-box"
            >${esc(e?.description || "")}</textarea>

            <p id="bt-event-error" style="color:#dc2626"></p>

            <div style="display:flex;gap:10px;margin-top:18px">
              <button class="btn" type="submit">
                บันทึกลง MySQL
              </button>
              <button class="btn o" type="button"
                onclick="document.getElementById('md').innerHTML=''">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>`;
  }

  async function save(event, id) {
    event.preventDefault();

    const form = event.target;
    const f = form.elements;
    const error = document.getElementById("bt-event-error");
    const btn = form.querySelector('[type="submit"]');

    const input = {
      title: f.title.value.trim(),
      category: f.category.value,
      location: f.location.value.trim(),
      eventDate: f.eventDate.value + ":00",
      price: Number(f.price.value),
      totalSeats: Number(f.totalSeats.value),
      description: f.description.value.trim()
    };

    if (!Number.isFinite(input.price) || input.price < 0 ||
        !Number.isInteger(input.totalSeats) ||
        input.totalSeats < 1) {
      error.textContent = "กรุณากรอกราคาและจำนวนที่นั่งให้ถูกต้อง";
      return false;
    }

    btn.disabled = true;
    error.textContent = "กำลังบันทึก...";

    try {
      const headers = await csrf();

      await request(
        id ? `/api/admin/events/${id}` : "/api/admin/events",
        {
          method: id ? "PUT" : "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        }
      );

      document.getElementById("md").innerHTML = "";
      await loadAPIEvents();
      refresh();
    } catch (e) {
      error.textContent = "บันทึกไม่สำเร็จ: " + e.message;
    } finally {
      btn.disabled = false;
    }

    return false;
  }

  async function toggle(id, currentStatus, confirmed = false) {
    const next = currentStatus === "ACTIVE"
      ? "INACTIVE" : "ACTIVE";

    const closing = next === "INACTIVE";

    if (!confirmed) {
      const eventData = state.rows.find(
        e => Number(e.id) === Number(id)
      );

      document.getElementById("md").innerHTML = `
        <div class="md">
          <div class="card pad" role="dialog" aria-modal="true"
            style="
              width:min(92vw,460px);
              border-radius:22px;
              padding:28px 24px;
              text-align:center;
              color:#172554;
              box-shadow:0 24px 60px rgba(0,0,0,.18)
            ">

            <div style="
              width:76px;height:76px;
              display:grid;place-items:center;
              border-radius:50%;
              margin:0 auto 18px;
              background:${closing ? "#fee2e2" : "#dcfce7"};
              color:${closing ? "#dc2626" : "#16a34a"};
              font-size:36px;font-weight:700
            ">${closing ? "!" : "✓"}</div>

            <h2 style="font-size:24px;margin:0 0 12px">
              ${closing
                ? "ยืนยันการปิดรับจอง?"
                : "ยืนยันการเปิดรับจอง?"}
            </h2>

            <p style="
              font-weight:700;font-size:16px;
              margin:0 0 18px
            ">
              ${esc(eventData?.title || "Event / Tour")}
            </p>

            <div style="
              background:${closing ? "#fff1f2" : "#f0fdf4"};
              border-radius:14px;
              padding:16px;
              text-align:left;
              line-height:1.8;
              color:#475569;
              margin-bottom:22px
            ">
              ${closing
                ? "เมื่อตั้งสถานะเป็น INACTIVE ลูกค้าจะไม่สามารถจอง Event นี้เพิ่มได้ แต่การจองและการชำระเงินเดิมจะยังอยู่"
                : "เมื่อตั้งสถานะเป็น ACTIVE ลูกค้าจะสามารถจอง Event นี้ได้อีกครั้ง หากยังมีที่นั่งว่าง"}
            </div>

            <p id="bt-event-toggle-error"
              style="color:#dc2626;font-size:13px"></p>

            <div style="display:flex;gap:12px">
              <button type="button"
                class="btn o"
                style="flex:1;border-radius:12px;padding:13px"
                onclick="document.getElementById('md').innerHTML=''">
                ยกเลิก
              </button>

              <button type="button"
                id="bt-event-toggle-confirm"
                style="
                  flex:1;border:0;border-radius:12px;
                  padding:13px;color:white;
                  background:${closing ? "#dc2626" : "#16a34a"};
                  font-weight:700;cursor:pointer
                "
                onclick="BTAdminEvents.toggle(
                  ${Number(id)},'${currentStatus}',true
                )">
                ${closing ? "ปิดรับจอง" : "เปิดรับจอง"}
              </button>
            </div>
          </div>
        </div>
      `;

      return;
    }

    const button = document.getElementById(
      "bt-event-toggle-confirm"
    );

    if (button?.disabled) return;

    if (button) {
      button.disabled = true;
      button.textContent = "กำลังบันทึก...";
    }

    try {
      const headers = await csrf();

      await request(`/api/admin/events/${id}/status`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({status:next})
      });

      document.getElementById("md").innerHTML = "";
      await loadAPIEvents();
      refresh();
    } catch (e) {
      const errorBox = document.getElementById(
        "bt-event-toggle-error"
      );

      if (errorBox) {
        errorBox.textContent =
          "เปลี่ยนสถานะไม่สำเร็จ: " + e.message;
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = closing
          ? "ปิดรับจอง" : "เปิดรับจอง";
      }
    }
  }


  async function history(id) {
    const eventData = state.rows.find(e => Number(e.id) === Number(id));

    const modal = document.getElementById("md");

    modal.innerHTML = `
      <div class="md">
        <div class="card pad" style="
          width:min(95vw,700px);
          max-height:85vh;overflow:auto
        ">
          <h2>ประวัติการแก้ไข Event</h2>
          <p>${esc(eventData?.title || "")}</p>
          <p>กำลังโหลดประวัติจาก MySQL...</p>
        </div>
      </div>`;

    try {
      const rows = await request(`/api/admin/events/${id}/history`);

      const fieldNames = {
        title: "ชื่อ",
        category: "ประเภท",
        description: "รายละเอียด",
        location: "สถานที่",
        eventDate: "วันที่",
        price: "ราคา",
        totalSeats: "จำนวนที่นั่งทั้งหมด",
        availableSeats: "ที่นั่งว่าง",
        status: "สถานะ"
      };

      const items = rows.map(x => `
        <div style="
          padding:14px 0;
          border-bottom:1px solid #e2e8f0;
          overflow-wrap:anywhere
        ">
          <strong>${esc(fieldNames[x.fieldName] || x.fieldName)}</strong>
          <p class="mu" style="font-size:12px;margin:5px 0">
            ${esc(x.changedBy)} ·
            ${esc(String(x.changedAt || "").replace("T"," ").slice(0,19))}
          </p>
          <div style="font-size:14px;margin-top:8px">
            <span style="color:#b91c1c">
              เดิม: ${esc(x.oldValue || "—")}
            </span>
          </div>
          <div style="font-size:14px;margin-top:5px">
            <span style="color:#15803d">
              ใหม่: ${esc(x.newValue || "—")}
            </span>
          </div>
        </div>
      `).join("");

      modal.innerHTML = `
        <div class="md">
          <div class="card pad" style="
            width:min(95vw,700px);
            max-height:85vh;overflow:auto
          ">
            <h2>ประวัติการแก้ไข Event</h2>
            <p><b>${esc(eventData?.title || "")}</b></p>

            ${items || `
              <p class="mu">
                ยังไม่มีประวัติการแก้ไขนับตั้งแต่เปิดใช้ History
              </p>
            `}

            <button class="btn o" type="button"
              style="margin-top:18px"
              onclick="document.getElementById('md').innerHTML=''">
              ปิด
            </button>
          </div>
        </div>`;
    } catch (error) {
      modal.innerHTML = `
        <div class="md">
          <div class="card pad" style="width:min(95vw,500px)">
            <h2>โหลดประวัติไม่สำเร็จ</h2>
            <p style="color:#dc2626">${esc(error.message)}</p>
            <button class="btn o" type="button"
              onclick="document.getElementById('md').innerHTML=''">
              ปิด
            </button>
          </div>
        </div>`;
    }
  }

  function render() {
    if (!state.loaded && !state.loading && !state.error) load();

    if (state.error) return `
      <div class="card pad">
        <p style="color:#dc2626">${esc(state.error)}</p>
        <button class="btn" onclick="BTAdminEvents.refresh()">
          ลองใหม่
        </button>
      </div>`;

    if (!state.loaded) return `
      <div class="card pad">กำลังโหลด Event จาก MySQL...</div>`;

    const rows = [...state.rows].reverse().map(e => `
      <tr>
        <td><b>${esc(e.title)}</b></td>
        <td>${esc(e.category)}</td>
        <td>${esc(e.location)}</td>
        <td>${esc(String(e.eventDate || "").slice(0,10))}</td>
        <td>${money(e.price)}</td>
        <td>${Number(e.availableSeats ?? 0)}
            / ${Number(e.totalSeats ?? 0)}</td>
        <td>
          <span class="badge">${esc(e.status)}</span>
        </td>
        <td>
          <button class="btn sm o"
            onclick="BTAdminEvents.edit(${Number(e.id)})">
            แก้ไข
          </button>
          <button class="btn sm o"
            onclick="BTAdminEvents.history(${Number(e.id)})">
            ประวัติ
          </button>
          <button class="btn sm o"
            onclick="BTAdminEvents.toggle(${Number(e.id)},'${esc(e.status)}')">
            ${e.status === "ACTIVE" ? "ปิดรับจอง" : "เปิดรับจอง"}
          </button>
          <button class="btn sm o" type="button"
            style="color:#dc2626;border-color:#fecaca"
            onclick="BTAdminEvents.deleteEvent(${Number(e.id)})">
            ลบ
          </button>
        </td>
      </tr>
    `).join("");

    return `
      <div class="sh">
        <h2>จัดการ Event / Tour (${state.rows.length})</h2>
        <div class="rw">
          <button class="btn" onclick="BTAdminEvents.edit(0)">
            + เพิ่ม Event / Tour
          </button>
          <button class="btn o" onclick="BTAdminEvents.refresh()">
            โหลดใหม่
          </button>
        </div>
      </div>



      <div class="tw">
        <table>
          <tr>
            <th>ชื่อ</th><th>ประเภท</th><th>สถานที่</th>
            <th>วันที่</th><th>ราคา</th><th>ที่นั่ง</th>
            <th>สถานะ</th><th>จัดการ</th>
          </tr>
          ${rows}
        </table>
      </div>`;
  }

  return {render, refresh, edit, save, toggle, history, deleteEvent};
})();
