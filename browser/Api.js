const Url = require('../src/Url');

const Api = {
  async login(browserInstance) {
    const credentials = JSON.parse(fs.readFileSync('creds.json'));
    await browserInstance
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
      .url('https://www.instagram.com/');
  },

  getUser(browserInstance, username) {
    return browserInstance
      .executeAsync(
        (usernameUrl, done) => {
          fetch(usernameUrl, { credentials: 'include' })
          .then(response => response.json())
          .then(data => done(data.graphql.user.id))
        },
        Url.getUsernameUrl(username),
      );
  },
/*
  // Get username's followers (first few) - working with pagination
  getUserFollowers(userId, afterCursor = null) {
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
    console.info('GET followers of user', userId, afterCursor);
    return Api.getEndpoint(Url.graphqlApiUrl, query)
      .then(JSON.parse);
  },

  // Returns up to numFollowers of the target userId
  // Wrapper around getUserFollowers() to simplify/remove pagination complications 
  getUserFollowersFirstN: async (userId, numFollowers = null, blacklist = new Set()) => {
    if (!numFollowers) {
      return Api.getUserFollowers(userId);
    }
    const followers = [];
    const appendFollowers = (data) => followers.push(...data.data.user.edge_followed_by.edges
      .filter(({ node }) => !node.is_private)
      .map(({ node: { id, username } }) => ({ id, username }))
      .filter(({ id }) => !blacklist.has(id))
    );

    let endCursor = null;
    let hasNextPage = false;
    do {
      const moreFollowers = await Api.getUserFollowers(userId, endCursor);
      appendFollowers(moreFollowers);
      const nextPage = moreFollowers.data.user.edge_followed_by.page_info;
      endCursor = nextPage.end_cursor;
      hasNextPage = nextPage.has_next_page;
    } while (hasNextPage && followers.length < numFollowers);
    
    const resultFollowers = followers.slice(0, numFollowers);
    console.info(`Found ${resultFollowers.length} out of ${numFollowers} followers requested`);
    return resultFollowers;
  },*/
};

module.exports = Api;
