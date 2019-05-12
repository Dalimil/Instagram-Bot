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
      ).catch(() => ({
        value: null,
      }));
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
      .then(data => data ? data.shortcode_media.edge_liked_by : null);
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

  // Takes a list of media shortcodes and returns up to numLikers accounts who have liked
  // some of those media. Utilizes getMediaLikersFirstN for individual calls
  async getMediaLikersFromPosts(browserInstance, rawMediaShortcodes, numLikers, accountBlacklist) {
    const blacklistedMediaPosts = Data.getBlacklistedMediaPosts();
    const mediaShortcodes = rawMediaShortcodes.filter(x => !blacklistedMediaPosts.includes(x));

    // Try to pull accounts from each media post one by one
    //  (often first media might be enough to fill limit)
    const resultAccounts = [];
    for (const mediaShortcode of mediaShortcodes) {
      const likersNeeded = numLikers - resultAccounts.length;
      console.info(`Target likers (need ${likersNeeded}) of media post:` +
        ` ${Url.getMediaUrl(mediaShortcode)}`);

      const likerAccounts = await Api.getMediaLikersFirstN(
        browserInstance,
        mediaShortcode,
        likersNeeded,
        new Set([...accountBlacklist, ...resultAccounts.map(acc => acc.userId)]),
      );
      resultAccounts.push(...likerAccounts);

      if (resultAccounts.length < numLikers) {
        // did not fill up limit
        Data.appendBlacklistedMediaPost(mediaShortcode);
      } else { // done
        break;
      }
    }

    return resultAccounts;
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
      if (!moreAccounts) {
        break;
      }
      appendAccounts(moreAccounts);
      console.info(`Accounts found so far: ${accounts.length}`);
      const nextPage = moreAccounts.page_info;
      endCursor = nextPage.end_cursor;
      hasNextPage = nextPage.has_next_page;
    } while (hasNextPage && accounts.length < numAccounts);
    
    return accounts.slice(0, numAccounts);
  },

  async getUserFollowing(browserInstance, username) {
    console.info('Retrieving user following list...');
    const listNodeSelector = '.isgrP';
    const followingList = await browserInstance
      .url(Url.getUserPageUrl(username))
      .pause(2000)
      .click('a*=following')
      .waitForExist(listNodeSelector)
      .pause(2000)
      .timeouts('script', 600 * 1000) // 600s
      .executeAsync(
        (listNodeSelector, done) => {
          // Manually scroll down to load the full list of accounts
          const listNode = document.querySelector(listNodeSelector);
          const getList = () => [...document.querySelectorAll('.FPmhX')].map(x => x.textContent);
          console.info('Initiating scrolling...');
          let previousListLength = 0;
          let terminationTask = null;
          const scrollingTask = setInterval(() => {
            listNode.scrollBy(0, 100);
            const newList = getList();
            if (previousListLength === newList.length) {
              // same length, so initialize termination task, unless already (in that case do nothing)
              if (terminationTask === null) {
                terminationTask = setTimeout(() => {
                  console.info('Finished scrolling task.');
                  clearInterval(scrollingTask);
                  done(newList);
                }, 5000);
              }
            } else {
              // new list length differs, so update
              previousListLength = newList.length;
              clearTimeout(terminationTask);
              terminationTask = null;
            }
          }, 700);
        },
        listNodeSelector
      );
    await waiting(3000);
    return followingList.value;
  },

  /* POST api methods */
  async followUser(browserInstance, username) {
    console.info('Following', username, '...');
    do {
      await browserInstance
        .url(Url.getUserPageUrl(username))
        .pause(2000)
        .click('button=Follow')
        .waitForExist('button=Following', 5000)
        .pause(2000)
        .catch(() => {
          console.error('Error occurred when trying to follow', username);
        });
    } while (
      await browserInstance
        .url(Url.getUserPageUrl(username))
        .isExisting('button=Follow')
        .catch(() => true) // retry on error
    );
  },

  async unfollowUser(browserInstance, username) {
    let isFirstAttempt = true;
    do {
      console.info('Unfollowing', username, '...');
      if (isFirstAttempt) {
        isFirstAttempt = false;
      } else {
        // Instagram is rate limiting us, we need to wait
        await browserInstance.pause(60 * 1000);
      }
      await browserInstance
        .url(Url.getUserPageUrl(username))
        .click('button=Following')
        .waitForExist('button*=Unfollow', 5000)
        .pause(4000)
        .click('button*=Unfollow')
        .waitForExist('button=Following', 5000, /* reverse */ true)
        .pause(4000)
        .catch(err => {
          console.info('Already unfollowed or an error.');
        });
      // If we are doing too many unfollows in a row, Instagram pretends we unfollowed
      //  the person but it switches back on refresh, so we need confirmation
    } while (
      await browserInstance
        .url(Url.getUserPageUrl(username))
        .isExisting('button=Following')
        .catch(() => true) // retry on error
    );
  },
};

module.exports = Api;
