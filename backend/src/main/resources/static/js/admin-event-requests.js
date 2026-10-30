
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
    const r = requests.find(x => Number(x.id) === Number(id));
    if(!r)return '<p>Request not found</p>';
    let d={};
    try{d=JSON.parse(r.additionalDetails||'{}');}catch{
      for(const match of String(r.additionalDetails||'').matchAll(/([A-Za-z]+)=([^,}]+)/g))d[match[1]]=match[2];
    }
    const en=typeof L!=='undefined'&&Boolean(L);
    const val=v=>v===null||v===undefined||v===''?'-':esc(v);
    const sections=[
      [en?'Event information':'ข้อมูลงาน',[[en?'Event title':'ชื่องาน',r.title],[en?'Category':'ประเภทงาน',r.category],[en?'Event date':'วันที่จัดงาน',r.requestedDate?String(r.requestedDate).slice(0,10):''],[en?'Start time':'เวลาเริ่ม',d.startTime||d.st||((String(r.requestedDate||'').slice(11,16)!=='00:00')?String(r.requestedDate||'').slice(11,16):'')],[en?'End time':'เวลาสิ้นสุด',d.endTime||d.et],[en?'Location':'สถานที่',r.location],[en?'Guests':'จำนวนผู้ร่วมงาน',r.guestCount],[en?'Budget':'งบประมาณ',r.budget]]],
      [en?'Contact information':'ข้อมูลผู้ติดต่อ',[[en?'Customer':'ลูกค้า',r.customerName],[en?'Email':'อีเมล',d.contactEmail||r.customerEmail],[en?'Phone':'เบอร์โทร',d.contactPhone||d.phone||r.customerPhone]]],
      [en?'Additional information':'รายละเอียดเพิ่มเติม',[[en?'Theme':'ธีม',d.theme],[en?'Equipment':'อุปกรณ์',d.equipment],[en?'Description':'คำอธิบาย',r.description]]]
    ];
    return `<div class="card pad"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2>${val(r.title)}</h2></div><span class="badge">${val(r.status)}</span>
      ${sections.map(([heading,rows])=>`<h3 style="margin:22px 0 10px">${heading}</h3><div class="tw"><table class="bt-request-data"><tbody>${rows.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${val(v)}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>`;
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

    Promise.resolve().then(async()=>{
      const target=document.getElementById("bt-admin-attachments");
      if(!target)return;
      try{
        const response=await fetch(`/api/admin/event-requests/${Number(id)}/files`,{credentials:"same-origin"});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const files=await response.json();
        if(target.isConnected) target.innerHTML=files.length?`<div class="bt-file-gallery">`+files.map(f=>`<a class="bt-file-preview" target="_blank" rel="noopener" href="/api/media/${Number(f.id)}">${String(f.contentType||'').startsWith('image/')?`<img loading="lazy" alt="${esc(f.fileName||'Image')}" src="/api/media/${Number(f.id)}">`:`<div style="height:110px;display:grid;place-items:center;font-size:42px">📄</div>`}<span>${esc(f.fileName||'Attachment')}</span></a>`).join('')+`</div>`:(typeof L!=='undefined'&&L?'No attachments':'ไม่มีไฟล์แนบ');
      }catch(error){if(target.isConnected)target.textContent=error.message;}
    });
    return details(id) + `<div class="card pad" style="margin-top:12px"><h3>${typeof L!=='undefined'&&L?'Attachments':'ไฟล์แนบจากลูกค้า'}</h3><div id="bt-admin-attachments" aria-live="polite">Loading...</div><p class="mu">${typeof L!=='undefined'&&L?'Only authorized users can view these files.':'ไฟล์เปิดดูได้เฉพาะผู้มีสิทธิ์'}</p><button class="btn o sm" onclick="BTAdminRequests.quote(${Number(id)})">${typeof L!=='undefined'&&L?'Create quotation for this request':'จัดทำใบเสนอราคาจากคำขอนี้'}</button></div>
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
    updateStatus,
    quote(id){document.getElementById('md').innerHTML='';AT='qt';draw();BTQuotation.createForRequest(id);}
  };

})();
