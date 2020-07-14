const selenium = require('selenium-standalone');
const webdriverio = require('webdriverio');
const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');
const Random = require('../shared/Random');
const Api = require('./Api');
const config = require('./config');

let client = null;

// verified limit of maximum accounts one can follow in 1 hour
const followRequestsPerHourLimit = 40;
let seleniumProcess = null;

exports.init = async (login = true) => {
  console.info('Starting Selenium process...');
  seleniumProcess = await new Promise((resolve, reject) => {
    selenium.start({
      logger: message => console.log('Selenium logs: ', message),
    }, (error, child) => {
      if (error) {
        console.error(error);
        return reject(error);
      }
      child.stderr.on('data', data => {
        console.info('>>>', data.toString());
      });
      resolve(child);
    });
  });
  console.info('Selenium process started. Starting WebDriver.IO');
  client = await webdriverio.remote(config.webdriverBrowserConfig);
  console.info('Webdriver.IO started and client initialized.');
  console.info('Browser in headless mode?', config.isHeadless);

  Api.setBrowserInstance(client);
  if (login) {
    await Api.login(Data.getCredentials());
  }
};

exports.end = async (logout = true) => {
  if (logout) {
    await Api.logout();
  }
  await client.deleteSession();

  if (seleniumProcess) {
    console.info('Terminating selenium process...');
    seleniumProcess.kill();
  }
};

/**
 * FOLLOW CYCLE STRATEGY
 * To follow ~40ppl from various sources:
 * ->home->browse & like some
 * ->search->big page->recent post->10-15people
 * ->home->browse & like some
 * ->search for another big hashtag page ->recent post-> 10-15 people
 * ...etc. until 40-50 total (should get ~20% conversion or more)
 * This shouldn't be super slow because as a user you wouldn't be slow either.
 * Don't mix with unfollow - that's not human natural.
 */
exports.runFollowStrategy = async (targetHashtags, followRequestsCount = 40) => {
  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');
  console.info('Target number of Follows:', followRequestsCount);
  let followedSoFar = 0;

  while (followedSoFar < followRequestsCount) {
    await Api.browseHomeFeed(/* durationSeconds */ Random.integerInRangeInclusive(80, 100));

    const hashtag = Random.pickArrayElement(targetHashtags);
    await Api.navigateToRecentHashtagPost(hashtag);

    const remainingToFollow = followRequestsCount - followedSoFar;
    const toFollowNext = Math.min(remainingToFollow, Random.integerInRangeInclusive(5, 8));
    const accountsFollowed = await Api.followAccountsFromPostLikers(toFollowNext);
    if (accountsFollowed.length > 0) {
      followedSoFar += accountsFollowed.length;
      // Pick one, and visit their profile for a little bit
      await Api.visitUserFeed(Random.pickArrayElement(accountsFollowed).username);
    }

    await Api.browseExploreFeed(/* durationSeconds */ Random.integerInRangeInclusive(25, 35));
    console.info(''); // blank line
  }
  console.info(new Date().toLocaleString(), 'Completed main follow algorithm...');
};

