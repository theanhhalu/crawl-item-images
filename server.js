const app = require('./app');
const {PORT} = require('./config');

const server = require('http').createServer(app);

server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));