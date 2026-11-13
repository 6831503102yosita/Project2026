function pgApiBook(id) {
  if (!ME) {
    go('/login');
    return '';
  }

  if (ME.role !== 'customer') return lock();

  if (!API_EVENTS) {
    return `<div class="w pg">
      <p>กำลังโหลด Event จาก MySQL...</p>
    </div>`;
  }

  const e = API_EVENTS.find(x => Number(x.id) === Number(id));

  if (!e) {
    return `<div class="w pg">
      <h2>ไม่พบ Event ในฐานข้อมูล</h2>
      <a class="btn" href="#/events">${L?'Back to tours and events':'กลับไปดูทัวร์และอีเวนต์'}</a>
    </div>`;
  }

  if (e.arch || e.seats < 1) {
    return `<div class="w pg">
      <h2>Event นี้ยังไม่เปิดให้จองหรือที่นั่งเต็ม</h2>
      <a class="btn" href="#/events">${L?'Back to tours and events':'กลับไปดูทัวร์และอีเวนต์'}</a>
    </div>`;
  }

  return `<div class="w" style="padding-top:24px;max-width:760px">
    <a href="#/events">← ${L?'Back to tours and events':'กลับไปดูทัวร์และอีเวนต์'}</a>
    <h1 style="margin-top:16px">${L?'Book':'จอง'} ${Z(nm(e))}</h1>

    <div class="card pad">
      <p><b>${L?'Price':'ราคา'}:</b> <span class="bt-price">${fm(e.price)}</span> / ${L?'person':'คน'}</p>
      <p><b>${L?'Available seats':'ที่นั่งว่าง'}:</b> ${e.seats}</p>
      <p><b>${L?'Date':'วันที่'}:</b> ${dt(e.date)}</p>

      <form data-booking-id="${Number(e.id)}" onsubmit="return A.apiBook(event,${Number(e.id)})">
        <label>${L?'Number of seats':'จำนวนที่นั่ง'}</label>
        <input name="qty" type="number"
          min="1" max="${e.seats}" value="1" required
          oninput="document.getElementById('bt-book-total').textContent=(L?'Amount due: ':'ยอดชำระ: ')+new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(Number(this.value||0)*${Number(e.price)})">

        <p style="font-size:1.3rem;font-weight:800;color:var(--tx)" id="bt-book-total">
          ${L?'Amount due:':'ยอดชำระ:'} ${fm(e.price)}
        </p>
        <div class="fg"><div><label>${L?'Full name':'ชื่อ-นามสกุลผู้จอง'} *</label><input name="contactName" value="${Z(ME.name)}" required maxlength="100"></div><div><label>${L?'Phone':'เบอร์โทรศัพท์'} *</label><input name="contactPhone" type="tel" value="${Z(ME.phone||'')}" required maxlength="30"></div><div><label>${L?'Email':'อีเมล'} *</label><input name="contactEmail" type="email" value="${Z(ME.email)}" required maxlength="160"></div></div>
        ${BTBanks.fields('',true)}
        <p class="mu">${L?'Please complete payment within 30 minutes of booking, or the reserved seats will be released.':'กรุณาชำระภายใน 30 นาทีหลังจอง มิฉะนั้นระบบจะคืนที่นั่งโดยอัตโนมัติ'}</p>
        <label>${L?'Payment slip (optional now; submit within 30 minutes)':'แนบสลิปชำระเงิน (แนบตอนนี้หรือภายใน 30 นาที)'}</label>
        <input name="slip" type="file" accept="image/jpeg,image/png,image/webp">
        <p class="mu">${L?'Reserve seats and upload a payment slip on the same page.':'จองที่นั่งและแนบสลิปได้ในหน้าเดียว'}</p>

        <p class="err" id="er"></p>

        <button class="btn" type="submit">
          ${L?'Confirm booking':'ยืนยันการจอง'}
        </button>
      </form>
    </div>
  </div>`;
}

