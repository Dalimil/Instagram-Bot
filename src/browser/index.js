const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);

const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');
const Url = require('../shared/Url');

const Api = require('./Api');
const followRequestsPerHourLimit = 40; // verified limit of maximum accounts one can follow in 1 hour
const numUsersToProcess = 100; // We'll get this amount of followers first, many will be skipped

exports.init = async () => {
  await client.init();
  await Api.login(client, Data.getCredentials());
};

exports.end = async () => {
  await Api.logout(client);
  // await client.end();
};

exports.runMain = async (initialTarget) => {
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
    const { edges: hashtagTopPosts } = (await Api.getHashtag(client, initialTarget.hashtag))
      .edge_hashtag_to_top_posts;
    const { node: targetPopularPost } = hashtagTopPosts[Math.floor(Math.random() * hashtagTopPosts.length)];
    const targetMediaId = targetPopularPost.shortcode;
    console.info(`Target likers of media post: ${Url.getMediaUrl(targetMediaId)}`);
    futureFollowList = await Api.getMediaLikersFirstN(client, targetMediaId,
      numUsersToProcess, alreadyProcessed);
  } else {
    console.error('Invalid initial target. Aborting...');
    return;
  }
  
  // Follow users (but make sure they are quality accounts first)
  const qualityFutureFollowList = [];
  for (const [index, account] of futureFollowList.entries()) {
    const accountData = await Api.getUser(client, account.username);
    if (Algorithm.isQualityAccount(accountData)) {
      qualityFutureFollowList.push(account);
      await Api.followUser(client, account.username);

      // hourly follow limit reached? - stop now
      if (qualityFutureFollowList.length >= followRequestsPerHourLimit - 2) {
        console.log('Hourly limit reached, skipping the rest...');
        futureFollowList = futureFollowList.slice(0, index + 1);
        break;
      }
    } else {
      console.log(':> skipping', account.username);
    }
  }

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);

  console.info('Total processed: ', futureFollowList.length);
  console.info('Total followed: ', qualityFutureFollowList.length);
  console.info('Followed: ', qualityFutureFollowList);
};

exports.runMassUnfollow = async () => {
  console.info(new Date().toLocaleString(), 'Executing mass unfollow...');

  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists();

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const account of toUnfollow) {
    await Api.unfollowUser(client, account.username);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);
};


