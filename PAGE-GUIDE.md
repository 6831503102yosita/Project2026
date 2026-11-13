# BlueTrail frontend file guide

This is a folder reorganization of the uploaded frontend. It keeps the existing hash routes, markup, CSS, role checks and API calls. Pages are JavaScript render functions, not separate HTML documents. `index.html` remains the entry point. Classic scripts load in their original statement order and share the original global scope. Do not add async/defer or reorder the page scripts independently.

## Installation in Cloud Shell

Upload `bluetrail-page-folders.zip`, then run:

```bash
unzip bluetrail-page-folders.zip -d ~/bluetrail-page-folders
python3 ~/bluetrail-page-folders/install-page-folders.py ~/bluetrail-deploy/backend
```

The installer checks the uploaded source hashes before editing, backs up the static directory, writes the organized files and removes the old relocated JS files. It aborts if source files changed. It does not deploy or run Git. An existing `.bak` file is left untouched; it is not part of this package.

## Page map / หน้าที่ของไฟล์

All paths below are relative to `backend/src/main/resources/static/`.

| File | Page / responsibility |
| --- | --- |
| index.html | จุดเข้าเว็บ, โครง HTML และ CSS เดิม, โหลดสคริปต์ตามลำดับ |
| js/public/home-and-tours.js | Home, Tour / Event list, filters, legacy event details |
| js/public/tour-details.js | View trip: API tour/event details and card |
| js/public/event-api.js | API สำหรับข้อมูล Tour / Event |
| js/public/search-suggestions.js | คำแนะนำการค้นหา |
| js/customer/create-booking.js | แบบฟอร์มจอง Tour / Event |
| js/customer/bookings-and-payment.js | ฟังก์ชันหน้า bookings/payment เดิมที่ยังเก็บไว้ |
| js/customer/event-requests.js | ฟอร์ม Create Event Request และหน้าคำขอเดิม |
| js/customer/customer-event-requests.js | My Event Requests และรายละเอียดคำขอจาก API |
| js/admin/dashboard.js | โครง Admin Dashboard, เลือกเมนู, รายละเอียดคำขอเดิม |
| js/admin/admin-overview.js | Admin Overview / สถิติ |
| js/admin/admin-event-management.js | Events / Tours: เพิ่ม แก้ไข จัดการข้อมูล |
| js/admin/admin-event-requests.js | Admin Event Requests / ตรวจสอบคำขอ |
| js/admin/event-decision-mail.js | ฟอร์มและการส่งเมลผลการพิจารณา |
| js/organizer/assigned-work.js | ฟังก์ชันหน้า Organizer เดิม; หน้าใช้งานปัจจุบันเรียก BTBusiness.organizerPage ใน shared/business-mysql-ui.js |
| js/shared/account-and-auth.js | Account, Login, Register render functions |
| js/shared/auth-api.js | เข้าสู่ระบบ สมัครสมาชิก และ session |
| js/shared/booking-api.js | My Bookings และ Admin Bookings ใช้ร่วมกัน |
| js/shared/payment-ui.js | หน้า/หน้าต่างชำระเงิน, สลิป และ Admin Payment Verification |
| js/shared/quotation-mysql-ui.js | Admin Quotations และ My Quotations |
| js/shared/business-mysql-ui.js | Organizer assigned work/progress, Admin Users/Organizers/Contact และข้อมูลธุรกิจที่ใช้ร่วมกัน |
| js/shared/event-request-changes.js | Change Requests / ประวัติและการพิจารณา Customer/Admin |
| js/shared/company-banks.js | ข้อมูลบัญชีรับชำระเงิน |
| js/shared/experience-ui.js | การตกแต่งหน้าและ UI ที่หลาย role ใช้ร่วมกัน |
| js/shared/locale-display.js | ภาษาและรูปแบบข้อความ |
| js/shared/bluetrail-i18n-modal-fix.js | ภาษาและหน้าต่าง modal ที่ใช้ร่วมกัน |
| js/shared/app-core.js | state, helpers, translations, navigation, footer และโหลด events |
| js/shared/quotation-views.js | quotation/PDF helpers และฟังก์ชันมุมมองเดิม |
| js/shared/payment-and-change-views.js | payment/change helpers และ handlers เดิม |
| js/shared/router-and-actions.js | hash router, draw, event actions และเริ่มต้นแอป |
| css/experience.css | CSS ของ experience UI เดิม |
| css/travel-polish.css | CSS การแสดง tour cards เดิม |

Some source modules support more than one role, so they remain in shared rather than being duplicated. The current Organizer renderer remains in that shared module; assigned-work.js is the retained older renderer. No new features, permission changes, database changes, email changes or design changes are included.

## Validation

Every external and remaining inline JavaScript passed `node --check`. The extracted main script concatenates byte-for-byte to the original script. All local script references resolve. Installation, repeat installation, and refusal on modified source are tested. Browser verification was attempted, but Chromium could not launch because the environment denied socket creation (Operation not permitted). Live UI and backend integration still require a smoke check in the real environment before deploying.
