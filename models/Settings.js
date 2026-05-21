const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    label: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
