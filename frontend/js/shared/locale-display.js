/* Display translations only. API codes and customer data stay unchanged. */
window.BTLocale = (() => {
  const en = () => typeof L !== 'undefined' && !!L;
  const text = (th, eng) => en() ? eng : th;

  const states = {
    SENT: ['ส่งแล้ว', 'Sent'],
    DRAFT: ['ฉบับร่าง', 'Draft'],
    ACCEPTED: ['ตอบรับแล้ว', 'Accepted'],
    PENDING: ['รอดำเนินการ', 'Pending'],
    CONFIRM: ['รอลูกค้ายืนยัน', 'Awaiting customer confirmation'],
    CONFIRMED: ['ยืนยันแล้ว', 'Confirmed'],
    ASSIGNED: ['รับมอบหมาย', 'Assigned'],
    PROGRESS: ['กำลังดำเนินการ', 'In progress'],
    DONE: ['เสร็จแล้ว', 'Completed'],
    EXPIRED: ['หมดอายุ', 'Expired'],
    CANCELLED: ['ยกเลิก', 'Cancelled'],
    REJECTED: ['ปฏิเสธ', 'Rejected'],
    APPROVED: ['อนุมัติแล้ว', 'Approved'],
    ACTIVE: ['เปิดรับจอง', 'Open for bookings'],
    CLOSED: ['ปิดรับจอง', 'Closed for bookings'],
    CUSTOMER: ['ลูกค้า', 'Customer'],
    ORGANIZER: ['ผู้จัดงาน', 'Organizer'],
    ADMIN: ['ผู้ดูแลระบบ', 'Admin']
  };

  const status = v => {
    const pair = states[String(v || '').toUpperCase()];
    return pair ? pair[en() ? 1 : 0] : String(v || '');
  };

  const category = v => {
    const key = String(v || '').toLowerCase();

    if (typeof TY !== 'undefined' && TY[key]) {
      return TY[key][en() ? 1 : 0];
    }

    const categories = {
      tour: ['ทัวร์', 'Tour'],
      event: ['อีเวนต์', 'Event']
    };

    return categories[key]?.[en() ? 1 : 0] || String(v || '');
  };

  const place = v => {
    const raw = String(v || '');
    const pairs = [
      ...(typeof P !== 'undefined' ? Object.values(P) : []),
      ['กำแพงเพชร', 'Kamphaeng Phet'],
      ['ลำปาง', 'Lampang'],
      ['เชียงแสน', 'Chiang Saen'],
      ['กรุงเทพมหานคร', 'Bangkok'],
      ['กรุงเทพ', 'Bangkok']
    ];

    const key = raw.trim().toLowerCase()
      .replace(/^(?:จังหวัด\s*|จ\.\s*)/, '');

    const pair = pairs.find(p =>
      p[0].toLowerCase() === key ||
      p[1].toLowerCase() === key
    );

    return pair ? pair[en() ? 1 : 0] : raw;
  };

  const title = row => {
    if (en()) {
      return row.titleEn ||
        row.eventTitleEn ||
        (typeof BTNames !== 'undefined'
          ? BTNames[row.title || row.eventTitle]
          : '') ||
        row.title ||
        row.eventTitle ||
        '';
    }

    return row.title ||
      row.eventTitle ||
      row.titleEn ||
      row.eventTitleEn ||
      '';
  };

  const thaiTime = v => {
    if (!v) return '—';

    let raw = String(v).trim().replace(' ', 'T');

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) raw += 'Z';

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return String(v);

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(parsed);

    const get = k => parts.find(p => p.type === k)?.value;

    return `${get('day')}/${get('month')}/${get('year')} ` +
      `${get('hour')}:${get('minute')} ` +
      text('(เวลาไทย)', '(Thai time)');
  };

  const eventDate = v => {
    const raw = String(v || '');
    const m = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/
    );

    if (!m) return raw || '—';

    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (Number.isNaN(d.getTime())) return raw;

    return new Intl.DateTimeFormat(en() ? 'en-GB' : 'th-TH', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d) + (m[4] ? ' ' + m[4] : '');
  };

  const address = (raw, english) => en()
    ? english ||
      ({
        '99 ถนนสุขุมวิท กรุงเทพฯ 10110':
          '99 Sukhumvit Road, Bangkok 10110'
      })[String(raw).trim()] ||
      raw
    : raw;

  const item = v => {
    const raw = String(v || '');
    const pairs = [
      ['ค่าโต๊ะ + เก้าอี้', 'Tables & Chairs'],
      ['ค่าโต๊ะและเก้าอี้', 'Tables & Chairs'],
      ['ค่าอาหาร', 'Catering'],
      ['ค่าจัดงาน', 'Event management']
    ];

    const pair = pairs.find(p =>
      p.some(x => x.toLowerCase() === raw.trim().toLowerCase())
    );

    return pair ? pair[en() ? 1 : 0] : raw;
  };

  return {
    en,
    text,
    status,
    category,
    place,
    title,
    thaiTime,
    eventDate,
    address,
    item
  };
})();