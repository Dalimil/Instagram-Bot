const Url = require('./src/Url');
const Api = require('./src/Api');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('creds.json'));

(async () => {
 await Api.login(credentials);
 console.log('Call APIs now...');
 await Api.logout();
})();
