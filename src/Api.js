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
  // console.log('Updated x-csrftoken', csrfToken);
};

const updateInstagramAjaxToken = (body = '') => {
  headers['X-Instagram-AJAX'] = '1';
  const xInstagramAjaxToken = body.match(/rollout_hash":"([^"]+)/);
  if (!!xInstagramAjaxToken && xInstagramAjaxToken.length > 1) {
    headers['X-Instagram-AJAX'] = xInstagramAjaxToken[1];
  }
  // console.log('Updated x-instagram-ajax', headers['X-Instagram-AJAX']);
}

// HTTP Error 400 = Instagram ban -> wait 2 hours

const Api = {
  // Generic GET request
  getEndpoint: async (url, query = {}) => {
    console.info('GET', url);
    const res = await request.get({
      jar: cookieJar,
      url,
      headers,
      gzip: true,
      qs: query,
    }).catch(err => console.error(err.name, err.message));

    await waiting(4000);
    return res;
  },
  
  // Generic POST request
  postEndpoint: async (url, data = {}) => {
    console.info('POST', url);
    const res = await request.post({
      jar: cookieJar,
      url,
      headers,
      form: data,
      resolveWithFullResponse: true,
    }).catch(err => console.error(err.name, err.message));

    await waiting(4000);
    return res;
  },

  // Should be called first
  login: async ({ username, password }) => {
    console.log('Trying to login as', username);
    const initialRequest = await Api.getEndpoint(Url.defaultUrl);
    updateInstagramAjaxToken(initialRequest);
    updateCsrfToken();

    const login = await Api.postEndpoint(Url.loginUrl, { username, password });
    updateCsrfToken();

    console.log(login.body);
    const extraCookies = ['ig_vw=1536', 'ig_pr=1.25', 'ig_vh=772', 'ig_or=landscape-primary'];
    extraCookies.forEach(cookie => {
      cookieJar.setCookie(request.cookie(cookie), Url.defaultUrl);
    });

    if (login.statusCode === 200) {
      const body = await Api.getEndpoint(Url.defaultUrl);
      // console.log(body);
      console.log('Authenticated:', body.includes(username.toLowerCase()));
    } else {
      console.error('Login error. Connection error.')
    }
  },

  logout: async (username) => {
    console.log('Logging out...');
    await Api.getEndpoint(Url.logoutUrl);
    // { 'csrfmiddlewaretoken': headers['X-CSRFToken'] }
    const body = await Api.getEndpoint(Url.defaultUrl);
    console.log('Authenticated:', body.includes(username.toLowerCase()));
  },

  /* GET api methods */
  getUser(username) {
    return Api.getEndpoint(Url.getUsernameUrl(username))
      .then(JSON.parse);
  },

  // Returns a list of posts that have this hashtag
  getHashtag(hashtag) {
    return Api.getEndpoint(Url.getHashtagUrl(hashtag))
      .then(JSON.parse);
  },

  // LocationId such as 895676663
  getLocation: async (locationId) => {
    return Api.getEndpoint(Url.getLocationUrl(locationId))
      .then(JSON.parse);
  },

  // Given the mediaId (= graph node 'shortcode'), it returns more details, such as location
  getMediaDetail: async (mediaId) => {
    return Api.getEndpoint(Url.getMediaDetailUrl(mediaId))
      .then(JSON.parse);
  },

  // Get username's followers
  getUserFollowers: async (userId, afterCursor = null) => {
    const variables = {
      id: userId,
      first: 40, // must be < 50
    };
    // For pagination
    if (afterCursor) {
      variables.after = afterCursor;
    }
    const query = {
      query_hash: '7dd9a7e2160524fd85f50317462cff9f',
      variables: JSON.stringify(variables),
    };
    return Api.getEndpoint(Url.graphqlApiUrl, query)
      .then(JSON.parse);
  },

  // Get people who liked this media
  getMediaLikers: async (mediaId, afterCursor = null) => {
    const variables = {
      shortcode: mediaId,
      first: afterCursor ? 12 : 24, // must be < 50
    };
    // For pagination
    if (afterCursor) {
      variables.after = afterCursor;
    }
    const query = {
      query_hash: 'e0f59e4a1c8d78d0161873bc2ee7ec44',
      variables: JSON.stringify(variables),
    };
    return Api.getEndpoint(Url.graphqlApiUrl, query)
      .then(JSON.parse);
  },


  /* POST api methods */
  followUser: async (userId) => {
    return Api.postEndpoint(Url.getFollowUrl(userId));
  },

  unfollowUser: async (userId) => {
    return Api.postEndpoint(Url.getUnfollowUrl(userId));
  },

  likeMedia: async (mediaId) => {
    return Api.postEndpoint(Url.getLikeUrl(mediaId));
  },

  unlikeMedia: async (mediaId) => {
    return Api.postEndpoint(Url.getUnlikeUrl(mediaId));
  },
};

module.exports = Api;
