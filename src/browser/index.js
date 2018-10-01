const { spawn } = require('child_process');
const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);

const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');
const Url = require('../shared/Url');

const Api = require('./Api');
const followRequestsPerHourLimit = 40; // verified limit of maximum accounts one can follow in 1 hour
const numUsersToProcess = 180; // We'll get this amount of followers first, many will be skipped
let seleniumProcess = null;

exports.init = async () => {
  console.info('Starting Selenium process...');
  seleniumProcess = spawn('selenium-standalone', ['start'], { shell: true });
  seleniumProcess.on('error', err => console.log('Error inside selenium process:', err));
  await new Promise(resolve => {
    seleniumProcess.stdout.on('data', (data) => {
      if (data.toString().toLowerCase().includes('selenium started')) {
        resolve();
      }
    });
  });
  console.info('Selenium process started.');

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

exports.runMain = async (initialTarget, followRequestsCount = 40) => {
  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');

  const alreadyProcessed = new Set(Data.getProcessedAccountsList().map(account => account.userId));
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
      console.log(`Error when retrieving account data for ${account.username}.`);
      continue;
    }
    const accountQualityDecision = Algorithm.decideAccountQuality(accountData);
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

  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists(unfollowLimit);

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const [index, account] of toUnfollow.entries()) {
    console.info(`Processing ${(index + 1)}/${toUnfollow.length}`);
    await Api.unfollowUser(client, account.username);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);
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
    await client.url(Url.getUserPageUrl(username))
      .pause(5000)
      .catch(() => {
        console.error('Error loading', username);
      });
  }
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
  console.log(JSON.stringify(untrackedFutureUnfollows, null, 2));
  console.log('Accounts untracked:', untrackedFutureUnfollows.length);
  return untrackedFutureUnfollows;
};
