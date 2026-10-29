
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
            return {other: String(raw)};
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

    window.pgReqsAPI = function () {
        Promise.resolve().then(async () => {
            const container = document.getElementById(
                "bt-request-list"
            );

            if (!container) return;

            try {
                const requests = await getRequests();

                if (!container.isConnected) return;

                if (!requests.length) {
                    container.innerHTML = `
                        <div class="card pad">
                            <p>${thai(
                                "คุณยังไม่มีคำขอจัด Event",
                                "You have no event requests yet"
                            )}</p>
                            <a class="btn" href="#/custom">
                                ${thai(
                                    "ส่งคำขอจัด Event",
                                    "Create Event Request"
                                )}
                            </a>
                        </div>`;
                    return;
                }

                container.innerHTML = requests.map(r => `
                    <div class="card pad" style="margin-bottom:14px">
                        <h3>${escapeHTML(r.title)}</h3>
                        <p class="mu">
                            #${escapeHTML(r.id)} ·
                            ${escapeHTML(r.category)} ·
                            ${fmtDate(r.requestedDate)}
                        </p>
                        <p>
                            ${thai("สถานะ","Status")}:
                            <strong>${escapeHTML(r.status)}</strong>
                        </p>
                        <p>
                            ${thai("สถานที่","Location")}:
                            ${escapeHTML(r.location)}
                        </p>
                        <a class="btn o"
                           href="#/request/${encodeURIComponent(r.id)}">
                            ${thai("ดูรายละเอียด","View details")}
                        </a>
                    </div>
                `).join("");

            } catch (error) {
                if (container.isConnected)
                    container.innerHTML = errorHTML(error.message);
            }
        });

        return `
            <div class="w" style="padding-top:24px;max-width:900px">
                <h1>${thai(
                    "คำขอ Event ของฉัน",
                    "My Event Requests"
                )}</h1>
                <p>
                    <a class="btn" href="#/custom">
                        ${thai(
                            "ส่งคำขอจัด Event ใหม่",
                            "New Event Request"
                        )}
                    </a>
                </p>
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

                const d = requestDetails(
                    request.additionalDetails
                );

                const fields = [
                    [thai("ประเภทงาน","Category"),request.category],
                    [thai("สถานที่","Location"),request.location],
                    [thai("วันจัดงาน","Event date"),
                        fmtDate(request.requestedDate)],
                    [thai("จำนวนผู้ร่วมงาน","Guests"),
                        request.guestCount],
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
                        <h2>${escapeHTML(request.title)}</h2>
                        <p>
                            ${thai("สถานะ","Status")}:
                            <strong>${escapeHTML(request.status)}</strong>
                        </p>
                        <div class="tw">
                            <table>${rows}</table>
                        </div>
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
