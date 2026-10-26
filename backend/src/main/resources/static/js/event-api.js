
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


EventAPI.toFrontend = function(event) {const provinceMap = {
  'Chiang Rai': ['chiangrai', 'north'],
  'เชียงราย': ['chiangrai', 'north'],
  'Chiang Mai': ['chiangmai', 'north'],
  'เชียงใหม่': ['chiangmai', 'north'],
  'Bangkok': ['bangkok', 'central'],
  'กรุงเทพฯ': ['bangkok', 'central'],
  'กรุงเทพมหานคร': ['bangkok', 'central'],
  'Phuket': ['phuket', 'south'],
  'ภูเก็ต': ['phuket', 'south']
};

const location = (event.location || '').trim();
const province = provinceMap[location] || ['chiangrai', 'north'];
  const eventDate = event.eventDate
    ? event.eventDate.slice(0, 10)
    : '';

  return {
    id: event.id,
    th: event.title || '',
    en: event.title || '',
    d: [
      event.description || '',
      event.description || ''
    ],
    cat: 'event',
    prov: province[0],
    region: province[1],    
    date: eventDate,
    st: event.eventDate
  ? event.eventDate.slice(11, 16)
  : '',
et: '',
    price: Number(event.price || 0),
    orig: 0,
    seats: Number(event.availableSeats || 0),
    theme: 'festival',
    feat: false,
    arch: event.status !== 'ACTIVE'
  };
};
