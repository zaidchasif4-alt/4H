const express = require('express');
const path    = require('path');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const Product  = require('./models/Product');
const Category = require('./models/Category');
const Settings = require('./models/Settings');

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/4h_luxury_store')
    .then(() => console.log('MongoDB connected.'))
    .catch(err => console.error('DB error:', err));

// ── View engine ───────────────────────────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout extractStyles', true);
app.set('layout extractScripts', true);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: '4h_luxury_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ── Session init ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.locals.session = req.session;
    if (!req.session.cart) req.session.cart = [];
    next();
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN CREDENTIALS
//  Default: admin / admin1234
//  Change karein /admin/credentials se
// ══════════════════════════════════════════════════════════════════════════════
let ADMIN_USERNAME = 'admin';
let ADMIN_PASSWORD = 'admin1234';

// ── Auth middleware: admin routes protect karta hai ───────────────────────────
function requireAdminAuth(req, res, next) {
    if (req.session && req.session.isAdminLoggedIn) return next();
    return res.redirect('/admin/login');
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function getSiteSettings() {
    try {
        const all = await Settings.find();
        const obj = {};
        all.forEach(s => { obj[s.key] = s.value; });
        return obj;
    } catch { return {}; }
}

// ── API: WhatsApp number — har page par header use karta hai ─────────────────
app.get('/api/whatsapp-number', async (req, res) => {
    try {
        const settings = await getSiteSettings();
        res.json({ number: settings.whatsappNumber || '' });
    } catch { res.json({ number: '' }); }
});

// ── Admin Auth Routes ─────────────────────────────────────────────────────────

// GET /admin/login
app.get('/admin/login', (req, res) => {
    if (req.session.isAdminLoggedIn) return res.redirect('/admin');
    res.render('admin/login', { layout: false, error: null });
});

// POST /admin/login
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdminLoggedIn = true;
        return req.session.save(() => res.redirect('/admin'));
    }
    res.render('admin/login', { layout: false, error: 'Invalid username or password.' });
});

// GET /admin/logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

// GET /admin/credentials — change password page
app.get('/admin/credentials', requireAdminAuth, (req, res) => {
    res.render('admin/credentials', {
        layout: 'admin/layout',
        success: req.query.saved === '1',
        error: null
    });
});

