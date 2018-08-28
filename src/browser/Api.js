const Url = require('../shared/Url');

const waiting = (ms) => new Promise(resolve => setTimeout(resolve, (ms * 0.7) + (0.3 * ms * Math.random())));

const Api = {
  async login(browserInstance, credentials) {
    console.info('Logging in', credentials.username, '...')
    await browserInstance
      .url(Url.defaultLoginUrl)
      .pause(2000)
      .click('[name=username]')
      .keys(credentials.username)
      .pause(2000)
      .click('[name=password]')
      .keys(credentials.password)
      .pause(2000)
      .click('button=Log in')
      .pause(5000)
      .url(Url.defaultUrl);
  },

  async logout(browserInstance) {
    console.info('Logging out...');
    await browserInstance
      .url(Url.logoutUrl)
      .pause(3000)
      .url(Url.defaultUrl);
  },

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

  // Get username's followers (first few) - working with pagination
  async getUserFollowers(browserInstance, userId, afterCursor = null) {
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
    console.info(`GET ${afterCursor ? 'more ' : ''}followers of user ${userId}`);
    const followers = await browserInstance
      .executeAsync(
        (apiUrl, query, done) => {
          const url = new URL(apiUrl);
          url.search = new URLSearchParams(query);
          fetch(url, { credentials: 'include' })
            .then(response => response.json())
            .then(json => done(json.data.user.edge_followed_by));
        },
        Url.graphqlApiUrl,
        query,
      );
    await waiting(3000);
    return followers.value;
  },

  // Returns up to numFollowers of the target userId
  // Wrapper around getUserFollowers() to simplify/remove pagination complications 
  async getUserFollowersFirstN(browserInstance, userId, numFollowers = null, blacklist = new Set()) {
    if (!numFollowers) {
      return Api.getUserFollowers(browserInstance, userId);
    }
    const followers = [];
    const appendFollowers = (data) => followers.push(...data.edges
      .filter(({ node }) => !node.is_private)
      .map(({ node: { id, username } }) => ({ id, username }))
      .filter(({ id }) => !blacklist.has(id))
    );

    let endCursor = null;
    let hasNextPage = false;
    do {
      const moreFollowers = await Api.getUserFollowers(browserInstance, userId, endCursor);
      appendFollowers(moreFollowers);
      const nextPage = moreFollowers.page_info;
      endCursor = nextPage.end_cursor;
      hasNextPage = nextPage.has_next_page;
    } while (hasNextPage && followers.length < numFollowers);
    
    const resultFollowers = followers.slice(0, numFollowers);
    console.info(`Found ${resultFollowers.length} out of ${numFollowers} followers requested`);
    return resultFollowers;
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
      .pause(2000)
      .click('button*=Following')
      .pause(3000);
  },
};

module.exports = Api;
