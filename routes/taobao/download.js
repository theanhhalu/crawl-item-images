const router = require('express').Router();

// api/v1/api/taobao/
router.get('/', (req, res, next) => {
    return res.status(200).json({msg: 'GET to api/v1/api/taobao/'})
});

module.exports = router;