const router = require('express').Router();
const user = require('../controllers/userController');
router.post('/login', user.login);
router.post('/signup', user.signup);
// New route for admin
router.get('/all', user.listAllUsers);
module.exports = router;
