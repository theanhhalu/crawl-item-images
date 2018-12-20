const router = require('express').Router();

// api/v1/api/shop1688
router.get('/', (req, res, next) => {
    return res.status(200).json({msg: 'GET to api/v1/api/shop1688/'})
});

module.exports = router;