// We'll get larger amount of followers first, many will be skipped
exports.runLegacyFollowStrategy = async (initialTarget, followRequestsCount = 40) => {
  console.info(new Date().toLocaleString(), 'Executing legacy main follow algorithm...');

  const numUsersToProcess = followRequestsCount * 4;
  const alreadyProcessed = new Set(Data.getProcessedAccountsList());
  let futureFollowList = [];

  if (initialTarget.username) {
    console.info(`Initial target is a user: ${initialTarget.username}`);
    // Get target user id
    const targetUserId = (await Api.getUser(initialTarget.username)).id;
    console.info('Target user id:', targetUserId);
    futureFollowList = await Api.getUserFollowersFirstN(targetUserId,
      numUsersToProcess, alreadyProcessed);
  } else if (initialTarget.hashtag) {
    console.info(`Initial target is a hashtag: ${initialTarget.hashtag}`);
    // Get hashtag media feed
    const hashtagApiData = await Api.getHashtag(initialTarget.hashtag);
    const hashtagTopPosts = [
      ...hashtagApiData.edge_hashtag_to_top_posts.edges,
      ...hashtagApiData.edge_hashtag_to_media.edges,
    ].filter(x => x.node.edge_liked_by.count > 50);

    futureFollowList = await Api.getMediaLikersFromPosts(
      hashtagTopPosts.map(post => post.node.shortcode), numUsersToProcess, alreadyProcessed);
  } else {
    console.error('Invalid initial target. Aborting...');
    return;
  }
  
  // Follow users (but make sure they are quality accounts first)
  const qualityFutureFollowList = [];
  let skippedInARow = 0;
  const maximumSkipInARow = 4;
  for (const [index, account] of futureFollowList.entries()) {
    const getViaApi = (index + 1) % 12 === 0; // every 12th via API? 
    if (getViaApi) {
      console.log('(using API:)');
    }
    const accountData = (getViaApi ?
      await Api.getUserViaApi(account.username) :
      await Api.getUser(account.username)
    );
    if (!accountData) {
      console.log(`Error when retrieving account data for ${account.username}. Skipping.`);
      await Api.waitPerUser(2);
      continue;
    }
    const accountQualityDecision = Algorithm.decideAccountQuality(accountData, /* isSimplified */ false);
    if (accountQualityDecision.isQualityAccount || skippedInARow >= maximumSkipInARow) {
      if (!accountQualityDecision.isQualityAccount && skippedInARow >= maximumSkipInARow) {
        console.log(`(Force following ${account.username} anyway - too many skipped...)`);
      }
      skippedInARow = 0;
      qualityFutureFollowList.push(account);
      await Api.followUser(account.username, /* skipNavigationToPage */ !getViaApi);

      // hourly follow limit reached? - stop now
      if (qualityFutureFollowList.length >= Math.min(followRequestsPerHourLimit - 2, followRequestsCount)) {
        console.log('Hourly limit reached, skipping the rest...');
        futureFollowList = futureFollowList.slice(0, index + 1);
        break;
      }
    } else {
      console.log(`:> skipping ${account.username} (${accountQualityDecision.reason})`);
      skippedInARow += 1;
      await Api.waitPerUser(1);
    }
  }

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);

  console.info('Followed: ', qualityFutureFollowList);
  console.info('Total processed: ', futureFollowList.length);
  console.info('Total followed: ', qualityFutureFollowList.length);
};

/**
 * UNFOLLOW CYCLE STRATEGY
 * 40/50 per hour directly from the profile page. Count same as follow action (same limits)
 * Maybe 5x per day (same as follow cycles).
 * Since we have a few weeks of just follow followed by several weeks of just unfollow,
 * we can simply unfollow everyone without time filtering.
 * If you try to unfollow 40 in a short while, Instagram will FAKE the unfollow action
 * and won't actually execute it
 */
exports.runUnfollowStrategy = async (unfollowRequestsCount = 40) => {
  console.info(new Date().toLocaleString(), 'Executing main unfollow algorithm...');
  console.info('Target number of Unfollows:', unfollowRequestsCount);

  const unfollowList = Data.getFutureUnfollowList();
  if (unfollowList.length == 0) {
    console.info('Error: Nobody to unfollow. Aborting...');
    return;
  }
  let accountsUnfollowed = 0;
  do {
    console.info('First browsing a little...');
    await Api.browseHomeFeed(/* durationSeconds */ Random.integerInRangeInclusive(80, 100));

    const amountToUnfollowNext = Math.min(
      Random.integerInRangeInclusive(15, 20),
      unfollowRequestsCount - accountsUnfollowed
    );
    const unfollowedCount =
      await Api.unfollowUsersFromPersonalProfilePage(unfollowList, amountToUnfollowNext);
    // DO NOT Update storage - Because if Instagram FAKES unfollow, then we lose track
    
    if (unfollowedCount <= 0) {
      console.log('Error: something went wrong and it did not unfollow anybody');
      break;
    }
    accountsUnfollowed += unfollowedCount;
    console.log('');
  } while (accountsUnfollowed < unfollowRequestsCount);

  await Api.browseExploreFeed(/* durationSeconds */ Random.integerInRangeInclusive(25, 35));

  console.info(new Date().toLocaleString(), 'Completed main unfollow algorithm.');
};

