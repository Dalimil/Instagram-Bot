const Url = require('./src/Url');
const Auth = require('./src/Auth');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('creds.json'));

Auth.login(credentials);

// Auth.logout();

// HTTP Error 400 = Instagram ban -> wait 2 hours
/*const Http = {
  // handle cookies etc. here
  get(url) => {
    // todo
  }
  post(url, data) => {
    // todo
  }
}*/

/*
describe('Hangouts invites', function() {
  browser.log('driver');

  it('should send invites', function() {
    browser.url(loginUrl);
    browser.element('input[type="email"]').setValue("dalimil.me");
    browser.click('div#identifierNext');
    browser.pause(1000);
    ids.forEach(id => {
      try {
        console.log(id);
        browser.url(getHangoutInviteUrl(id));
        const frameId = $$("iframe.Xyqxtc")[1].getAttribute("id");
        browser.frame(frameId);
        const name = browser.getText('div.Ob2Lud');
        browser.element('div.editable').setValue(getInviteMsg(name.split(" ")[0]));
        browser.pause(3000);
        try { 
          browser.click('button.mj7wCe');
        } catch (e) {
          browser.keys("\uE007"); 
        }
        browser.frame(null);
        browser.pause(2000);
      } catch (e) {}
    });
  });
});
*/