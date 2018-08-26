const Url = require('./Url');
const zlib = require('zlib');
const request = require('request-promise');
const cookieJar = request.jar();
const headers = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Host': 'www.instagram.com',
  'Origin': 'https://www.instagram.com',
  'Referer': 'https://www.instagram.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
  'X-Instagram-AJAX': '1',
  'X-Requested-With': 'XMLHttpRequest',
};
const waiting = (ms) => new Promise(resolve => setTimeout(resolve, (ms * 0.7) + (0.3 * ms * Math.random())));

const updateCsrfToken = () => {
  const currentCookies = cookieJar.getCookies(Url.defaultUrl);
  const csrfToken = currentCookies.find(cookie =>
    cookie.key === 'csrftoken').value;

  headers['X-CSRFToken'] = csrfToken;
  console.log('Updated x-csrftoken', csrfToken);
};

const updateInstagramAjaxToken = (body = '') => {
  headers['X-Instagram-AJAX'] = '1';
  const xInstagramAjaxToken = body.match(/rollout_hash":"([^"]+)/);
  if (!!xInstagramAjaxToken && xInstagramAjaxToken.length > 1) {
    headers['X-Instagram-AJAX'] = xInstagramAjaxToken[1];
  }
  console.log('Updated x-instagram-ajax', headers['X-Instagram-AJAX']);
}

// HTTP Error 400 = Instagram ban -> wait 2 hours

const Auth = {
  // Should be called first
  login: async ({ username, password }) => {
    console.log('Trying to login as', username);
    const initialRequest = await request.get({
      jar: cookieJar,
      url: Url.defaultUrl,
      headers,
      gzip: true,
    }).catch(err => console.error(err));

    updateInstagramAjaxToken(initialRequest);
    updateCsrfToken();
    await waiting(4000);

    const login = await request.post({
      jar: cookieJar,
      url: Url.loginUrl,
      headers,
      form: {
        username,
        password,
      },
      resolveWithFullResponse: true,
    }).catch(err => console.error(err));

    updateCsrfToken();
    console.log(login.body);
    const extraCookies = ['ig_vw=1536', 'ig_pr=1.25', 'ig_vh=772', 'ig_or=landscape-primary'];
    extraCookies.forEach(cookie => {
      cookieJar.setCookie(request.cookie(cookie), Url.defaultUrl);
    });
    await waiting(4000);

    if (login.statusCode === 200) {
      const body = await request.get({
        jar: cookieJar,
        url: Url.defaultUrl,
        headers,
        gzip: true,
      });
      // console.log(body);
      console.log('Authenticated:', body.includes(username.toLowerCase()));
      await waiting(4000);
    } else {
      console.error('Login error. Connection error.')
    }
  },

  logout: async() => {
    console.log('Logging out...');
    await request.post({
      jar: cookieJar,
      url: Url.logoutUrl,
      headers,
      form: {
        'csrfmiddlewaretoken': headers['X-CSRFToken'],
      },
      resolveWithFullResponse: true,
    }).catch(e => {});
    
    await waiting(4000);
  },

  like: async(mediaId) => {
    //
  },

  follow: async(username) => {
    // 
  },

  unfollow: async(username) => {
    //
  },
};

module.exports = Auth;
