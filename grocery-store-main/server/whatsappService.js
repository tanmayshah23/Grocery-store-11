// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode');

// let whatsappClient = null;
// let clientReady = false;
// let currentQR = null;
// let io = null;

// // ─── Initialize WhatsApp Client ──────────────────────────────
// function initWhatsApp(socketIO) {
//   io = socketIO;

//   whatsappClient = new Client({
//     authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
//     puppeteer: {
//       headless: true,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--no-first-run',
//         '--single-process',
//         '--disable-gpu'
//       ]
//     }
//   });

//   whatsappClient.on('qr', async (qr) => {
//     console.log('📱 QR Code received. Scan to connect WhatsApp.');
//     currentQR = await qrcode.toDataURL(qr);
//     clientReady = false;
//     if (io) io.emit('whatsapp:qr', currentQR);
//   });

//   whatsappClient.on('ready', () => {
//     console.log('✅ WhatsApp Client is ready!');
//     clientReady = true;
//     currentQR = null;
//     if (io) io.emit('whatsapp:ready', { status: 'connected' });
//   });

//   whatsappClient.on('authenticated', () => {
//     console.log('🔐 WhatsApp authenticated successfully!');
//     if (io) io.emit('whatsapp:authenticated');
//   });

//   whatsappClient.on('auth_failure', (msg) => {
//     console.error('❌ WhatsApp auth failed:', msg);
//     clientReady = false;
//     if (io) io.emit('whatsapp:auth_failure', { error: msg });
//   });

//   whatsappClient.on('disconnected', (reason) => {
//     console.log('📴 WhatsApp disconnected:', reason);
//     clientReady = false;
//     if (io) io.emit('whatsapp:disconnected', { reason });
//   });

//   whatsappClient.initialize().catch(err => {
//     console.error('Failed to initialize WhatsApp:', err.message);
//   });
// }

// // ─── Send a Single Message ───────────────────────────────────
// async function sendMessage(phone, message) {
//   if (!whatsappClient || !clientReady) {
//     throw new Error('WhatsApp is not connected. Please scan QR code first.');
//   }

//   // Format phone for WhatsApp (Indian numbers: 91XXXXXXXXXX)
//   let formattedPhone = phone.replace(/\D/g, '');
//   if (formattedPhone.length === 10) {
//     formattedPhone = '91' + formattedPhone;
//   }
//   if (!formattedPhone.startsWith('91')) {
//     formattedPhone = '91' + formattedPhone;
//   }

//   const chatId = formattedPhone + '@c.us';

//   try {
//     // Check if number is on WhatsApp
//     const isRegistered = await whatsappClient.isRegisteredUser(chatId);
//     if (!isRegistered) {
//       return { success: false, error: 'Number not on WhatsApp' };
//     }

//     await whatsappClient.sendMessage(chatId, message);
//     return { success: true };
//   } catch (err) {
//     return { success: false, error: err.message };
//   }
// }

// // ─── Bulk Send with Rate Limiting ────────────────────────────
// async function sendBulkMessages(contacts, message, campaignId, db, io) {
//   if (!whatsappClient || !clientReady) {
//     throw new Error('WhatsApp is not connected.');
//   }

//   const results = { sent: 0, failed: 0, total: contacts.length };
//   const DELAY_MS = 4000; // 4 seconds between messages to avoid ban

//   for (let i = 0; i < contacts.length; i++) {
//     const contact = contacts[i];

//     try {
//       const result = await sendMessage(contact.phone, message.replace(/{name}/gi, contact.name));

//       if (result.success) {
//         results.sent++;
//         // Update campaign log
//         if (db && campaignId) {
//           db.prepare(`
//             UPDATE campaign_logs SET status = 'sent', sent_at = ? WHERE campaign_id = ? AND contact_id = ?
//           `).run(Date.now(), campaignId, contact.id);
//         }
//       } else {
//         results.failed++;
//         if (db && campaignId) {
//           db.prepare(`
//             UPDATE campaign_logs SET status = 'failed', error_message = ? WHERE campaign_id = ? AND contact_id = ?
//           `).run(result.error, campaignId, contact.id);
//         }
//       }
//     } catch (err) {
//       results.failed++;
//       if (db && campaignId) {
//         db.prepare(`
//           UPDATE campaign_logs SET status = 'failed', error_message = ? WHERE campaign_id = ? AND contact_id = ?
//         `).run(err.message, campaignId, contact.id);
//       }
//     }

//     // Emit progress
//     if (io) {
//       io.emit('campaign:progress', {
//         campaignId,
//         current: i + 1,
//         total: contacts.length,
//         sent: results.sent,
//         failed: results.failed,
//         percentage: Math.round(((i + 1) / contacts.length) * 100),
//         currentContact: contact.name,
//       });
//     }

//     // Update campaign in DB
//     if (db && campaignId) {
//       db.prepare(`
//         UPDATE campaigns SET sent_count = ?, failed_count = ? WHERE id = ?
//       `).run(results.sent, results.failed, campaignId);
//     }

