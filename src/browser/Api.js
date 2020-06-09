const Url = require('../shared/Url');
const Data = require('../shared/Data');
const Utils = require('../shared/Utils');
const Random = require('../shared/Random');
const config = require('./config');

const waiting = Random.waitingMs;

const Selectors = {
  followButton: 'button*=Follow',
  followingButton: '[aria-label="Following"]',
  unfollowButton: 'button*=Unfollow',
  notificationPromptButton: 'button=Not Now',
  homeScreenPromptButton: 'button=Cancel',
  searchInput: 'input[placeholder=Search]',
  storyButton: 'button.OE3OK',
  storyCloseButton: 'button.-jHC6',
  postHeartButton: '.fr66n:not(.FY9nT) button.wpO6b',
  commentHeartButton: ':not(.FY9nT) button.wpO6b.ZQScA',
  explorePagePostLink: 'a[href^="/p/"]'
};

// We initialize this via API and use as a global
let browser = null;

const Api = {
  setBrowserInstance(browserInstance) {
    browser = browserInstance;
  },

  async navigate(url, waitTimeMs = 3000) {
    await browser.url(url);
    await browser.execute(() => {
      const falsifyWebdriver = () => {
        Object.defineProperty(navigator, 'webdriver', {value: false, configurable: true});
        Object.defineProperty(navigator, 'plugins', [1, 2, 3, 4, 5]);
      };
      falsifyWebdriver();
      setInterval(falsifyWebdriver, 500);
    });
    await waiting(waitTimeMs);
  },

  async login(credentials) {
    await Api.navigate(Url.defaultUrl);

    console.info('Trying to restore previous session...');
    const cookies = Data.getCookieSession();
    for (const cookie of cookies) {
      await browser.setCookies(cookie);
    }
    await Api.navigate(Url.defaultLoginUrl);
    
    const isNotLoggedIn = (await browser.getTitle()).toLowerCase().includes('login');
    if (isNotLoggedIn) {
      console.info('Logging in', credentials.username, '...');
      const userNameField = await browser.$('[name=username]');
      await userNameField.click();
      await browser.keys(credentials.username);
      await waiting(7000);
      const logInButton = await browser.$('button=Log In');
      await logInButton.click();
      await waiting(5000);

      const isChallenged = (await browser.getUrl()).includes('challenge');
      if (isChallenged) {
        // Wait for the user to solve it manually
        console.info('Waiting for user to solve the challenge...');
        await browser.waitUntil(
          () => browser.getUrl().then(url => !url.includes('challenge')),
          120 * 1000, // 2min
          'Took too long to solve challenge',
          1000, // check again every second
        );
      }
    } else {
      console.info('Already logged in');
    }
    await Api.dismissHomePageNotifications();
  },

  async dismissHomePageNotifications() {
    const notificationPromptButton = await browser.$(Selectors.notificationPromptButton);
    if (!!notificationPromptButton) {
      console.info('Dismissing notification prompt.');
      await notificationPromptButton.click();
    }
    const homeScreenPromptButton = await browser.$(Selectors.homeScreenPromptButton);
    if (homeScreenPromptButton) {
      console.info('Dismissing home page prompt.');
      await homeScreenPromptButton.click();
    }
    // Dismiss any remaining notification
    await waiting(2000);
    await browser.click('body');
  },

  async logout(force = false) {
    if (force) {
      console.info('Logging out...');
      await Api.navigate(Url.logoutUrl);
      await Api.navigate(Url.defaultUrl);
    } else {
      // persist cookies only
      console.info('Ending session...');
      const cookies = await browser.getCookies();
      Data.storeCookieSession(cookies);

      await Api.navigate('https://example.com');
    }
  },

  async browseHomeFeed(durationSeconds) {
    console.info(new Date().toLocaleString(), 'Starting home feed browse...');
    const startTimeMs = Date.now(); 
    let timeSpent = 0;

    // load home page
    await Api.navigate(Url.defaultUrl, 10 * 1000);
    await Api.dismissHomePageNotifications();

    // load a few stories
    const success = await Api.browseStories();
    timeSpent = success ? 20 : 10;

    // Scroll down and like
    try {
      const postHearts = await browser.$$(Selectors.postHeartButton);
      const commentHearts = await browser.$$(Selectors.commentHeartButton);
      console.info('Post hearts:', postHearts.length);
      console.info('Comment hearts:', commentHearts.length);

      const hearts = postHearts.concat(commentHearts);
      for (const heartButton of hearts) {
        await heartButton.scrollIntoView(Random.getScrollIntoViewParams());
        if (Random.coinToss(40)) {
          if (!config.isBrowseOnlyMode) {
            await heartButton.click();
          }
          await waiting(4000);
          await Api.verifyActionBlocked();
          timeSpent += 4;
        }
        await waiting(3000);
        timeSpent += 3;
        if (timeSpent > durationSeconds) {
          break; // end
        }
      }
    } catch (e) {
      console.info('Error occurred when liking home feed', e);
      await browser.saveScreenshot('./error_home_feed_browse.png');
    }
    const endTimeMs = Date.now();
    console.info('Done browsing. Time spent:', Math.round((endTimeMs - startTimeMs)/1000), 'seconds');
  },

  async browseStories() {
    if (config.isMobile) {
      return false; // mobile version has no stories
    }
    console.info('Starting browsing stories..');
    // Remember that watching a story also counts as an action
    let success = true;
    try {
      const stories = await browser.$$(Selectors.storyButton);
      if (stories.length > 10) {
        const story = stories[Random.integerInRange(8, 10)];
        await story.click();
        await waiting(15000);
        const storyCloseButton = await browser.$(Selectors.storyCloseButton);
        await storyCloseButton.click();
      }
    } catch (e) {
      console.info('Failed loading stories', e);
      await browser.saveScreenshot('./error_stories_browse.png');

      // reset
      await Api.navigate(Url.defaultUrl);
      await Api.dismissHomePageNotifications();
      success = false;
    }
    console.info('Stories done.');
    return success;
  },

  async browseExploreFeed(durationSeconds) {
    console.info(new Date().toLocaleString(), 'Starting explore feed browse...');
    const startTimeMs = Date.now(); 

    await Api.navigate(Url.exploreUrl, 6000);

    let timeSpent = 7;
    const postLinks = await browser.$$(Selectors.explorePagePostLink);
    for (const postLink of postLinks) {
      await postLink.scrollIntoView(Random.getScrollIntoViewParams());
      await waiting(2000);
      timeSpent += 2;
      if (timeSpent > durationSeconds) {
        break;
      }
    }
    const endTimeMs = Date.now();
    console.info('Done browsing. Time spent:', Math.round((endTimeMs - startTimeMs)/1000));
  },

  async verifyActionBlocked() {
    const isActionBlocked = (
      await browser.isExisting('*=Action Blocked') ||
      await browser.isExisting('*=Temporarily Blocked')
    );
    if (isActionBlocked) {
      // First try to click the OK buttons
      const okButton = await browser.$('=OK');
      const ignoreButton = await browser.$('=Ignore');
      if (okButton) {
        await okButton.click();
      } else if (ignoreButton) {
        await ignoreButton.click();
      }
      // Log, pause, throw
      await browser.saveScreenshot('./error_action_blocked.png');
      await waiting(30 * 60 * 1000); // 30 minutes
      throw new Error('Action Blocked');
    }
  },

  async navigateToRecentHashtagPost(hashtag) {
    console.info('Navigating to', hashtag, 'using search...');
    if (config.isMobile) {
      // For mobile web the search is only in explore page
      await Api.navigate(Url.exploreUrl, 6000);
    }
    await browser
      .click(Selectors.searchInput)
      .catch(e => {
        console.info('Could not type in search box', e);
      });
    await browser.keys(['#', ...hashtag.split('')]);
    await waiting(5000);
    const searchResult = browser.$(`a[href="/explore/tags/${hashtag}`);
    if (searchResult) {
      await searchResult.click();
    } else {
      console.info('Could not click search result', e);
      await Api.navigate(Url.getHashtagUrl(hashtag));
    }

    // Now we are at the hashtag explore page
    const recentPosts = [...(await browser.$(Selectors.explorePagePostLink))].slice(0, 3);
    const targetPost = Random.pickArrayElement(recentPosts);

    await targetPost.scrollIntoView(); // fix this and the click
    await targetPost.click();
    await waiting(5000);
    console.info('Hashtag post opened');
  },

  /** Makes the assumption that the post page popup is already opened */
  async followAccountsFromPostLikers(accountsToFollow) {
    console.info('Opening list of post likers');
    const otherLikersButtonLink = await browser.$('button*=others');
    await otherLikersButtonLink.click();
    await waiting(5000);

    // Now we see list of users who liked it - it is a recent photo so these users are 'engaged'
    //const acountsToFollow
    //console.info('likers');
    // todo
    
    const alreadyProcessed = new Set(Data.getProcessedAccountsList());
  // Update storage
  //Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);
    let numberFollowed = 0;

    if (config.isBrowseOnlyMode) {
      return 8; // just approximate number to progress the program
    }
    return numberFollowed;
  },

  async verifyUserPageDataAccess(username) {
    await Api.navigate(Url.getUserPageUrl(username), 8000);
    const userDataTest = await browser
      .executeAsync(done => {
        if (!window._sharedData || window._sharedData.entry_data.HttpErrorPage) {
          const innerHtml = document.documentElement.innerHTML;
          done(JSON.stringify({
            botDetected: innerHtml.includes('wait a few minutes'),
            invalidLink: innerHtml.includes('may have been removed') ||
              (window._sharedData && !!window._sharedData.entry_data.HttpErrorPage)
          }));
        } else {
          done(JSON.stringify({
            data: window._sharedData.entry_data.ProfilePage[0].graphql.user.profile_pic_url
          }));
        }
      })
      .catch(e => {
        console.error('Error in accessing getUser data.', e);
        return null;
      });
    if (userDataTest === null) {
      // For some unknown reason, user data is not available at this time.
      await browser.saveScreenshot('./error_capture_userDataTest_null.png');
      await waiting(120 * 1000);
    } else {
      const testData = JSON.parse(userDataTest.value);
      if (!testData.data) {
        // _sharedData was not defined on the window
        console.log('User page not accessible.');
        if (!!testData.botDetected) {
          console.log('Bot detected! -- waiting and trying to recover...');
          await waiting(8 * 1000);
          await Api.navigate(Url.defaultUrl); // home page
          await waiting(9 * 60 * 1000); // wait 9 minutes (the bot has been detected)
          await Api.navigate(Url.exploreUrl); // explore page
          await waiting(9 * 60 * 1000); // wait 9 more minutes
          // Retry
          await Api.navigate(Url.getUserPageUrl(username));
        } else if (!!testData.invalidLink) {
          console.log('Invalid account username: ', username);
          return false;
        } else {
          // Unknown error
          await browser.saveScreenshot('./error_capture_sharedData_undefined.png');
          return false;
        }
      }
    }
    return true;
  },

  // Returns user info/details
  async getUser(username) {
    // Access page and verify data is present and bot not detected
    await Api.verifyUserPageDataAccess(username);

    const userData = await browser
      .executeAsync(
        (decycleFnString, done) => {
          if (!window._sharedData) {
            console.error('User data still blocked via bot detection.');
            done(JSON.stringify(null));
          } else {
            // executeAsync can only take primitive types as arguments
            const Utils = { decycle: eval(decycleFnString) };
            const graphData = {
              ...window._sharedData.entry_data.ProfilePage[0].graphql.user
            };
            const normalizedGraphData = Utils.decycle(graphData);
            done(JSON.stringify(normalizedGraphData));
          }
        },
        Utils.decycle.toString()
      ).catch((e) => {
        console.error('Error in getUser: ', e);
        return { value: JSON.stringify(null) };
      });
    await waiting(6000);
    return JSON.parse(userData.value);
  },

  // Same as getUser but instead of navigating to user instagram page it uses the API
  async getUserViaApi(username) {
    await Api.navigate(Url.getUsernameApiUrl(username), 8000);

    const userDataRaw = await (await browser.$('body')).getText();
    let userData = null; 
    try {
      userData = JSON.parse(userDataRaw).graphql.user;
    } catch (err) {
      console.error('Error in getUserViaApi: ', userDataRaw, err);
    }
    return userData;
  },

  // Returns a list of posts that have this hashtag
  async getHashtag(hashtag) {
    const hashtagData = await browser
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
  async queryGraphqlApi(queryHash, variables) {
    const query = {
      query_hash: queryHash,
      variables: JSON.stringify(variables),
    };
    const data = await browser
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
    await waiting(5000);
    return data.value;
  },

  // Get username's followers (first few) - working with pagination
  getUserFollowers(userId, afterCursor = null) {
    const variables = {
      id: userId,
      first: 40, // must be < 50
      ...(!!afterCursor ? { after: afterCursor } : {}), // for pagination
    };
    console.info(`GET ${afterCursor ? 'more ' : ''}followers of user ${userId}`);
    return Api.queryGraphqlApi('7dd9a7e2160524fd85f50317462cff9f', variables)
      .then(data => data.user.edge_followed_by);
  },

  // Get a list of people who liked this media (first few) - working with pagination
  getMediaLikers(mediaId, afterCursor = null) {
    const variables = {
      shortcode: mediaId,
      first: afterCursor ? 12 : 24, // must be < 50
      ...(!!afterCursor ? { after: afterCursor } : {}), // for pagination
    };
    console.info(`GET ${afterCursor ? 'more ' : ''}likers of media ${mediaId}`);
    return Api.queryGraphqlApi('e0f59e4a1c8d78d0161873bc2ee7ec44', variables)
      .then(data => data ? data.shortcode_media.edge_liked_by : null);
  },

  // Returns up to numLikers of the target mediaId
  // Wrapper around getMediaLikers() to simplify/remove pagination complications 
  async getMediaLikersFirstN(mediaId, numLikers, blacklist) {
    // Navigating there first makes the behaviour more human
    await Api.navigate(Url.getMediaUrl(mediaId));

    const mediaLikers = await Api.getListOfAccountsFirstN(
      (afterCursor) => Api.getMediaLikers(mediaId, afterCursor || null),
      numLikers,
      blacklist,
    );
    console.info(`Found ${mediaLikers.length} out of ${numLikers} likers requested`);
    return mediaLikers;
  },

  // Takes a list of media shortcodes and returns up to numLikers accounts who have liked
  // some of those media. Utilizes getMediaLikersFirstN for individual calls
  async getMediaLikersFromPosts(rawMediaShortcodes, numLikers, accountBlacklist) {
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
  async getUserFollowersFirstN(userId, numFollowers, blacklist) {
    const userFollowers = await Api.getListOfAccountsFirstN(
      (afterCursor) => Api.getUserFollowers(userId, afterCursor || null),
      numFollowers,
      blacklist,
    );
    console.info(`Found ${userFollowers.length} out of ${numFollowers} followers requested`);
    return userFollowers;
  },

  // Returns up to numAccounts accounts (followers or likers), using the apiGetDataMethod (which uses pagination)
  // Wrapper to simplify/remove pagination complications
  async getListOfAccountsFirstN(getApiDataMethod, numAccounts = null, blacklist = new Set()) {
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

  async getUserFollowing(username) {
    console.info('Retrieving user following list...');
    
    await Api.navigate(Url.getUserPageUrl(username));
    const followingButton = await browser.$('a*=following');
    await followingButton.click();
    const listNodeSelector = '.isgrP';
    await browser.waitForExist(listNodeSelector);
    await waiting(2000);
    await browser.timeouts('script', 1200 * 1000); // 20 min
    const followingList = await browser
      .executeAsync(
        (listNodeSelector, done) => {
          // Manually scroll down to load the full list of accounts
          const listNode = document.querySelector(listNodeSelector);
          const getList = () => [...document.querySelectorAll('.FPmhX')].map(x => x.textContent);
          console.info('Initiating scrolling...');
          let previousListLength = 0;
          let terminationTask = null;
          const scrollingTask = setInterval(() => {
            listNode.scrollBy(0, Random.integerInRange(150, 200));
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
  async followUser(username, skipNavigationToPage) {
    console.info('Following', username, '...');
    if (!skipNavigationToPage) {
      await Api.navigate(Url.getUserPageUrl(username));
    }
    const followButton = await browser.$(Selectors.followButton);
    await followButton.click();
    await browser
      .waitForExist(Selectors.followingButton, 15000)
      .catch(async (e) => {
        if (e.type == 'WaitUntilTimeoutError') {
          console.info('Missing follow confirmation indicator for', username, ' - refreshing...');
          await Api.navigate(Url.getUserPageUrl(username), 8000);
          const retrySuccess = await browser.isExisting(Selectors.followingButton).catch(() => false);
          if (retrySuccess) {
            console.info('Confirmation success');
          } else {
            console.error('Tried refreshing without successful confirmation.', e);
          }
        } else {
          console.error('Error occurred when trying to follow', username, e.message);
          browser.saveScreenshot('./error_capture_when_following.png');
        }
      });
    await waiting(5000);
  },

  async unfollowUser(username) {
    // Access page and verify data is present and bot not detected
    const verificationSuccess = await Api.verifyUserPageDataAccess(username);
    if (!verificationSuccess) {
      console.log('Skipping unfollowing of a non-existent account', username);
      return false;
    }

    const tryUnfollow = async () => {
      console.log('Unfollowing', username, '...');
      const alreadyUnfollowed = await browser.isExisting(Selectors.followButton).catch(() => false);
      if (alreadyUnfollowed) {
        console.info('Already unfollowed.');
        return true;
      }
      try {
        const followingButton = await browser.$(Selectors.followingButton);
        await followingButton.click(); // click 'Following' to unfollow
        await browser.waitForExist(Selectors.unfollowButton, 9000);
        await waiting(5000);

        const unfollowButton = await browser.$(Selectors.unfollowButton);
        await unfollowButton.click(); // click 'Unfollow' inside the pop-up dialog
        await browser.waitForExist(Selectors.followingButton, 15000, /* reverse */ true);
        await waiting(8000);
      } catch (err) {
        console.info('Error when unfollowing.', username, err);
        browser.saveScreenshot('./error_capture_when_unfollowing.png');
      }
      // If we are doing too many unfollows in a row, Instagram pretends we unfollowed
      //  the person but it switches back on refresh, so we need confirmation
      
      await Api.navigate(Url.getUserPageUrl(username));
      return !!(await browser.isExisting(Selectors.followButton).catch(() => false));
    }
    const success = await tryUnfollow();
    if (success) {
      return true;
    }
    // Instagram is likely rate limiting us, we should wait
    console.info('Unfollow not successful. Rate limiting suspected.')
    // We retry once
    await waiting(14 * 60 * 1000); // wait 14 minutes
    await Api.navigate(Url.getUserPageUrl(username));
    return (await tryUnfollow());
  },

  async getUsernameFromUserId(userId) {
    const requestPromise = require('request-promise');
    return await requestPromise({
        uri: `https://i.instagram.com/api/v1/users/${userId}/info/`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60 Instagram 12.0.0.16.90 (iPhone9,4; iOS 10_3_3; en_US; en-US; scale=2.61; gamut=wide; 1080x1920)'
        },
        json: true
    })
    .then(response => response.user.username)
    .catch(() => undefined); // fail this silently
  },

  // This function just takes the same amount of time it would normally take to
  // perform a follow or unfollow action
  async waitPerUser(userCount) {
    await waiting(20000 * userCount);
  },
};

module.exports = Api;
