function apiEventCard(e) {
  return `<article class="card ev bt-travel-product"><a class="im" href="#/api-detail/${Number(e.id)}"><img src="${Z(e.imageUrl || img(e.theme))}" alt="${Z(nm(e))}" loading="lazy"><span class="bt-product-category">${t(e.cat)}</span></a><div class="bd"><div class="bt-product-location">${ic('pin')} ${Z(BTLocale.place(e.location||e.loc||P[e.prov]?.[L]||''))}</div><h3><a href="#/api-detail/${Number(e.id)}">${Z(nm(e))}</a></h3><p class="mu">${ic('cal')} ${dt(e.date)}${e.st?' · '+Z(e.st):''}</p><p class="bt-availability">${ic('seat')} ${e.seats>0?(L?e.seats+' seats available':'เหลือ '+e.seats+' ที่นั่ง'):t('full')}</p><div class="bt-product-bottom"><div><small class="mu">${L?'From / person':'เริ่มต้น / คน'}</small><div class="pr"><b>${fm(e.price)}</b></div></div><a class="btn sm" href="#/api-detail/${Number(e.id)}">${L?'View trip':'ดูรายละเอียด'} ${ic('arr')}</a></div></div></article>`;
}


function pgApiDetail(id) {
  if (!API_EVENTS) {
    return `<div class="w" style="padding:50px 0">
      <h2>กำลังโหลดรายละเอียดจาก MySQL...</h2>
    </div>`;
  }

  const e = API_EVENTS.find(x => Number(x.id) === Number(id));

  if (!e) {
    return `<div class="w" style="padding:50px 0">
      <h2>ไม่พบ Event / Tour นี้</h2>
      <a class="btn" href="#/events">กลับไปดูรายการทั้งหมด</a>
    </div>`;
  }

  const active = !e.arch;
  const bookable = active && Number(e.seats) > 0;

  const province = P[e.prov]
    ? P[e.prov][L]
    : (e.prov || '-');

  const region = R[e.region]
    ? R[e.region][L]
    : '';

  const original = Number(e.orig || 0);
  const discounted = original > Number(e.price);

  const description = ds(e) || '';

  return `
    <div class="w" style="padding-top:28px;padding-bottom:60px">
      <a href="#/events"
        style="display:inline-block;margin-bottom:22px">
        ← ${L ? 'All tours & events' : 'กลับไปยังทัวร์และอีเวนต์'}
      </a>

      <div class="two" style="align-items:start;gap:28px">

        <div>
          <img
            src="${Z(e.imageUrl || img(e.theme))}"
            alt="${Z(nm(e))}"
            style="
              width:100%;aspect-ratio:16/10;object-fit:cover;
              border-radius:20px;display:block
            "
          >

          <div class="card pad" style="margin-top:20px">
            <h3>${L ? 'About this experience' : 'รายละเอียดกิจกรรม'}</h3>
            <p style="
              line-height:1.9;color:#475569;
              white-space:pre-line
            ">${Z(description)}</p>
          </div>
        </div>

        <div>
          <span class="tag">${t(e.cat)}</span>

          <h1 style="margin:14px 0 10px;line-height:1.3">
            ${Z(nm(e))}
          </h1>



          <div class="card pad" style="
            margin-top:18px;line-height:2.1
          ">
            <div>${ic('cal')} <b>${t('date')}:</b> ${dt(e.date)}</div>

            <div>${ic('clock')} <b>${L?'Time':'เวลา'}:</b>
              ${Z(e.st || '-')}
              ${e.et ? ' – ' + Z(e.et) : ''}
            </div>

            <div>${ic('pin')} <b>${L?'Location':'สถานที่'}:</b>
              ${Z(province)}
              ${region ? ' · ' + Z(region) : ''}
            </div>

            <div>${ic('seat')} <b>${L?'Seats available':'ที่นั่งว่าง'}:</b>
              ${Number(e.seats)}
            </div>

            <hr>

            <p style="color:#64748b;margin:0">
              ${L?'Price per person':'ราคาต่อคน'}
            </p>

            <div style="
              display:flex;align-items:center;gap:12px;
              flex-wrap:wrap;margin:6px 0 18px
            ">
              <strong style="
                font-size:30px;color:var(--tx);text-shadow:0 0 0 currentColor
              ">${fm(e.price)}</strong>

              ${discounted ? `
                <s style="color:#94a3b8">
                  ${fm(original)}
                </s>
              ` : ''}
            </div>

            ${bookable ? `
              <a class="btn"
                href="#/api-book/${Number(e.id)}"
                style="
                  display:block;text-align:center;
                  padding:15px;border-radius:12px
                ">
                ${L?'Book now':'จองเลย'} →
              </a>
            ` : `
              <div style="
                background:#fee2e2;color:#b91c1c;
                padding:14px;border-radius:12px;
                text-align:center;font-weight:700
              ">
                ${!active
                  ? (L?'Booking closed':'ปิดรับจอง')
                  : (L?'Fully booked':'ที่นั่งเต็ม')}
              </div>
            `}

            <p class="mu" style="
              margin:14px 0 0;font-size:13px
            ">
              ${L
                ? 'Availability and price will be checked again when booking.'
                : 'จำนวนที่นั่งและราคาจะได้รับการยืนยันเมื่อทำรายการ'}
            </p>
          </div>
        </div>
      </div>
    </div>`;
}

