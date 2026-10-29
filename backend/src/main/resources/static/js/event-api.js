
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
    'Surat Thani': ['suratthani', 'south']
  };

  const fallback = provinceMap[event.location] ||
    ['chiangrai', 'north'];

  const details = legacy || {};

  const descriptions = Array.isArray(details.d)
    ? details.d
    : [event.description || '', event.description || ''];

  return {
    id: event.id,
    th: event.title || '',
    en: details.en || event.title || '',
    d: [
      descriptions[0] || event.description || '',
      descriptions[1] || descriptions[0] || event.description || ''
    ],
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
    mysql: true
  };
};
