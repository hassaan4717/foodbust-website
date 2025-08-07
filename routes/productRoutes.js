const router = require('express').Router();
const prod = require('../controllers/productController');
router.get('/', prod.list);
// router.get('/best', prod.best);
router.get('/:id', prod.details);

// New routes for admin
router.post('/', prod.create);   // Create a new product
router.put('/:id', prod.update);     // Update a product
router.delete('/:id', prod.remove);  // Delete a product

module.exports = router;
