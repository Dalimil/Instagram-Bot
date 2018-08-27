const Url = require('./src/Url');
const Api = require('./src/Api');
const Algorithm = require('./src/Algorithm');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('creds.json'));

(async () => {
  await Api.login(credentials);
  console.log('Call APIs now...');

  // Algorithm.runMain();
  // Algorithm.runMassUnfollow();

  await Api.logout(credentials.username);
})();

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

  const userFollowersFirstEighty = await Api.getUserFollowersFirstN('6719220571', 80);
  console.log(userFollowersFirstEighty);
}

async function debugPostEndpoints() {
  //  console.log(await Api.followUser('1234'));
  //  console.log(await Api.unfollowUser('1234'));
  //  console.log(await Api.likeMedia('1234'));
  //  console.log(await Api.unlikeMedia('1234'));
}

