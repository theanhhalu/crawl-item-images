
exports.parseQuery = (_) => {
    let query = {};
    _.split('?')[1].split('&').forEach((ele) => {
        const arr = ele.split('=');
        query[arr[0]] = arr[1];
    });
    return query;
}