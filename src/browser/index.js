const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);

const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');

const Api = require('./Api');
const followRequestsPerHourLimit = 40; // verified limit of maximum accounts one can follow in 1 hour
const numUsersToProcess = 100; // We'll get this amount of followers first, many will be skipped

exports.runMain = async (initialTarget) => {
  await client.init();
  await Api.login(client, Data.getCredentials());

  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');

  // Get target user id
  const targetUsername = initialTarget.username;
  const targetUserId = (await Api.getUser(client, targetUsername)).id;
  console.info('Target user id', targetUserId);
  
  const alreadyProcessed = new Set(Data.getProcessedAccountsList().map(account => account.userId));
  let futureFollowList = await Api.getUserFollowersFirstN(client, targetUserId,
    numUsersToProcess, alreadyProcessed);
  
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
      console.log('Skipping', account.username);
    }
  }

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);

  console.info('Total processed: ', futureFollowList.length);
  console.info('Total followed: ', qualityFutureFollowList.length);
  console.info('Followed: ', qualityFutureFollowList);
  Api.logout(client);
  // await client.end();
};

exports.runMassUnfollow = async () => {
  await client.init();
  await Api.login(client, Data.getCredentials());

  console.info(new Date().toLocaleString(), 'Executing mass unfollow...');

  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists();

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const account of toUnfollow) {
    await Api.unfollowUser(client, account.username);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);

  Api.logout(client);
  // await client.end();
};


