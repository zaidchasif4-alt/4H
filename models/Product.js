const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    basePrice: {
        type: Number,
        required: true,
        default: 0
    },
    isOnSale: {
        type: Boolean,
        default: false
    },
    salePrice: {
        type: Number,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    cardImageUrl: {
        type: String,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    showOnHomeScreen: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// CRITICAL FIX: Exporting the model exactly as expected by controllers
module.exports = mongoose.model('Product', productSchema);