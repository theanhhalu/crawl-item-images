const router = require('express').Router();
const controllers = require('./controllers');

// api/v1/api/taobao/
router.get('/', (req, res, next) => {
    return res.status(200).json({msg: 'GET to api/v1/api/taobao/'})
});

router.post('/', controllers._crawl);

module.exports = router;