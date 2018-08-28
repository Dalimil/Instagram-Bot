const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);

const Data = require('../shared/Data');
const Algorithm = require('../shared/Algorithm');

const Api = require('./Api');

exports.runMain = async (numUsersToProcess) => {
  await client.init();
  await Api.login(client, Data.getCredentials());

  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');

  // Get target user id
  const targetUsername = Data.getInitialTargets().initial_accounts[0].username;
  const targetUserId = (await Api.getUser(client, targetUsername)).id;
  console.info('Target user id', targetUserId);

  const alreadyProcessed = new Set(Data.getProcessedAccountsList().map(account => account.userId));
  const futureFollowList = await Api.getUserFollowersFirstN(browserInstance, targetUserId,
    numUsersToProcess, alreadyProcessed);
    
  // Follow users (but make sure they are quality accounts first)
  const qualityFutureFollowList = [];
  for (const account of futureFollowList) {
    const accountData = await Api.getUser(browserInstance, account.username);
    if (Algorithm.isQualityAccount(accountData)) {
      qualityFutureFollowList.push(account);
      await Api.followUser(account.username);
    } else {
      console.log('Skipping', account.username);
    }
  }

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);

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
  for (const userId of toUnfollow) {
    await Api.unfollowUser(userId);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);

  Api.logout(client);
  // await client.end();
};


