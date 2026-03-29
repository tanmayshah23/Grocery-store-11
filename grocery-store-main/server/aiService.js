// ─── AI Message Generator (No API Key Needed) ──────────────
// Smart template engine that generates marketing messages for grocery stores
// Supports Hindi, English, and Hinglish

const PRODUCT_EMOJIS = {
  wheat: '🌾', atta: '🌾', rice: '🍚', chawal: '🍚', dal: '🫘', sugar: '🍬', cheeni: '🍬',
  oil: '🫒', tel: '🫒', ghee: '🧈', milk: '🥛', doodh: '🥛', paneer: '🧀',
  potato: '🥔', aloo: '🥔', onion: '🧅', pyaj: '🧅', tomato: '🍅', tamatar: '🍅',
  fruit: '🍎', sabzi: '🥬', vegetable: '🥬', spice: '🌶️', masala: '🌶️',
  bread: '🍞', egg: '🥚', anda: '🥚', tea: '🍵', chai: '🍵', coffee: '☕',
  soap: '🧼', detergent: '🧴', shampoo: '🧴', biscuit: '🍪', chocolate: '🍫',
  namkeen: '🥨', chips: '🥔', juice: '🧃', water: '💧', cold: '🥤',
  default: '🛒'
};

function getEmoji(product) {
  const lower = product.toLowerCase();
  for (const [key, emoji] of Object.entries(PRODUCT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return PRODUCT_EMOJIS.default;
}

// ─── Template Collections ────────────────────────────────────

const HINGLISH_TEMPLATES = [
  // Offer announcement
  {
    type: 'offer',
    template: (p) => `🎉 *${p.storeName}* mein Dhamaka Offer! 🎉\n\n${p.emoji} *${p.product}* — Sirf *₹${p.price}/${p.unit}* mein!\n\n🔥 Limited Time Offer!\n📍 Aaj hi aayein aur best deal paayein!\n\n📞 Contact: ${p.phone}\n🏪 ${p.storeName}`
  },
  {
    type: 'offer',
    template: (p) => `Namaste ${p.customerName ? p.customerName + ' ji' : ''} 🙏\n\n*${p.storeName}* se special offer:\n\n${p.emoji} *${p.product}* ab *₹${p.price}/${p.unit}*\n\n✅ Bilkul fresh quality\n✅ Ghar baithe order karo\n\n📞 ${p.phone}\n\nDhanyavaad! 🙏`
  },
  {
    type: 'offer',
    template: (p) => `🛒 *Weekly Special — ${p.storeName}*\n\n${p.emoji} *${p.product}*\n💰 Price: *₹${p.price}/${p.unit}*\n\nIs hafta ka sabse achha offer!\nStock limited hai, jaldi order karein.\n\n📍 ${p.address || 'Visit our store'}\n📞 ${p.phone}`
  },
  // New arrival
  {
    type: 'arrival',
    template: (p) => `🆕 *Naya Stock Aa Gaya!*\n\n${p.emoji} *${p.product}* — Fresh & Best Quality\n💰 Starting from *₹${p.price}/${p.unit}*\n\n🏪 *${p.storeName}*\n📞 ${p.phone}\n\nJaldi aayein, pehle aao pehle paao! 🏃‍♂️`
  },
  // Festival offer
  {
    type: 'festival',
    template: (p) => `🎊 *Festival Special!* 🎊\n\n${p.storeName} ki taraf se tyohar ki badhaai! 🪔\n\n${p.emoji} *${p.product}*: ₹${p.price}/${p.unit} (Special Rate)\n\n🎁 Extra 5% OFF bulk orders pe!\n📞 Abhi order karein: ${p.phone}\n\nShubh Kamnayein! 🙏`
  },
  // Reminder
  {
    type: 'reminder',
    template: (p) => `📢 *Yaad Dilana!*\n\n${p.customerName ? p.customerName + ' ji, ' : ''}${p.storeName} mein *${p.product}* ka stock khatam ho raha hai!\n\n${p.emoji} Price: *₹${p.price}/${p.unit}*\n\nAaj hi le jaayein! 🏃\n📞 ${p.phone}`
  },
];

const ENGLISH_TEMPLATES = [
  {
    type: 'offer',
    template: (p) => `🎉 *Special Offer at ${p.storeName}!*\n\n${p.emoji} *${p.product}* — Only *₹${p.price}/${p.unit}*\n\n✅ Premium Quality\n✅ Limited Stock\n\n📞 Order Now: ${p.phone}\n📍 ${p.address || 'Visit Today!'}`
  },
  {
    type: 'offer',
    template: (p) => `Hello${p.customerName ? ' ' + p.customerName : ''} 👋\n\n*${p.storeName}* brings you this week's best deal:\n\n${p.emoji} *${p.product}*\n💰 *₹${p.price}/${p.unit}*\n\n🛒 Fresh stock available!\n📞 ${p.phone}`
  },
  {
    type: 'arrival',
    template: (p) => `🆕 *New Stock Alert!*\n\n${p.emoji} *${p.product}* just arrived at *${p.storeName}*\n💰 Price: *₹${p.price}/${p.unit}*\n\n🏪 Visit us today!\n📞 ${p.phone}`
  },
];

const HINDI_TEMPLATES = [
  {
    type: 'offer',
    template: (p) => `🎉 *${p.storeName}* में धमाका ऑफर!\n\n${p.emoji} *${p.product}* — केवल *₹${p.price}/${p.unit}*\n\n✅ ताज़ा और बेहतरीन क्वालिटी\n⏳ सीमित समय का ऑफर\n\n📞 संपर्क: ${p.phone}\n📍 ${p.address || 'आज ही आएं!'}`
  },
  {
    type: 'offer',
    template: (p) => `नमस्ते${p.customerName ? ' ' + p.customerName + ' जी' : ''} 🙏\n\n*${p.storeName}* से विशेष ऑफर:\n\n${p.emoji} *${p.product}* अब *₹${p.price}/${p.unit}*\n\n🛒 ताज़ा माल!\n📞 ऑर्डर: ${p.phone}\n\nधन्यवाद! 🙏`
  },
];

// ─── Generator Function ──────────────────────────────────────

/**
 * Generate marketing messages using AI templates
 * @param {Object} params
 * @param {string} params.product - Product name (e.g., "Wheat", "Atta")
 * @param {string} params.price - Product price (e.g., "450")
 * @param {string} params.unit - Unit (e.g., "kg", "litre", "packet")
 * @param {string} params.storeName - Store name
 * @param {string} params.phone - Store phone number
 * @param {string} params.address - Store address (optional)
 * @param {string} params.customerName - Customer name for personalization (optional)
 * @param {string} params.language - "hinglish" | "english" | "hindi"
 * @param {string} params.messageType - "offer" | "arrival" | "festival" | "reminder"
 * @param {number} params.count - Number of variations to generate (1-5)
 */
function generateMessages(params) {
  const {
    product = 'Product',
    price = '0',
    unit = 'kg',
    storeName = 'My Store',
    phone = '',
    address = '',
    customerName = '',
    language = 'hinglish',
    messageType = 'offer',
    count = 3,
  } = params;

  const emoji = getEmoji(product);
  const templateParams = { product, price, unit, storeName, phone, address, customerName, emoji };

  let templates;
  switch (language) {
    case 'hindi':
      templates = HINDI_TEMPLATES;
      break;
    case 'english':
      templates = ENGLISH_TEMPLATES;
      break;
    default:
      templates = HINGLISH_TEMPLATES;
  }

  // Filter by message type, fallback to all if no match
  let filtered = templates.filter(t => t.type === messageType);
  if (filtered.length === 0) filtered = templates;

  // Generate messages
  const results = [];
  for (let i = 0; i < Math.min(count, filtered.length); i++) {
    results.push({
      id: i + 1,
      type: filtered[i].type,
      message: filtered[i].template(templateParams),
    });
  }

  // If we need more, cycle through other templates
  if (results.length < count) {
    const allTemplates = [...HINGLISH_TEMPLATES, ...ENGLISH_TEMPLATES, ...HINDI_TEMPLATES];
    for (let i = results.length; i < count && i < allTemplates.length; i++) {
      results.push({
        id: i + 1,
        type: allTemplates[i % allTemplates.length].type,
        message: allTemplates[i % allTemplates.length].template(templateParams),
      });
    }
  }

  return results;
}

/**
 * Personalize a message for a specific customer
 * @param {string} message - Template message with {customerName} placeholder
 * @param {string} customerName - Customer's name
 */
function personalizeMessage(message, customerName) {
  if (!customerName) return message;
  return message
    .replace(/\{customerName\}/g, customerName)
    .replace(/\{name\}/g, customerName);
}

module.exports = { generateMessages, personalizeMessage, getEmoji };
