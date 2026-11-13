
(function () {
    "use strict";

    const escapeHTML = value => String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const thai = (th, en) =>
        typeof L !== "undefined" && L ? en : th;

    const fmtDate = value => {
        if (!value) return "-";
        const date = new Date(value);

        if (Number.isNaN(date.getTime()))
            return escapeHTML(value);

        return date.toLocaleDateString(
            typeof L !== "undefined" && L ? "en-GB" : "th-TH",
            {year:"numeric",month:"short",day:"numeric"}
        );
    };

    const fmtMoney = value =>
        Number(value || 0).toLocaleString("th-TH") + " ฿";

    const requestDetails = raw => {
        if (!raw) return {};

        if (typeof raw === "object") return raw;

        try {
            return JSON.parse(raw);
        } catch {
            const map={};
            for(const item of String(raw).matchAll(/([A-Za-z]+)=([^,}]+)/g))map[item[1]]=item[2];
            return Object.keys(map).length?map:{other:String(raw)};
        }
    };

    const errorHTML = message =>
        `<div class="card pad">
            <p class="err">${escapeHTML(message)}</p>
            <a class="btn" href="#/login">
                ${thai("เข้าสู่ระบบใหม่","Sign in again")}
            </a>
            <a class="btn o" href="#/requests">
                ${thai("ลองอีกครั้ง","Try again")}
            </a>
        </div>`;

    const getRequests = async () => {

        const session = await fetch("/api/auth/me", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (session.status === 401) {
            ME = null;
            throw new Error(
                thai(
                    "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
                    "Session expired. Please sign in again."
                )
            );
        }

        if (!session.ok) {
            throw new Error(
                "Cannot verify session (HTTP " +
                session.status + ")"
            );
        }

        const user = await session.json();

        if (user.role !== "CUSTOMER") {
            throw new Error(
                thai(
                    "หน้านี้สำหรับบัญชี CUSTOMER เท่านั้น",
                    "This page requires a CUSTOMER account"
                )
            );
        }

        ME = BTAuth.normalize(user);

        const response = await fetch(
            "/api/event-requests/my",
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (response.status === 401) {
            ME = null;
            throw new Error(
                thai(
                    "กรุณาเข้าสู่ระบบใหม่",
                    "Please sign in again"
                )
            );
        }

        if (response.status === 403) {
            throw new Error(
                thai(
                    "เซิร์ฟเวอร์ปฏิเสธสิทธิ์ CUSTOMER (403)",
                    "CUSTOMER access denied (403)"
                )
            );
        }

        if (!response.ok) {
            throw new Error(
                "Cannot load Event Requests (HTTP " +
                response.status + ")"
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Invalid Event Requests API response"
            );
        }

        return data;
    };

    const quoteStatus = status => ({
        SENT: thai('ส่งแล้ว','Sent'), ACCEPTED: thai('ตอบรับแล้ว','Accepted'),
        REJECTED: thai('ปฏิเสธแล้ว','Rejected'),
        REVISED: thai('แก้ไขแล้ว','Revised')
    })[String(status || '').toUpperCase()] || String(status || '');

    const quoteCard = q => `
      <div class="bt-request-quote">
        <div>
          <strong>${thai('ใบเสนอราคาจากผู้จัด','Quotation from organizer')}</strong>
          <p class="mu" style="margin:3px 0">
            ${escapeHTML(q.quotationNumber || '')} ·
            ${escapeHTML(quoteStatus(q.status))} ·
            ${fmtMoney(q.totalAmount)}
          </p>
        </div>
        <button class="btn sm" type="button"
          onclick="BTQuotation.openCustomerFromRequest(${Number(q.id)})">
          ${thai('ดูใบเสนอราคา','View quotation')}
        </button>
      </div>`;

    async function myQuotes() {
        if (!window.BTQuotation || typeof BTQuotation.fetchMy !== 'function') return [];
        return await BTQuotation.fetchMy();
    }

    window.pgReqsAPI = function () {
        Promise.resolve().then(async () => {
            const container = document.getElementById(
                "bt-request-list"
            );

            if (!container) return;

            try {
                const requests = await getRequests();
                // A quotation error must not hide the user's Event Requests.
                let quotes = [], quoteError = false;
                try { quotes = await myQuotes(); } catch(e) {
                    console.warn('Quotation lookup:', e); quoteError = true;
                }

                if (!container.isConnected) return;

                if (!requests.length) {
                    container.innerHTML = `
                        <div class="card pad">
                            <p>${thai(
                                "คุณยังไม่มีคำขอจัด Event",
                                "You have no event requests yet"
                            )}</p>

                        </div>`;
                    return;
                }

                container.innerHTML = requests.map(r => {
                  const requestQuotes = quotes.filter(q => String(q.eventRequestId) === String(r.id));
                  return `
                    <article class="card pad bt-request-card">
                      <div class="bt-request-card-head">
                        <div class="bt-request-card-summary">
                          <h3>${escapeHTML(BTLocale.title(r))}</h3>
                          <p class="mu">#${escapeHTML(r.id)} · ${escapeHTML(BTLocale.category(r.category))} · ${fmtDate(r.requestedDate)}</p>
                        </div>
                        <a class="btn o bt-request-details" href="#/request/${encodeURIComponent(r.id)}">${thai("ดูรายละเอียด","View details")}</a>
                      </div>
                      <div class="bt-request-meta">
                        <p><span class="mu">${thai("สถานะ","Status")}</span><strong>${escapeHTML(BTLocale.status(r.status))}</strong></p>
                        <p><span class="mu">${thai("สถานที่","Location")}</span><span>${escapeHTML(BTLocale.place(r.location))}</span></p>
                      </div>
                      ${requestQuotes.length ? `<section class="bt-request-quotes" aria-label="${thai('ใบเสนอราคา','Quotations')}">${requestQuotes.map(quoteCard).join('')}</section>` : ''}
                    </article>`;
                }).join("");

            } catch (error) {
                if (container.isConnected)
                    container.innerHTML = errorHTML(error.message);
            }
        });

        return `
            <div class="w bt-customer-requests" style="padding-top:24px;max-width:1000px">
              <style>
              .bt-customer-requests .bt-request-actions{gap:16px;margin-bottom:16px}
              .bt-customer-requests .bt-request-actions h1{margin:0}
              .bt-customer-requests .bt-request-quotation-nav{margin-bottom:20px}
              .bt-customer-requests .bt-request-card{margin-bottom:20px}
              .bt-customer-requests .bt-request-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
              .bt-customer-requests .bt-request-card-summary{min-width:0}
              .bt-customer-requests .bt-request-card-summary h3{margin:0 0 8px;overflow-wrap:anywhere}
              .bt-customer-requests .bt-request-card-summary p{margin:0;line-height:1.6}
              .bt-customer-requests .bt-request-details{flex:none;white-space:nowrap;margin:0}
              .bt-customer-requests .bt-request-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0 0}
              .bt-customer-requests .bt-request-meta p{display:flex;flex-direction:column;gap:6px;margin:0;min-width:0;overflow-wrap:anywhere}
              .bt-customer-requests .bt-request-quotes{display:grid;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--ln)}
              .bt-customer-requests .bt-request-quote{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;width:100%;box-sizing:border-box;margin:0;padding:16px}
              .bt-customer-requests .bt-request-quote>div{min-width:0;overflow-wrap:anywhere}
              .bt-customer-requests .bt-request-quote .btn{margin:0;white-space:nowrap}
              @media(max-width:600px){
                .bt-customer-requests .bt-request-card-head{flex-direction:column;gap:14px}
                .bt-customer-requests .bt-request-meta{grid-template-columns:1fr}
                .bt-customer-requests .bt-request-quote{grid-template-columns:minmax(0,1fr);gap:12px}
                .bt-customer-requests .bt-request-quote .btn{justify-self:start}
              }
              </style>
                <div class="bt-request-actions"><h1>${thai(
                    "คำขอ Event ของฉัน",
                    "My Event Requests"
                )}</h1>
                    <a class="btn" href="#/custom">
                        ${thai(
                            "ส่งคำขอจัด Event ใหม่",
                            "New Event Request"
                        )}
                    </a></div>
                <div class="bt-request-quotation-nav">
                   <a class="btn o" href="#/quotations">${thai("ใบเสนอราคาของฉัน","My Quotations")}</a>
                </div>
                <div id="bt-request-list">
                    <p class="mu">${thai(
                        "กำลังโหลดข้อมูลจาก MySQL...",
                        "Loading requests..."
                    )}</p>
                </div>
            </div>`;
    };

    window.pgReqAPI = function (id) {
        Promise.resolve().then(async () => {
            const container = document.getElementById(
                "bt-request-detail"
            );

            if (!container) return;

            try {
                const requests = await getRequests();

                if (!container.isConnected) return;

                const request = requests.find(
                    r => String(r.id) === String(id)
                );

                if (!request) {
                    container.innerHTML = errorHTML(
                        thai(
                            "ไม่พบคำขอนี้ในบัญชีของคุณ",
                            "Request not found in your account"
                        )
                    );
                    return;
                }

                let quotes = [];
                try { quotes = await myQuotes(); }
                catch(e) { console.warn('Quotation lookup:', e); }
                const requestQuotes = quotes.filter(q =>
                    String(q.eventRequestId) === String(request.id));
                const d = requestDetails(request.additionalDetails);
                const filesResponse=await fetch(`/api/event-requests/${encodeURIComponent(id)}/files`,{credentials:"same-origin",cache:"no-store"});
                const files=filesResponse.ok?await filesResponse.json():[];
                const fileMarkup=files.map(f=>`<a class="bt-file-item" target="_blank" rel="noopener" href="/api/media/${Number(f.id)}">${escapeHTML(f.fileName||'Attachment')}</a>`).join("");

                const fields = [
                    [thai("ประเภทงาน","Category"),BTLocale.category(request.category)],
                    [thai("สถานที่","Location"),BTLocale.place(request.location)],
                    [thai("วันจัดงาน","Event date"),
                        fmtDate(request.requestedDate)],
                    [thai("วันจบงาน","End date"), fmtDate(request.endDate || request.requestedDate)],
                    [thai("จำนวนผู้ร่วมงาน","Guests"),
                        Number(request.guestCount || 0).toLocaleString("th-TH")],
                    [thai("งบประมาณ","Budget"),
                        fmtMoney(request.budget)],
                    [thai("เวลาเริ่ม","Start time"),d.startTime],
                    [thai("เวลาสิ้นสุด","End time"),d.endTime],
                    [thai("ธีม","Theme"),d.theme],
                    [thai("อุปกรณ์/บริการ","Equipment"),d.equipment],
                    [thai("ผู้ติดต่อ","Contact"),d.contactName],
                    [thai("โทรศัพท์","Phone"),d.contactPhone],
                    [thai("อีเมล","Email"),d.contactEmail],
                    [thai("รายละเอียดเพิ่มเติม","Other"),d.other]
                ];

                const rows = fields
                    .filter(([label, value]) =>
                        value !== null &&
                        value !== undefined &&
                        value !== ""
                    )
                    .map(([label, value]) => `
                        <tr>
                            <th>${escapeHTML(label)}</th>
                            <td>${escapeHTML(value)}</td>
                        </tr>
                    `).join("");

                container.innerHTML = `
                    <div class="card pad">
                        <h2>${escapeHTML(BTLocale.title(request))}</h2>
                        <p>
                            ${thai("สถานะ","Status")}:
                            <strong>${escapeHTML(BTLocale.status(request.status))}</strong>
                        </p>
                        <div class="tw">
                            <table>${rows}</table>
                        </div>
                        <h3>${thai("ใบเสนอราคา","Quotations")}</h3>
                        ${requestQuotes.length ? requestQuotes.map(quoteCard).join('') :
                          `<p class="mu">${thai("ยังไม่มีใบเสนอราคาที่ส่งถึงคำขอนี้","No sent quotation for this request yet")}</p>`}
                        <a class="btn o sm" href="#/quotations">${thai("ดูใบเสนอราคาทั้งหมด","All my quotations")}</a>
                        <h3>${thai("ไฟล์แนบ","Attachments")}</h3>
                        <div class="bt-files">${fileMarkup||thai("ไม่มีไฟล์แนบ","No attachments")}</div>
                        <h3>${thai("รายละเอียดงาน","Description")}</h3>
                        <p style="white-space:pre-wrap">${
                            escapeHTML(request.description || "-")
                        }</p>
                    </div>`;

            } catch (error) {
                if (container.isConnected)
                    container.innerHTML = errorHTML(error.message);
            }
        });

        return `
            <div class="w" style="padding-top:24px;max-width:900px">
                <a href="#/requests">
                    ← ${thai("คำขอทั้งหมด","All requests")}
                </a>
                <h1>${thai(
                    "รายละเอียดคำขอ Event",
                    "Event Request Details"
                )} #${escapeHTML(id)}</h1>
                <div id="bt-request-detail">
                    <p class="mu">${thai(
                        "กำลังโหลดข้อมูล...",
                        "Loading..."
                    )}</p>
                </div>
            </div>`;
    };
})();
