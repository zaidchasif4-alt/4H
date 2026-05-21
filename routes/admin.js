const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/',          adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// ── Products ──────────────────────────────────────────────────────────────────
router.get('/products',               adminController.getProducts);
router.get('/add-product',            adminController.getAddProduct);
router.post('/add-product',           adminController.postAddProduct);
router.get('/edit-product/:id',       adminController.getEditProduct);
router.post('/edit-product/:id',      adminController.postEditProduct);
router.post('/delete-product/:id',    adminController.deleteProduct);        // ← product delete
router.post('/products/update-sale/:id', adminController.postUpdateSale);

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories',              adminController.getCategories);
router.post('/categories',             adminController.postAddCategory);
router.post('/categories/delete/:id',  adminController.deleteCategory);      // ← category delete

// ── Site Settings ─────────────────────────────────────────────────────────────
router.get('/settings',  adminController.getSettings);
router.post('/settings', adminController.postSettings);

module.exports = router;