// POST /admin/credentials — save new credentials
app.post('/admin/change-credentials', requireAdminAuth, (req, res) => {
    const { newUsername, newPassword, currentPassword } = req.body;

    if (currentPassword !== ADMIN_PASSWORD) {
        return res.render('admin/credentials', {
            layout: 'admin/layout',
            success: false,
            error: 'Current password is incorrect.'
        });
    }
    if (!newUsername || newUsername.trim().length < 3) {
        return res.render('admin/credentials', {
            layout: 'admin/layout',
            success: false,
            error: 'Username must be at least 3 characters.'
        });
    }
    if (!newPassword || newPassword.length < 6) {
        return res.render('admin/credentials', {
            layout: 'admin/layout',
            success: false,
            error: 'Password must be at least 6 characters.'
        });
    }

    ADMIN_USERNAME = newUsername.trim();
    ADMIN_PASSWORD = newPassword;

    // Log out after credential change
    req.session.destroy(() => res.redirect('/admin/login'));
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN PANEL ROUTES  (sab protected hain)
// ══════════════════════════════════════════════════════════════════════════════
const adminRoutes = require('./routes/admin');
app.use('/admin', requireAdminAuth, adminRoutes);

// ══════════════════════════════════════════════════════════════════════════════
//  STOREFRONT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Home
app.get('/', async (req, res) => {
    try {
        const settings         = await getSiteSettings();
        const featuredProducts = await Product.find({ showOnHomeScreen: true }).populate('category').sort({ createdAt: -1 });
        const displayedIds     = featuredProducts.map(p => p._id.toString());
        const collections      = await Category.find().sort({ name: 1 });
        const categoriesWithProducts = [];
        for (let cat of collections) {
            const items = await Product.find({ category: cat._id, _id: { $nin: displayedIds } }).sort({ createdAt: -1 }).limit(4);
            categoriesWithProducts.push({ category: cat, products: items || [] });
        }
        res.render('home', { layout: false, featuredProducts: featuredProducts || [], categoriesWithProducts, settings });
    } catch (err) {
        console.error("Home error:", err);
        res.status(500).render('home', { layout: false, featuredProducts: [], categoriesWithProducts: [], settings: {} });
    }
});

// Collection
app.get('/collection', async (req, res) => {
    try {
        const { cat, sort, minPrice, maxPrice } = req.query;
        let filterQuery = {};
        if (cat && cat !== 'all') {
            const targetCat = await Category.findOne({ slug: cat });
            if (targetCat) filterQuery.category = targetCat._id;
            else if (mongoose.Types.ObjectId.isValid(cat)) filterQuery.category = cat;
        }
        if (minPrice || maxPrice) {
            filterQuery.basePrice = {};
            if (minPrice) filterQuery.basePrice.$gte = parseInt(minPrice) || 0;
            if (maxPrice) filterQuery.basePrice.$lte = parseInt(maxPrice) || 9999999;
        }
        const sortMap = { 'price-low': { basePrice: 1 }, 'price-high': { basePrice: -1 }, 'oldest': { createdAt: 1 } };
        const products   = await Product.find(filterQuery).populate('category').sort(sortMap[sort] || { createdAt: -1 });
        const categories = await Category.find().sort({ name: 1 });
        res.render('collection', {
            layout: false,
            products:   products   || [],
            categories: categories || [],
            currentFilter: { cat: cat || 'all', sort: sort || 'newest', minPrice: minPrice || '', maxPrice: maxPrice || '' }
        });
    } catch (err) {
        console.error("Collection error:", err);
        res.status(500).render('collection', { layout: false, products: [], categories: [], currentFilter: { cat: 'all', sort: 'newest', minPrice: '', maxPrice: '' } });
    }
});

app.get('/about',   (req, res) => res.render('about',   { layout: false }));
app.get('/contact', (req, res) => res.render('contact', { layout: false }));

// Cart
app.get('/cart', (req, res) => res.render('cart', { layout: false, cartItems: req.session.cart || [] }));

app.post('/add-to-cart', (req, res) => {
    const { id, name, price, image } = req.body;
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(i => i.id === id);
    if (existing) existing.quantity = (existing.quantity || 1) + 1;
    else req.session.cart.push({ id, name, price: parseInt(price) || 0, image, quantity: 1 });
    req.session.save(err => { if (err) console.error(err); res.redirect('/cart'); });
});

app.post('/cart/update-quantity', (req, res) => {
    const { id, action } = req.body;
    if (!req.session.cart) req.session.cart = [];
    const item = req.session.cart.find(i => i.id === id);
    if (item) {
        action === 'increase' ? item.quantity++ : item.quantity--;
        if (item.quantity <= 0) req.session.cart = req.session.cart.filter(i => i.id !== id);
    }
    req.session.save(() => res.json({ success: true, cart: req.session.cart }));
});

app.post('/cart/remove', (req, res) => {
    const { id } = req.body;
    if (!req.session.cart) req.session.cart = [];
    req.session.cart = req.session.cart.filter(i => i.id !== id);
    req.session.save(() => res.json({ success: true, cart: req.session.cart }));
});

// Checkout
app.get('/checkout', (req, res) => {
    const items = req.session.cart || [];
    if (items.length === 0) return res.redirect('/cart');
    res.render('checkout', { layout: false, checkoutItems: items });
});

// Product detail
app.get('/product/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send('<h1>Not found</h1>');
        const product = await Product.findById(id).populate('category');
        if (!product) return res.status(404).send('<h1>Not found</h1>');
        res.render('product-detail', { layout: false, product, id });
    } catch (err) {
        res.status(500).send("Error loading product.");
    }
});

app.use((req, res) => res.status(404).send('<h1>404 — Page not found</h1>'));

app.listen(3000, () => {
    console.log('Server: http://localhost:3000');
    console.log('Admin Login: http://localhost:3000/admin/login');
    console.log('Default credentials — Username: admin | Password: admin1234');
});
