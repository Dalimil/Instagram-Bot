const selenium = require('selenium-standalone');
const webdriverio = require('webdriverio');
const client = webdriverio.remote({
  desiredCapabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: (process.argv.includes('--headless') ? ['headless', 'disable-gpu', 'disable-sync', 'no-sandbox'] : []),
    },
  },
  /*
    desiredCapabilities: {
      browserName: 'firefox',
      "moz:firefoxOptions": {
        args: (process.argv.includes('--headless') ? ['-headless'] : []),
      },
    },
  */
});

const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');
const Url = require('../shared/Url');

const Api = require('./Api');
// verified limit of maximum accounts one can follow in 1 hour
const followRequestsPerHourLimit = 40;
let seleniumProcess = null;

exports.init = async () => {
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
        console.log(data.toString());
      });
      resolve(child);
    });
  });
  
  console.info('Selenium process started.');
  console.info('Browser in headless mode?', process.argv.includes('--headless'));

  await client.init();
  await Api.login(client, Data.getCredentials());
};

exports.end = async () => {
  await Api.logout(client);
  await client.end();

  if (seleniumProcess) {
    console.info('Terminating selenium process...');
    seleniumProcess.kill();
  }
};

// We'll get larger amount of followers first, many will be skipped

exports.runMain = async (initialTarget, followRequestsCount = 40) => {
  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');

  const numUsersToProcess = followRequestsCount * 4;
  const alreadyProcessed = new Set(Data.getProcessedAccountsList());
  let futureFollowList = [];

  if (initialTarget.username) {
    console.info(`Initial target is a user: ${initialTarget.username}`);
    // Get target user id
    const targetUserId = (await Api.getUser(client, initialTarget.username)).id;
    console.info('Target user id:', targetUserId);
    futureFollowList = await Api.getUserFollowersFirstN(client, targetUserId,
      numUsersToProcess, alreadyProcessed);
  } else if (initialTarget.hashtag) {
    console.info(`Initial target is a hashtag: ${initialTarget.hashtag}`);
    // Get hashtag media feed
    const hashtagApiData = await Api.getHashtag(client, initialTarget.hashtag);
    const hashtagTopPosts = [
      ...hashtagApiData.edge_hashtag_to_top_posts.edges,
      ...hashtagApiData.edge_hashtag_to_media.edges,
    ].filter(x => x.node.edge_liked_by.count > 50);

    futureFollowList = await Api.getMediaLikersFromPosts(client,
      hashtagTopPosts.map(post => post.node.shortcode), numUsersToProcess, alreadyProcessed);
  } else {
    console.error('Invalid initial target. Aborting...');
    return;
  }
  
  // Follow users (but make sure they are quality accounts first)
  const qualityFutureFollowList = [];
  for (const [index, account] of futureFollowList.entries()) {
    const accountData = await Api.getUser(client, account.username);
    if (!accountData) {
      console.log(`Error when retrieving account data for ${account.username}. Following anyway.`);
      // continue;
    }
    const accountQualityDecision = accountData ?
      Algorithm.decideAccountQuality(accountData) : { isQualityAccount: true };
    if (accountQualityDecision.isQualityAccount) {
      qualityFutureFollowList.push(account);
      await Api.followUser(client, account.username);

      // hourly follow limit reached? - stop now
      if (qualityFutureFollowList.length >= Math.min(followRequestsPerHourLimit - 2, followRequestsCount)) {
        console.log('Hourly limit reached, skipping the rest...');
        futureFollowList = futureFollowList.slice(0, index + 1);
        break;
      }
    } else {
      console.log(`:> skipping ${account.username} (${accountQualityDecision.reason})`);
    }
  }

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);

  console.info('Followed: ', qualityFutureFollowList);
  console.info('Total processed: ', futureFollowList.length);
  console.info('Total followed: ', qualityFutureFollowList.length);
};

exports.runMassUnfollow = async (unfollowLimit) => {
  console.info(new Date().toLocaleString(), 'Executing mass unfollow...');
  await Api.waitPerUser(client, 20); // pause for safety

  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists(unfollowLimit);

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const [index, account] of toUnfollow.entries()) {
    console.info(`Processing ${(index + 1)}/${toUnfollow.length}`);
    await Api.unfollowUser(client, account.username);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);

  await Api.waitPerUser(client, 20 + Math.max(0, unfollowLimit - toUnfollow.length));
};

// Unfollow based on a provided list
exports.runMassUnfollowFromList = async (usernamesToUnfollow) => {
  console.info(new Date().toLocaleString(), 'Executing mass unfollow based on the provided list...');
  console.info(`Accounts to be unfollowed: ${usernamesToUnfollow.length}`);
  for (const [index, username] of usernamesToUnfollow.entries()) {
    console.info(`Processing ${(index + 1)}/${usernamesToUnfollow.length}`);
    await Api.unfollowUser(client, username);
  };
};

// manually goes through a list of accounts (e.g. manually decide to unfollow or not)
exports.runBrowseList = async (usernameList) => {
  console.info('Iterating a list of accounts...');
  for (const [index, username] of usernameList.entries()) {
    const data = await Api.getUser(client, username);
    // console.log('Data: ', data);
  }
  // Uncomment to pause after being done (debugging purposes)
  // await Api.waitPerUser(client, 1000);
};

// Sometimes people get away from our list, (e.g. they change their username)
// This function finds the full following list, and subtracts my fixed
// following list (the list of usernames that I actually want to follow) and also
// subtracts the accounts that are actually tracked
exports.runGetUntrackedFutureUnfollowAccounts = async (username, fixedFollowingList) => {
  const followingList = await Api.getUserFollowing(client, username);
  const currentUnfollowList = Data.getFutureUnfollowList().map(acc => acc.username);
  const untrackedFutureUnfollows = followingList.filter(x =>
    !fixedFollowingList.includes(x) && !currentUnfollowList.includes(x)
  );
  console.log(JSON.stringify(followingList, null, 2));
  console.log(JSON.stringify(untrackedFutureUnfollows, null, 2));
  console.log('Accounts untracked:', untrackedFutureUnfollows.length);
  return untrackedFutureUnfollows;
};
