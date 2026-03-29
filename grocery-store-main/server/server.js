const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./database');
const { generateMessages } = require('./aiService');
const whatsapp = require('./whatsappService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// ─── Initialize WhatsApp ─────────────────────────────────────
whatsapp.initWhatsApp(io);

// ─── Socket.IO Connection ────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Send current WhatsApp status
  const status = whatsapp.getStatus();
  socket.emit('whatsapp:status', status);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ═══════════════════════════════════════════════════════════════
// CONTACTS API
// ═══════════════════════════════════════════════════════════════

// Get all contacts
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts WHERE is_active = 1 ORDER BY name ASC').all();
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get contact groups
app.get('/api/contacts/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT group_name, COUNT(*) as count FROM contacts WHERE is_active = 1 GROUP BY group_name ORDER BY group_name').all();
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add single contact
app.post('/api/contacts', (req, res) => {
  try {
    const { name, phone, group_name, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, error: 'Name and phone are required' });

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return res.status(400).json({ success: false, error: 'Invalid phone number' });

    const stmt = db.prepare('INSERT INTO contacts (name, phone, group_name, notes) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, cleanPhone, group_name || 'General', notes || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ success: false, error: 'Phone number already exists' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Bulk add contacts
app.post('/api/contacts/bulk', (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'contacts array is required' });
    }

    const stmt = db.prepare('INSERT OR IGNORE INTO contacts (name, phone, group_name, notes) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((contactsList) => {
      let added = 0;
      for (const c of contactsList) {
        const cleanPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone.length === 10 && c.name) {
          const result = stmt.run(c.name, cleanPhone, c.group_name || 'General', c.notes || null);
          if (result.changes > 0) added++;
        }
      }
      return added;
    });

    const added = insertMany(contacts);
    res.json({ success: true, added, total: contacts.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update contact
app.put('/api/contacts/:id', (req, res) => {
  try {
    const { name, phone, group_name, notes } = req.body;
    db.prepare('UPDATE contacts SET name = ?, phone = ?, group_name = ?, notes = ? WHERE id = ?')
      .run(name, phone, group_name, notes, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete contact (soft)
app.delete('/api/contacts/:id', (req, res) => {
  try {
    db.prepare('UPDATE contacts SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// AI MESSAGE GENERATOR API
// ═══════════════════════════════════════════════════════════════

// Generate AI messages
app.post('/api/ai/generate', (req, res) => {
  try {
    const messages = generateMessages(req.body);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save message template
app.post('/api/templates', (req, res) => {
  try {
    const { title, body, category, language } = req.body;
    const stmt = db.prepare('INSERT INTO message_templates (title, body, category, language) VALUES (?, ?, ?, ?)');
    const result = stmt.run(title, body, category || 'promotion', language || 'hinglish');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all templates
app.get('/api/templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM message_templates ORDER BY created_at DESC').all();
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM message_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP API
// ═══════════════════════════════════════════════════════════════

// Get WhatsApp status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ success: true, ...whatsapp.getStatus() });
});

// Send single test message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const result = await whatsapp.sendMessage(phone, message);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout WhatsApp
app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    await whatsapp.logout();
    res.json({ success: true, message: 'Logged out from WhatsApp' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS API
// ═══════════════════════════════════════════════════════════════

// Create and start a campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { title, message, contactIds, groupName } = req.body;

    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

    // Get contacts
    let contacts;
    if (contactIds && contactIds.length > 0) {
      const placeholders = contactIds.map(() => '?').join(',');
      contacts = db.prepare(`SELECT * FROM contacts WHERE id IN (${placeholders}) AND is_active = 1`).all(...contactIds);
    } else if (groupName) {
      contacts = db.prepare('SELECT * FROM contacts WHERE group_name = ? AND is_active = 1').all(groupName);
    } else {
      contacts = db.prepare('SELECT * FROM contacts WHERE is_active = 1').all();
    }

    if (contacts.length === 0) {
      return res.status(400).json({ success: false, error: 'No contacts found' });
    }

    // Create campaign record
    const campaign = db.prepare('INSERT INTO campaigns (title, message, status, total_contacts) VALUES (?, ?, ?, ?)')
      .run(title || 'Campaign', message, 'sending', contacts.length);

    const campaignId = campaign.lastInsertRowid;

    // Create campaign logs for each contact
    const logStmt = db.prepare('INSERT INTO campaign_logs (campaign_id, contact_id, phone) VALUES (?, ?, ?)');
    const insertLogs = db.transaction((contactsList) => {
      for (const c of contactsList) {
        logStmt.run(campaignId, c.id, c.phone);
      }
    });
    insertLogs(contacts);

    // Start sending in background
    res.json({
      success: true,
      campaignId,
      totalContacts: contacts.length,
      estimatedTime: `${Math.ceil((contacts.length * 4) / 60)} minutes`,
    });

    // Run the campaign asynchronously
    whatsapp.sendBulkMessages(contacts, message, campaignId, db, io)
      .then(results => {
        console.log(`✅ Campaign ${campaignId} completed:`, results);
      })
      .catch(err => {
        console.error(`❌ Campaign ${campaignId} error:`, err.message);
        db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('error', campaignId);
      });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all campaigns
app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get campaign details
app.get('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    const logs = db.prepare(`
      SELECT cl.*, c.name as contact_name
      FROM campaign_logs cl
      JOIN contacts c ON cl.contact_id = c.id
      WHERE cl.campaign_id = ?
      ORDER BY cl.sent_at DESC
    `).all(req.params.id);
    res.json({ success: true, campaign, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Dashboard Stats ─────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE is_active = 1').get().count;
    const totalCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
    const totalSent = db.prepare('SELECT COALESCE(SUM(sent_count), 0) as count FROM campaigns').get().count;
    const totalGroups = db.prepare('SELECT COUNT(DISTINCT group_name) as count FROM contacts WHERE is_active = 1').get().count;

    res.json({
      success: true,
      data: { totalContacts, totalCampaigns, totalSent, totalGroups }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Grocery Store Backend Server running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp integration initializing...`);
  console.log(`🤖 AI Message Generator ready!`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/contacts        — List contacts`);
  console.log(`  POST /api/contacts        — Add contact`);
  console.log(`  POST /api/contacts/bulk   — Bulk add contacts`);
  console.log(`  POST /api/ai/generate     — Generate AI messages`);
  console.log(`  GET  /api/whatsapp/status — WhatsApp connection status`);
  console.log(`  POST /api/campaigns       — Create & start campaign`);
  console.log(`  GET  /api/stats           — Dashboard stats\n`);
});
