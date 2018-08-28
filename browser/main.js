var webdriverio = require('webdriverio');
var options = { desiredCapabilities: { browserName: 'chrome' } };
var client = webdriverio.remote(options);

const credentials = JSON.parse(fs.readFileSync('creds.json'));

client
  .init()
  .url('https://www.instagram.com/accounts/login/')
  .pause(2000)
  .click('[name=username]')
  .keys(credentials.username)
  .pause(2000)
  .click('[name=password]')
  .keys(credentials.password)
  .pause(2000)
  .click('button=Log in')
  .pause(5000)
  .url('https://www.instagram.com/')
  .execute(() => {
    return document.cookie;
  }).then(result => {
    console.log(result);
  })
  //.end();
  .catch(function(err) {
    console.log(err);
  });
