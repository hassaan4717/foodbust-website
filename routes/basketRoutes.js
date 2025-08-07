const router = require('express').Router();
const b = require('../controllers/basketController');
router.get('/', b.list);
router.post('/', b.add);
router.delete('/:id', b.remove);
module.exports = router;
