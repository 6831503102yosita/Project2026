
window.BTAdminRequests = (() => {
  let requests = [];
  let loaded = false;
  let error = "";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  }[ch]));

  async function load() {
    try {
      const response = await fetch("/api/admin/event-requests", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid API response");
      }

      requests = data;
      loaded = true;
      error = "";
    } catch (e) {
      error = e.message;
    }
  }

  async function reload() {
    loaded = false;
    error = "";
    draw();
    await load();
    draw();
  }

  function render({L}) {
    const title = L ? "Event Requests" : "คำขอจัด Event";
    const button = `<button class="btn sm o"
      onclick="BTAdminRequests.reload()">
      ${L ? "Refresh" : "โหลดข้อมูลใหม่"}
    </button>`;

    if (error) {
      return `<div class="card pad">
        <h3>${title}</h3>
        <p class="err">API: ${esc(error)}</p>
        ${button}
      </div>`;
    }

    if (!loaded) {
      return `<div class="card pad">
        <h3>${title}</h3>
        <p>Loading Event Requests...</p>
        ${button}
      </div>`;
    }

    const rows = requests.map(r => `
      <tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.customerName)}</td>
        <td>${esc(r.title)}</td>
        <td>${esc(String(r.requestedDate || "").slice(0,10))}</td>
        <td>${esc(r.location)}</td>
        <td>${esc(r.guestCount)}</td>
        <td>${esc(r.budget)}</td>
        <td><span class="badge">${esc(r.status)}</span></td>
        <td>
          <button class="btn sm"
            onclick="A.show(BTAdminRequests.details(${Number(r.id)}))">
            ${L ? "Open" : "เปิด"}
          </button>
        </td>
      </tr>
    `).join("");

    return `
      <div class="sh">
        <h3>${title} (${requests.length})</h3>
        ${button}
      </div>
      ${requests.length ? `
      <div class="tw">
        <table>
          <tr>
            <th>ID</th>
            <th>${L ? "Customer" : "ลูกค้า"}</th>
            <th>${L ? "Event" : "ชื่องาน"}</th>
            <th>${L ? "Date" : "วันที่"}</th>
            <th>${L ? "Location" : "สถานที่"}</th>
            <th>${L ? "Guests" : "จำนวนคน"}</th>
            <th>${L ? "Budget" : "งบประมาณ"}</th>
            <th>${L ? "Status" : "สถานะ"}</th>
            <th></th>
          </tr>
          ${rows}
        </table>
      </div>` : `<p>${L ? "No requests" : "ไม่มีคำขอ"}</p>`}
    `;
  }

  function details(id) {
    const r = requests.find(x => x.id === id);
    if (!r) return "<p>Request not found</p>";

    const fields = [
      ["ID", r.id],
      ["Event", r.title],
      ["Customer", r.customerName],
      ["Email", r.customerEmail],
      ["Phone", r.customerPhone],
      ["Category", r.category],
      ["Date", r.requestedDate],
      ["Location", r.location],
      ["Guests", r.guestCount],
      ["Budget", r.budget],
      ["Description", r.description],
      ["Additional details", r.additionalDetails],
      ["Status", r.status]
    ];

    return `<div class="card pad">
      <h2>${esc(r.title)}</h2>
      ${fields.map(([key,value]) =>
        `<p><b>${esc(key)}:</b> ${esc(value)}</p>`
      ).join("")}
    </div>`;
  }


  const statuses = [
    ["pending", "Pending"],
    ["review", "Under Review"],
    ["info", "Need More Information"],
    ["confirm", "Waiting for Confirmation"],
    ["confirmed", "Confirmed"],
    ["cancel", "Cancelled"]
  ];

  function enhancedDetails(id) {
    const r = requests.find(x => Number(x.id) === Number(id));
    if (!r) return "<p>Request not found</p>";

    const options = statuses.map(([value, label]) =>
      `<option value="${value}" ${r.status === value ? "selected" : ""}>
        ${label}
      </option>`
    ).join("");

    return details(id) + `
      <div class="card pad" style="margin-top:16px">
        <h3>Update Event Request Status</h3>
        <label>Status</label>
        <select id="bt-admin-status">${options}</select>
        <button class="btn" style="margin-top:12px"
          onclick="BTAdminRequests.updateStatus(${Number(id)})">
          Save Status
        </button>
        <p id="bt-admin-status-message"></p>
      </div>
    `;
  }

  async function updateStatus(id) {
    const select = document.getElementById("bt-admin-status");
    const message = document.getElementById("bt-admin-status-message");

    if (!select || !message) return;

    const status = select.value;

    if (!statuses.some(([value]) => value === status)) {
      message.textContent = "Invalid status";
      return;
    }

    message.textContent = "Saving...";

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        credentials: "same-origin"
      });

      if (!csrfResponse.ok) {
        throw new Error("Cannot get CSRF token: HTTP " + csrfResponse.status);
      }

      const csrf = await csrfResponse.json();

      if (!csrf.token || !csrf.headerName) {
        throw new Error("CSRF token response is incomplete");
      }

      const response = await fetch(
        "/api/admin/event-requests/" + encodeURIComponent(id) + "/status",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            [csrf.headerName]: csrf.token
          },
          body: JSON.stringify({status})
        }
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      await load();

      message.textContent = "Status saved successfully";

      if (typeof draw === "function") draw();

    } catch (error) {
      message.textContent = "Save failed: " + error.message;
      console.error("BlueTrail status update:", error);
    }
  }

  return {
    load,
    reload,
    render,
    details: enhancedDetails,
    updateStatus
  };

})();
