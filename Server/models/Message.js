// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true // Remove default 'Anonymous', enforce real username
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 604800 // 7 days in seconds (7 * 24 * 60 * 60)
    },
    type: {
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    url: {
        type: String,
        required: function() {
            return this.type === 'image';
        }
    }
});

module.exports = mongoose.model('Message', messageSchema);