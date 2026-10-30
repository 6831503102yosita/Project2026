
const EventAPI = {
  async getAll() {
    const response = await fetch('/api/events');

    if (!response.ok) {
      throw new Error('Cannot load events from server');
    }

    return await response.json();
  },

  async getActive() {
    const response = await fetch('/api/events/active');

    if (!response.ok) {
      throw new Error('Cannot load active events');
    }

    return await response.json();
  }
};


EventAPI.getLegacyDetails = async function() {
  const response = await fetch('/api/events/legacy-details', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Cannot load original event details');
  }

  const records = await response.json();
  const result = {};

  for (const [id, value] of Object.entries(records)) {
    try {
      result[id] = JSON.parse(value);
    } catch (err) {
      console.error('Invalid legacy event metadata:', id, err);
    }
  }

  return result;
};

EventAPI.toFrontend = function(event, legacy = null) {
  const provinceMap = {
    'Chiang Rai': ['chiangrai', 'north'],
    'Chiang Mai': ['chiangmai', 'north'],
    'Mae Hong Son': ['maehongson', 'north'],
    'Bangkok': ['bangkok', 'central'],
    'Ayutthaya': ['ayutthaya', 'central'],
    'Nakhon Pathom': ['nakhonpathom', 'central'],
    'Chon Buri': ['chonburi', 'east'],
    'Rayong': ['rayong', 'east'],
    'Chanthaburi': ['chanthaburi', 'east'],
    'Kanchanaburi': ['kanchanaburi', 'west'],
    'Phetchaburi': ['phetchaburi', 'west'],
    'Prachuap Khiri Khan': ['prachuap', 'west'],
    'Khon Kaen': ['khonkaen', 'northeast'],
    'Nakhon Ratchasima': ['korat', 'northeast'],
    'Udon Thani': ['udon', 'northeast'],
    'Phuket': ['phuket', 'south'],
    'Krabi': ['krabi', 'south'],
    'เชียงราย': ['chiangrai','north'],
    'เชียงใหม่': ['chiangmai','north'],
    'กระบี่': ['krabi','south'],
    'Surat Thani': ['suratthani', 'south']
  };

  const fallback = provinceMap[event.location] ||
    ['chiangrai', 'north'];

  const details = legacy || {};

  // Use bilingual fields persisted in MySQL. Known demo fallbacks are only
  // used for older records that were created before the bilingual migration.
  const knownTitles = {
    'ทัวร์ดอยช้าง เชียงราย': 'Doi Chang Chiang Rai Tour',
    'เวิร์กช็อปจัดดอกไม้': 'Flower Arrangement Workshop',
    'เที่ยวทะเลกระบี่': 'Krabi Beach Tour',
    'เส้นทางชมภูเขาและป่าเชียงใหม่': 'Chiang Mai Mountain Nature Trail',
    'ทริปชมทะเลและเกาะ': 'Island and Sea Explorer',
    'เวิร์กช็อปจัดช่อดอกไม้': 'Flower Bouquet Workshop',
    'ทัวร์ชมทะเลสาบและธรรมชาติ': 'Lake and Nature Experience',
    'ทริปเดินป่าชมทิวทัศน์': 'Scenic Hiking Experience',
    'เวิร์กช็อปถ่ายภาพธรรมชาติ': 'Nature Photography Workshop'
  };
  const knownDescriptions = {
    'ทัวร์ดอยช้าง เชียงราย': 'Enjoy scenic mountain views and Doi Chang coffee plantations.',
    'เวิร์กช็อปจัดดอกไม้': 'Learn floral arrangement with a hands-on workshop.',
    'เที่ยวทะเลกระบี่': 'Explore beaches and natural scenery in Krabi.',
    'เส้นทางชมภูเขาและป่าเชียงใหม่': 'Discover Chiang Mai mountains and forest trails.',
    'ทริปชมทะเลและเกาะ': 'Explore tropical islands and beautiful coastline.',
    'เวิร์กช็อปจัดช่อดอกไม้': 'Learn to arrange bouquets in a beginner-friendly workshop.',
    'ทัวร์ชมทะเลสาบและธรรมชาติ': 'Explore tranquil lakes and natural scenery.',
    'ทริปเดินป่าชมทิวทัศน์': 'Hiking and scenic outdoor experience.',
    'เวิร์กช็อปถ่ายภาพธรรมชาติ': 'Practice nature and landscape photography.'
  };
  const thaiTitle = String(event.title || '').replace(/^ตัวอย่าง:\s*/, '');
  const englishTitle = String(event.titleEn || '').trim() ||
    knownTitles[thaiTitle] || details.en || thaiTitle;
  const thaiDescription = String(event.description || '') ||
    (Array.isArray(details.d) ? details.d[0] || '' : '');
  const englishDescription = String(event.descriptionEn || '').trim() ||
    knownDescriptions[thaiTitle] ||
    (Array.isArray(details.d) ? details.d[1] || '' : '') ||
    thaiDescription;

  return {
    id: event.id,
    th: thaiTitle,
    en: englishTitle,
    d: [thaiDescription, englishDescription],
    cat: event.category === 'tour' ? 'tour' : 'event',
    prov: details.prov || fallback[0],
    region: details.region || fallback[1],
    date: event.eventDate ? event.eventDate.slice(0, 10) : '',
    st: event.eventDate ? event.eventDate.slice(11, 16) : '',
    et: details.et || '',
    price: Number(event.price || 0),
    orig: Number(details.orig || 0),
    seats: Number(event.availableSeats || 0),
    theme: details.theme || 'festival',
    feat: Boolean(details.feat),
    arch: event.status !== 'ACTIVE',
    imageUrl: event.imageUrl || '',
    mysql: true
  };
};
