const Data = require('../shared/Data');
const Api = require('./Api');
const fs = require('fs');
const Algorithm = require('../shared/Algorithm');

exports.runMain = async (numUsersToProcess, collectListOnly = false) => {
  await Api.login(Data.getCredentials());

  console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');
  // For now we just use the first account
  const initialAccount = Data.getInitialTargets().initial_accounts[0];
  if (!initialAccount) {
    console.error('No initial account target! Aborting...')
    return;
  }
  const targetUsername = initialAccount.username;
  const { id: targetUserId } = (await Api.getUser(targetUsername)).graphql.user;

  const alreadyProcessed = new Set(Data.getProcessedAccountsList());
  const futureFollowList = await Api.getUserFollowersFirstN(targetUserId, numUsersToProcess, alreadyProcessed);
  
  // Follow users (but make sure they are quality accounts first)
  const qualityFutureFollowList = [];
  for (const account of futureFollowList) {
    const accountData = await Api.getUser(account.userId);
    if (Algorithm.isQualityAccount(accountData)) {
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

  // Update storage
  Data.persistNewlyProcessedAndFollowed(futureFollowList, qualityFutureFollowList);
  
  await Api.logout(credentials.username);
};

exports.runMassUnfollow = async () => {
  await Api.login(Data.getCredentials());

  console.info(new Date().toLocaleString(), 'Executing mass unfollow...');
  const { toKeep, toUnfollow } = Algorithm.getCurrentUnfollowLists();

  // Unfollow
  console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
  for (const userId of toUnfollow) {
    await Api.unfollowUser(userId);
  };
  
  // Update storage
  Data.storeFutureUnfollowList(toKeep);

  await Api.logout(credentials.username);
};


async function debugGetDataEndpoints() {
  const myUserData = await Api.getUser(credentials.username);
  const usernameUserData = await Api.getUser('dali_mil');
  const tulipHashtag = await Api.getHashtag('tulip');
  const mediaDetail = await Api.getMediaDetail('Bm4gGiTld4l');
  // console.log(await Api.getLocation('1234'));

  fs.writeFileSync('./out/debug-my-data.json', JSON.stringify(myUserData, null, 2));
  fs.writeFileSync('./out/debug-username-data.json', JSON.stringify(usernameUserData, null, 2));
  fs.writeFileSync('./out/debug-hashtag.json', JSON.stringify(tulipHashtag, null, 2));
  fs.writeFileSync('./out/debug-media-detail.json', JSON.stringify(mediaDetail, null, 2));
}

async function debugAdvancedGetDataEndpoints() {
  const mediaLikers = await Api.getMediaLikers('Bm1zLDaFSaF');
  const userFollowers = await Api.getUserFollowers('6719220571');

  fs.writeFileSync('./out/debug-user-followers.json', JSON.stringify(userFollowers, null, 2));
  fs.writeFileSync('./out/debug-media-likers.json', JSON.stringify(mediaLikers, null, 2));

  const userFollowersFirstOneEighty = await Api.getUserFollowersFirstN('6719220571', 180);
  fs.writeFileSync('./out/debug-dalimil-followers.json', JSON.stringify(userFollowersFirstOneEighty, null, 2));
}

async function debugPostEndpoints() {
  await Api.followUser('8498057536');
  await Api.unfollowUser('8498057536');
  //  console.log(await Api.likeMedia('1234'));
  //  console.log(await Api.unlikeMedia('1234'));
}