exports.runLegacyUnfollowStrategy = async (unfollowLimit) => {
  console.info(new Date().toLocaleString(), 'Executing legacy mass unfollow algorithm...');
  await Api.waitPerUser(20); // pause for safety

  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists(unfollowLimit);

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const [index, account] of toUnfollow.entries()) {
    console.info(`Processing ${(index + 1)}/${toUnfollow.length}`);
    const success = await Api.unfollowUser(account.username);
    if (!success && account.userId) {
      const newUsername = await Api.getUsernameFromUserId(account.userId);
      console.log('New username: ', newUsername);
      if (newUsername) {
        await Api.unfollowUser(newUsername);
      } else {
        Data.appendUserToBeUnfollowedById({ ...account, username: newUsername });
      }
    }
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);

  await Api.waitPerUser(20 + Math.max(0, unfollowLimit - toUnfollow.length));
};

// Unfollow based on a provided list
exports.runMassUnfollowFromList = async (usernamesToUnfollow) => {
  console.info(new Date().toLocaleString(), 'Executing mass unfollow based on the provided list...');
  console.info(`Accounts to be unfollowed: ${usernamesToUnfollow.length}`);
  for (const [index, username] of usernamesToUnfollow.entries()) {
    console.info(`Processing ${(index + 1)}/${usernamesToUnfollow.length}`);
    await Api.unfollowUser(username);
  };
};

// manually goes through a list of accounts (e.g. manually decide to unfollow or not)
exports.runBrowseList = async (usernameList) => {
  console.info('Iterating a list of accounts...');
  for (const [index, username] of usernameList.entries()) {
    const data = await Api.getUser(username);
    // const data = await Algorithm.decideAccountQuality(await Api.getUserViaApi(username), /* isSimplified */ false);
    console.log('Data: ', data);
  }
  // Uncomment to pause after being done (debugging purposes)
  await Api.waitPerUser(1000);
};

// Sometimes people get away from our list, (e.g. they change their username)
// This function finds the full following list, and subtracts my fixed
// following list (the list of usernames that I actually want to follow) and also
// subtracts the accounts that are actually tracked
exports.runGetUntrackedFutureUnfollowAccounts = async (fixedFollowingList) => {
  const followingList = await Api.getUserFollowingList();
  const currentUnfollowList = Data.getFutureUnfollowList().map(acc => acc.username);
  const untrackedFutureUnfollows = followingList.filter(x =>
    !fixedFollowingList.includes(x) && !currentUnfollowList.includes(x)
  );
  console.log('Following list:', JSON.stringify(followingList, null, 2));
  console.log('UntrackedFutureUnfollows', JSON.stringify(untrackedFutureUnfollows, null, 2));
  console.log('Accounts untracked:', untrackedFutureUnfollows.length);
  return untrackedFutureUnfollows;
};

exports.takeErrorScreenshot = async () => {
  console.info('Saving error screenshot...');
  await client.saveScreenshot(`./error_termination_${Random.integerInRange(11111, 99999)}.png`);
  await Api.waitPerUser(1);
};


// Try to query some divs in example.com
const runExperimentExample = async () => {
  await Api.navigate('https://example.com');
  await client.execute(() => {
    setInterval(() => {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      div1.className = 'aaa';
      div1.textContent = 'Hello again';
      div1.onclick = function() { this.className = 'ccc'; };
      div2.className = 'bbb';
      div2.textContent = 'Hi';
      document.body.appendChild(div1);
      document.body.appendChild(div2);
    }, 1000);
  });
  await Api.waitPerUser(0.4);
  const divs1 = await client.$$('.undefined');
  const divs2 = await client.$$('.bbb,:not(.ccc).aaa.aaa');
  const divs = divs1.concat(divs2);
  for (const div of divs) {
    console.log('found', div.elementId, divs.length);
    await div.scrollIntoView({ behavior: 'smooth' });
    await div.click();
    await Api.waitPerUser(0.1);
  }
}

exports.setUpExperiment = async () => {
  // await Api.login(Data.getCredentials());
  // const inputData = JSON.parse(require('fs').readFileSync('./tmp.json')).data;
  // await exports.runBrowseList(inputData); // ['pnwisbeautiful']);
  // const untrackedAccounts = await exports.runGetUntrackedFutureUnfollowAccounts(
  //   inputData
  // );
  // await exports.runMassUnfollowFromList(inputData.slice(0, 30));
  
  await runExperimentExample();
};
