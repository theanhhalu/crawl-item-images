const router = require('express').Router();

router.use('/taobao' , require('./taobao'));
router.use('/shop1688', require('./shop1688'));

module.exports = router;