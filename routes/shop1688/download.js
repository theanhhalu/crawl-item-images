const router = require('express').Router();
const controllers = require('./controllers');
// api/v1/api/shop1688
router.get('/', (req, res, next) => {
    return res.status(200).json({msg: 'GET to api/v1/api/shop1688/'})
});
// router.post('/' , controllers.crawl);
router.post('/' , controllers.crawl);
module.exports = router;