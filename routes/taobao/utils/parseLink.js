
// ignore size && convert to http link
exports.parseLink = (_) => {
    return _.substring(0, _.indexOf('.jpg_')) +".jpg";
}