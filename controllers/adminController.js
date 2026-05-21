const Product  = require('../models/Product');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

// ── Helper: settings as plain object ─────────────────────────────────────────
async function getSiteSettings() {
    try {
        const all = await Settings.find();
        const obj = {};
        all.forEach(s => { obj[s.key] = s.value; });
        return obj;
    } catch { return {}; }
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
    try {
        const productCount  = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();
        const settings      = await getSiteSettings();
        res.render('admin/dashboard', {
            layout: 'admin/layout',
            productCount,
            categoryCount,
            settings
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Dashboard load error.");
    }
};

// ── 2. Products list ──────────────────────────────────────────────────────────
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('category').sort({ createdAt: -1 });
        res.render('admin/products', { layout: 'admin/layout', products: products || [] });
    } catch (err) {
        console.error("Products error:", err);
        res.status(500).send("Products load error.");
    }
};

// ── 3. Categories list ────────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/categories', { layout: 'admin/layout', categories: categories || [] });
    } catch (err) {
        console.error("Categories error:", err);
        res.status(500).send("Categories load error.");
    }
};

// ── 4. Add Category ───────────────────────────────────────────────────────────
exports.postAddCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).send("Name required.");
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await new Category({ name: name.trim(), slug }).save();
        res.redirect('/admin/categories');
    } catch (err) {
        console.error("Add category error:", err);
        res.status(500).send("Error adding category.");
    }
};

// ── 5. DELETE Category ────────────────────────────────────────────────────────
exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.redirect('/admin/categories');
    } catch (err) {
        console.error("Delete category error:", err);
        res.status(500).send("Error deleting category.");
    }
};

// ── 6. Add Product form ───────────────────────────────────────────────────────
exports.getAddProduct = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/add-product', { layout: 'admin/layout', categories: categories || [] });
    } catch (err) {
        console.error("Add product form error:", err);
        res.status(500).send("Error loading form.");
    }
};

// ── 7. Add Product POST ───────────────────────────────────────────────────────
exports.postAddProduct = async (req, res) => {
    try {
        const { title, basePrice, salePrice, description, cardImageUrl, category, showOnHomeScreen, isOnSale, extraImages } = req.body;
        if (!title || !title.trim()) return res.status(400).send("Title required.");

        let imagesArray = [];
        if (cardImageUrl && cardImageUrl.trim()) imagesArray.push(cardImageUrl.trim());
        if (extraImages) {
            const arr = Array.isArray(extraImages) ? extraImages : [extraImages];
            arr.forEach(img => { if (img && img.trim()) imagesArray.push(img.trim()); });
        }

        await new Product({
            title:            title.trim(),
            basePrice:        parseInt(basePrice) || 0,
            salePrice:        salePrice && salePrice.trim() ? parseInt(salePrice) : null,
            isOnSale:         isOnSale === 'true' || isOnSale === 'on',
            description:      description ? description.trim() : '',
            cardImageUrl:     cardImageUrl ? cardImageUrl.trim() : '',
            images:           imagesArray,
            category:         (category && category.trim() && category !== 'undefined') ? category : null,
            showOnHomeScreen: showOnHomeScreen === 'on' || showOnHomeScreen === 'true'
        }).save();

        res.redirect('/admin/products');
    } catch (err) {
        console.error("Add product error:", err);
        res.status(500).send(`Error: ${err.message}`);
    }
};

// ── 8. Update Sale ────────────────────────────────────────────────────────────
exports.postUpdateSale = async (req, res) => {
    try {
        const { isOnSale, salePrice } = req.body;
        const onSale = isOnSale === 'true' || isOnSale === 'on';
        await Product.findByIdAndUpdate(req.params.id, {
            isOnSale: onSale,
            salePrice: onSale && salePrice ? parseInt(salePrice) : null
        });
        res.redirect('/admin/products');
    } catch (err) {
        console.error("Update sale error:", err);
        res.status(500).send("Error updating sale.");
    }
};

// ── 9. DELETE Product ─────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin/products');
    } catch (err) {
        console.error("Delete product error:", err);
        res.status(500).send("Error deleting product.");
    }
};

// ── 10. Edit Product form ─────────────────────────────────────────────────────
exports.getEditProduct = async (req, res) => {
    try {
        const product    = await Product.findById(req.params.id).populate('category');
        const categories = await Category.find().sort({ name: 1 });
        if (!product) return res.status(404).send("Product not found.");
        res.render('admin/edit-product', { layout: 'admin/layout', product, categories });
    } catch (err) {
        console.error("Edit form error:", err);
        res.status(500).send("Error loading edit form.");
    }
};

// ── 11. Edit Product POST ─────────────────────────────────────────────────────
exports.postEditProduct = async (req, res) => {
    try {
        const { title, basePrice, salePrice, description, cardImageUrl, category, showOnHomeScreen, isOnSale, extraImages } = req.body;

        let imagesArray = [];
        if (cardImageUrl && cardImageUrl.trim()) imagesArray.push(cardImageUrl.trim());
        if (extraImages) {
            const arr = Array.isArray(extraImages) ? extraImages : [extraImages];
            arr.forEach(img => { if (img && img.trim()) imagesArray.push(img.trim()); });
        }

        await Product.findByIdAndUpdate(req.params.id, {
            title:            title.trim(),
            basePrice:        parseInt(basePrice) || 0,
            salePrice:        salePrice && salePrice.trim() ? parseInt(salePrice) : null,
            isOnSale:         isOnSale === 'true' || isOnSale === 'on',
            description:      description ? description.trim() : '',
            cardImageUrl:     cardImageUrl ? cardImageUrl.trim() : '',
            images:           imagesArray,
            category:         (category && category.trim() && category !== 'undefined') ? category : null,
            showOnHomeScreen: showOnHomeScreen === 'on' || showOnHomeScreen === 'true'
        });
        res.redirect('/admin/products');
    } catch (err) {
        console.error("Edit product error:", err);
        res.status(500).send(`Error: ${err.message}`);
    }
};

// ── 12. GET Settings ──────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
    try {
        const settings = await getSiteSettings();
        res.render('admin/settings', {
            layout: 'admin/layout',
            settings,
            query: req.query
        });
    } catch (err) {
        console.error("Settings error:", err);
        res.status(500).send("Error loading settings.");
    }
};

// ── 13. POST Settings ─────────────────────────────────────────────────────────
exports.postSettings = async (req, res) => {
    try {
        const { heroImage1, heroImage2, heroImage3, heroHeadline, heroSubheadline, heroTagline, marqueeText, whatsappNumber } = req.body;

        const updates = [
            { key: 'heroImage1',      value: heroImage1      || '' },
            { key: 'heroImage2',      value: heroImage2      || '' },
            { key: 'heroImage3',      value: heroImage3      || '' },
            { key: 'heroHeadline',    value: heroHeadline    || '' },
            { key: 'heroSubheadline', value: heroSubheadline || '' },
            { key: 'heroTagline',     value: heroTagline     || '' },
            { key: 'marqueeText',     value: marqueeText     || '' },
            { key: 'whatsappNumber',  value: whatsappNumber  || '' },
        ];

        for (const u of updates) {
            await Settings.findOneAndUpdate({ key: u.key }, u, { upsert: true, new: true });
        }

        res.redirect('/admin/settings?saved=1');
    } catch (err) {
        console.error("Save settings error:", err);
        res.status(500).send("Error saving settings.");
    }
};