//     // Rate limiting delay (skip on last message)
//     if (i < contacts.length - 1) {
//       await new Promise(resolve => setTimeout(resolve, DELAY_MS));
//     }
//   }

//   // Mark campaign as completed
//   if (db && campaignId) {
//     db.prepare(`
//       UPDATE campaigns SET status = 'completed', completed_at = ? WHERE id = ?
//     `).run(Date.now(), campaignId);
//   }

//   if (io) {
//     io.emit('campaign:complete', { campaignId, ...results });
//   }

//   return results;
// }

// // ─── Status Check ────────────────────────────────────────────
// function getStatus() {
//   return {
//     connected: clientReady,
//     qrCode: currentQR,
//   };
// }

// // ─── Logout ──────────────────────────────────────────────────
// async function logout() {
//   if (whatsappClient) {
//     await whatsappClient.logout();
//     clientReady = false;
//     currentQR = null;
//   }
// }

// module.exports = {
//   initWhatsApp,
//   sendMessage,
//   sendBulkMessages,
//   getStatus,
//   logout,
// };





//Chatgpt  codee


const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let whatsappClient = null;
let clientReady = false;
let currentQR = null;
let io = null;

// ─── Initialize WhatsApp Client ──────────────────────────────
function initWhatsApp(socketIO) {
  io = socketIO;

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),

    puppeteer: {
      headless: false, // 🔥 MUST BE FALSE
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows fix
      args: ['--no-sandbox']
    }
  });

  // QR Code Event
  whatsappClient.on('qr', async (qr) => {
    try {
      console.log('📱 Scan this QR with WhatsApp');

      currentQR = await qrcode.toDataURL(qr);
      clientReady = false;

      io?.emit('whatsapp:qr', currentQR);
    } catch (err) {
      console.error('❌ QR Error:', err);
    }
  });

  // Loading (helps debug)
  whatsappClient.on('loading_screen', (percent, message) => {
    console.log(`Loading: ${percent}% - ${message}`);
  });

  // Ready Event
  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Client is READY!');
    clientReady = true;
    currentQR = null;

    io?.emit('whatsapp:ready', { status: 'connected' });
  });

  // Authenticated
  whatsappClient.on('authenticated', () => {
    console.log('🔐 Authenticated successfully!');
    io?.emit('whatsapp:authenticated');
  });

  // Auth Failure
  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
    clientReady = false;

    io?.emit('whatsapp:auth_failure', { error: msg });
  });

  // Disconnected
  whatsappClient.on('disconnected', (reason) => {
    console.log('📴 Disconnected:', reason);
    clientReady = false;
    currentQR = null;

    io?.emit('whatsapp:disconnected', { reason });
  });

  // Initialize
  whatsappClient.initialize()
    .then(() => console.log('🚀 Initializing WhatsApp...'))
    .catch(err => console.error('❌ Init Error:', err));
}

// ─── Send Single Message ─────────────────────────────────────
async function sendMessage(phone, message) {
  if (!whatsappClient || !clientReady) {
    throw new Error('WhatsApp not connected. Scan QR first.');
  }

  let formattedPhone = phone.replace(/\D/g, '');

  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  if (!formattedPhone.startsWith('91')) {
    formattedPhone = '91' + formattedPhone;
  }

  const chatId = formattedPhone + '@c.us';

  try {
    const isRegistered = await whatsappClient.isRegisteredUser(chatId);

    if (!isRegistered) {
      return { success: false, error: 'Number not on WhatsApp' };
    }

    await whatsappClient.sendMessage(chatId, message);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Bulk Messaging ──────────────────────────────────────────
async function sendBulkMessages(contacts, message, campaignId, db, socketIO) {
  if (!whatsappClient || !clientReady) {
    throw new Error('WhatsApp not connected.');
  }

  const results = {
    sent: 0,
    failed: 0,
    total: contacts.length
  };

  const DELAY_MS = 5000; // safer delay

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    try {
      const personalizedMsg = message.replace(/{name}/gi, contact.name);

      const result = await sendMessage(contact.phone, personalizedMsg);

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
      }
    } catch (err) {
      results.failed++;
    }

    // Emit progress
    socketIO?.emit('campaign:progress', {
      campaignId,
      current: i + 1,
      total: contacts.length,
      sent: results.sent,
      failed: results.failed,
      percentage: Math.round(((i + 1) / contacts.length) * 100),
      currentContact: contact.name
    });

    // Delay
    if (i < contacts.length - 1) {
      await new Promise(res => setTimeout(res, DELAY_MS));
    }
  }

  socketIO?.emit('campaign:complete', {
    campaignId,
    ...results
  });

  return results;
}

// ─── Status ──────────────────────────────────────────────────
function getStatus() {
  return {
    connected: clientReady,
    qrCode: currentQR
  };
}

// ─── Logout ──────────────────────────────────────────────────
async function logout() {
  if (whatsappClient) {
    await whatsappClient.logout();
    clientReady = false;
    currentQR = null;
  }
}

// ─── Export ──────────────────────────────────────────────────
module.exports = {
  initWhatsApp,
  sendMessage,
  sendBulkMessages,
  getStatus,
  logout
};