const router = require('express').Router();
const o = require('../controllers/orderController');
router.post('/', o.create);
router.get('/', o.listByUser);
router.get('/pending/all', o.listAllPending); 
router.get('/pending/user', o.listPendingByUser);// Admin view
router.delete('/process/:order_id', o.processOrder); // Admin processes orde

module.exports = router;
