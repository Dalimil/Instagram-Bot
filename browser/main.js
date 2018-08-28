const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);

const fs = require('fs');
const Url = require('../src/Url');
const Data = require('../src/Data');

const Api = require('./Api');

(async () => {
  await client.init();
  await Api.login(client);

  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');
  const targetUsername = Data.getInitialTargets().initial_accounts[0].username;
  const targetUserId = await Api.getUser(client, targetUsername);
  console.info('Target user id', targetUserId);

  const alreadyProcessed = new Set(Data.getProcessedAccountsList().map(account => account.userId));
  /*
    const futureFollowList = await Api.getUserFollowersFirstN(targetUserId, numUsersToProcess, alreadyProcessed);
    
    // Follow users (but make sure they are quality accounts first)
    const qualityFutureFollowList = [];
    for (const account of futureFollowList) {
      const shouldSelectAccount = await Algorithm.shouldSelectAccount(account.username);
      if (shouldSelectAccount) {
        qualityFutureFollowList.push(account);
        console.info('Following', account.username);
        if (collectListOnly) {
          Data.storeQualityListCollection(qualityFutureFollowList);
        } else {
          await Api.followUser(account.id);
        }
      } else {
        console.log('Skipping', account.username);
      }
    }
*/
/*
  // Update storage
  const timestamp = Date.now();
  const newlyProcessed = futureFollowList.map(({ id, username }) =>
    ({ userId: id, username, timestamp })
  );
  const newlyFollowed = qualityFutureFollowList.map(({ id, username }) =>
    ({ userId: id, username, timestamp })
  );
  // Store in 'processed' so we don't process them in the future
  Data.storeProcessedAccountsList([
    ...Data.getProcessedAccountsList(),
    ...newlyProcessed
  ]);
  // Store in 'unfollow' so that we unfollow them after 3 days
  Data.storeFutureUnfollowList([
    ...Data.getFutureUnfollowList(),
    ...newlyFollowed
  ]);
*/
  // await client.end();
})();

