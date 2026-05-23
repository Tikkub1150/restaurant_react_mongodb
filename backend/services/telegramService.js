const axios = require('axios');
const TelegramConfig = require('../models/TelegramConfig');

const BOT_TOKEN = '8163361905:AAFR8DJdRVt5kUC3FP4NRJfQPftzdwLKZXM';

exports.sendTelegramNotification = async (type, message) => {
    try {
        const config = await TelegramConfig.findOne({ type }).lean();
        if (!config || (!config.chat_id && config.token)) {
            console.error(`❌ ไม่พบ Chat ID สำหรับประเภท: ${type}`);
            return;
        }

        const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
        await axios.post(url, {
            chat_id: config.chat_id,
            text: message,
            parse_mode: 'Markdown'
        });

        console.log(`✅ ส่งแจ้งเตือน Telegram [${type}] สำเร็จ`);
    } catch (err) {
        console.error('❌ ส่ง Telegram พัง:', err.response?.data || err.message);
    }
};