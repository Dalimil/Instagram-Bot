const Url = require('./Url');
const request = require('request-promise');
const cookieJar = request.jar();
const headers = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Content-Length': '0',
  'Host': 'www.instagram.com',
  'Origin': 'https://www.instagram.com',
  'Referer': 'https://www.instagram.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36',
  'X-Instagram-AJAX': '1',
  'Content-Type': 'application/x-www-form-urlencoded',
  'X-Requested-With': 'XMLHttpRequest',
};
const waiting = (ms) => new Promise(resolve => setTimeout(resolve, (ms * 0.7) + (0.3 * ms * Math.random())));

const updateCsrfToken = () => {
  const currentCookies = cookieJar.getCookies(Url.defaultUrl);
  const csrfToken = currentCookies.find(cookie =>
    cookie.key === 'csrftoken').value;

  console.log('Updated', csrfToken);
  headers['X-CSRFToken'] = csrfToken;
};

const Auth = {
  // Should be called first
  login: async ({ username, password }) => {
    console.log('Trying to login as', username);
    await request.get(
      { jar: cookieJar, url: Url.defaultUrl },
    ).catch(err => console.error(err));

    updateCsrfToken();
    await waiting(5000);

    const res = await request.post({
      jar: cookieJar,
      url: Url.loginUrl,
      headers,
      form: {
        username,
        password,
      },
    }).catch(err => console.error(err));

    updateCsrfToken();
    const extraCookies = ['ig_vw=1536', 'ig_pr=1.25', 'ig_vh=772', 'ig_or=landscape-primary'];
    extraCookies.forEach(cookie => {
      cookieJar.setCookie(request.cookie(cookie, Url.defaultUrl));
    });
    await waiting(5000);

    console.log(res);
/*
  if login.status_code == 200:
      r = self.s.get('https://www.instagram.com/')
      finder = r.text.find(self.user_login)
      if finder != -1:
          ui = UserInfo()
          self.user_id = ui.get_user_id_by_login(self.user_login)
          self.login_status = True
          log_string = '%s login success!' % (self.user_login)
          self.write_log(log_string)
*/
  },

  logout: async() => {
    console.log('Logging out');
    const logout = request.post({
      jar: cookieJar,
      url: Url.logoutUrl,
      form: {
        'csrfmiddlewaretoken': headers['X-CSRFToken'],
      },
    });
    console.log(logout);
  }
};

module.exports = Auth;
