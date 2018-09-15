const Url = require('../shared/Url');
const Data = require('../shared/Data');

const waiting = (ms) => new Promise(resolve => setTimeout(resolve, (ms * 0.7) + (0.3 * ms * Math.random())));

const Api = {
  async login(browserInstance, credentials) {
    await browserInstance
      .url(Url.defaultUrl)
      .pause(2000);

    console.info('Trying to restore previous session...');
    const cookies = Data.getCookieSession();
    for (const cookie of cookies) {
      await browserInstance.setCookie(cookie);
    }
    await browserInstance
      .url(Url.defaultLoginUrl)
      .pause(2000);
    
    const isNotLoggedIn = (await browserInstance.getTitle()).toLowerCase().includes('login');
    if (isNotLoggedIn) {
      console.info('Logging in', credentials.username, '...');
      await browserInstance
        .click('[name=username]')
        .keys(credentials.username)
        .pause(7000) // wait to enter manually
        .click('[name=password]')
        .keys(credentials.password)
        .pause(2000)
        .click('button=Log in')
        .pause(5000);

      const isChallenged = (await browserInstance.getUrl()).includes('challenge');
      if (isChallenged) {
        // Wait for the user to solve it manually
        console.info('Waiting for user to solve the challenge...');
        await browserInstance.waitUntil(
          () => browserInstance.getUrl().then(url => !url.includes('challenge')),
          120 * 1000, // 2min
          'Took too long to solve challenge',
          1000, // check again every second
        );
      }
    } else {
      console.info('Already logged in');
    }
  },

  async logout(browserInstance, force = false) {
    if (force) {
      console.info('Logging out...');
      await browserInstance
        .url(Url.logoutUrl)
        .pause(3000)
        .url(Url.defaultUrl);
    } else {
      // persist cookies only
      console.info('Ending session...');
      const cookies = await browserInstance.getCookie();
      Data.storeCookieSession(cookies);

      await browserInstance
        .url('https://example.com');
    }
  },

  // Returns user info/details
  async getUser(browserInstance, username) {
    const user = await browserInstance
      .executeAsync(
        (usernameUrl, done) => {
          fetch(usernameUrl, { credentials: 'include' })
            .then(response => response.json())
            .then(json => done(json.graphql.user));
        },
        Url.getUsernameApiUrl(username),
      );
    await waiting(3000);
    return user.value;
  },

  // Returns a list of posts that have this hashtag
  async getHashtag(browserInstance, hashtag) {
    const hashtagData = await browserInstance
      .executeAsync(
        (hashtagUrl, done) => {
          fetch(hashtagUrl, { credentials: 'include' })
            .then(response => response.json())
            .then(json => done(json.graphql.hashtag));
        },
        Url.getHashtagApiUrl(hashtag),
      );
    await waiting(3000);
    return hashtagData.value;
  },

  // Generic method to get data from this specific API
  async queryGraphqlApi(browserInstance, queryHash, variables) {
    const query = {
      query_hash: queryHash,
      variables: JSON.stringify(variables),
    };
    const data = await browserInstance
      .executeAsync(
        (apiUrl, query, done) => {
          const url = new URL(apiUrl);
          url.search = new URLSearchParams(query);
          fetch(url, { credentials: 'include' })
            .then(response => response.json())
            .then(json => done(json.data));
        },
        Url.graphqlApiUrl,
        query,
      );
    await waiting(3000);
    return data.value;
  },

  // Get username's followers (first few) - working with pagination
  getUserFollowers(browserInstance, userId, afterCursor = null) {
    const variables = {
      id: userId,
      first: 40, // must be < 50
      ...(!!afterCursor ? { after: afterCursor } : {}), // for pagination
    };
    console.info(`GET ${afterCursor ? 'more ' : ''}followers of user ${userId}`);
    return Api.queryGraphqlApi(browserInstance, '7dd9a7e2160524fd85f50317462cff9f', variables)
      .then(data => data.user.edge_followed_by);
  },

  // Get a list of people who liked this media (first few) - working with pagination
  getMediaLikers(browserInstance, mediaId, afterCursor = null) {
    const variables = {
      shortcode: mediaId,
      first: afterCursor ? 12 : 24, // must be < 50
      ...(!!afterCursor ? { after: afterCursor } : {}), // for pagination
    };
    console.info(`GET ${afterCursor ? 'more ' : ''}likers of media ${mediaId}`);
    return Api.queryGraphqlApi(browserInstance, 'e0f59e4a1c8d78d0161873bc2ee7ec44', variables)
      .then(data => data.shortcode_media.edge_liked_by);
  },

  // Returns up to numLikers of the target mediaId
  // Wrapper around getMediaLikers() to simplify/remove pagination complications 
  async getMediaLikersFirstN(browserInstance, mediaId, numLikers, blacklist) {
    // Navigating there first makes the behaviour more human
    await browserInstance
      .url(Url.getMediaUrl(mediaId))
      .pause(2000);

    const mediaLikers = await Api.getListOfAccountsFirstN(
      browserInstance,
      (afterCursor) => Api.getMediaLikers(browserInstance, mediaId, afterCursor || null),
      numLikers,
      blacklist,
    );
    console.info(`Found ${mediaLikers.length} out of ${numLikers} likers requested`);
    return mediaLikers;
  },

  // Returns up to numFollowers of the target userId
  // Wrapper around getUserFollowers() to simplify/remove pagination complications 
  async getUserFollowersFirstN(browserInstance, userId, numFollowers, blacklist) {
    const userFollowers = await Api.getListOfAccountsFirstN(
      browserInstance,
      (afterCursor) => Api.getUserFollowers(browserInstance, userId, afterCursor || null),
      numFollowers,
      blacklist,
    );
    console.info(`Found ${userFollowers.length} out of ${numFollowers} followers requested`);
    return userFollowers;
  },

  // Returns up to numAccounts accounts (followers or likers), using the apiGetDataMethod (which uses pagination)
  // Wrapper to simplify/remove pagination complications
  async getListOfAccountsFirstN(browserInstance, getApiDataMethod, numAccounts = null, blacklist = new Set()) {
    if (!numAccounts) {
      return getApiDataMethod();
    }
    const accounts = [];
    const appendAccounts = (data) => accounts.push(...data.edges
      .filter(({ node }) => !node.is_private)
      // .filter(({ node }) => node.full_name.toLowerCase().includes('photography'))
      .map(({ node: { id, username } }) => ({ id, username }))
      .filter(({ id }) => !blacklist.has(id))
    );

    let endCursor = null;
    let hasNextPage = false;
    do {
      const moreAccounts = await getApiDataMethod(endCursor);
      appendAccounts(moreAccounts);
      console.info(`Accounts found so far: ${accounts.length}`);
      const nextPage = moreAccounts.page_info;
      endCursor = nextPage.end_cursor;
      hasNextPage = nextPage.has_next_page;
    } while (hasNextPage && accounts.length < numAccounts);
    
    return accounts.slice(0, numAccounts);
  },

  /* POST api methods */
  followUser(browserInstance, username) {
    console.info('Following', username, '...');
    return browserInstance
      .url(Url.getUserPageUrl(username))
      .pause(2000)
      .click('button*=Follow')
      .pause(3000);
  },

  unfollowUser(browserInstance, username) {
    console.info('Unfollowing', username, '...');
    return browserInstance
      .url(Url.getUserPageUrl(username))
      .click('button*=Following')
      .pause(2000)
      .click('button*=Unfollow')
      .pause(3000)
      .catch(err => {
        console.info('Already unfollowed');
      });
  },
};

module.exports = Api;
