/**
 * 100% Free Lifelong Unlimited WhatsApp Gateway Server
 * Fadelopram Rx Academy — 01107118948
 * 
 * Runs on http://localhost:3001
 * Unlimited chats, Unlimited messages, 100% Free Forever!
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;
let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
  console.log('🔄 Initializing WhatsApp Connection for 01107118948...');
  const { state, saveCreds } = await useMultiFileAuthState('whatsapp_auth_session');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP (01107118948):');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log('⚠️ Connection closed due to ', lastDisconnect?.error, ', reconnecting: ', shouldReconnect);
      isConnected = false;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('\n======================================================');
      console.log('✅ WHATSAPP IS ONLINE & READY FOR UNLIMITED MESSAGES!');
      console.log('📱 Linked Account: 01107118948');
      console.log('🚀 Local Gateway API Server running at http://localhost:3001');
      console.log('======================================================\n');
      isConnected = true;
    }
  });
}

// Start WhatsApp Client
connectToWhatsApp().catch(err => console.error("Fatal WhatsApp Startup Error:", err));

// API Endpoint to Send WhatsApp OTP
app.all('/send-otp', async (req, res) => {
  const phone = req.query.phone || req.body.phone;
  const code = req.query.code || req.body.code;

  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Missing phone or code parameters.' });
  }

  if (!sock || !isConnected) {
    return res.status(503).json({
      success: false,
      message: 'WhatsApp Server is initializing or waiting for QR scan. Please check server terminal.'
    });
  }

  try {
    let cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const messageText = `🔐 *رمز التحقق الخاص بك في أكاديمية Fadelopram Rx*\n\n` +
                        `🔑 الرمز: *${code}*\n\n` +
                        `📋 قم بنسخ هذا الرمز وإدخاله في صفحة التسجيل لإكمال التوثيق.\n` +
                        `⚠️ لا تشارك هذا الرمز مع أي شخص.`;

    await sock.sendMessage(jid, { text: messageText });
    console.log(`⚡ OTP (${code}) successfully delivered via 01107118948 to -> +${cleanPhone}`);

    return res.json({
      success: true,
      delivered: true,
      sender: '01107118948',
      phone: cleanPhone,
      message: `تم إرسال كود التحقق 🔐 بنجاح إلى +${cleanPhone}`
    });
  } catch (err) {
    console.error('❌ Failed to send WhatsApp message:', err);
    return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.', error: String(err) });
  }
});

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({
    success: true,
    connected: isConnected,
    senderPhone: '01107118948',
    mode: 'Unlimited Free Lifelong Gateway'
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Local Gateway API listening on port ${PORT}`);
});
