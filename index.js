const Url = require('./src/Url');
const Api = require('./src/Api');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('creds.json'));

(async () => {
 await Api.login(credentials);
 console.log('Call APIs now...');
 const myUserData = await Api.getUser(credentials.username);
 const usernameUserData = await Api.getUser('dali_mil');
 const tulipHashtag = await Api.getHashtag('tulip');

 fs.writeFileSync('./out/debug-my-data.json', JSON.stringify(myUserData, null, 2));
 fs.writeFileSync('./out/debug-username-data.json', JSON.stringify(usernameUserData, null, 2));
 fs.writeFileSync('./out/debug-hashtag.json', JSON.stringify(tulipHashtag, null, 2));

//  console.log(await Api.getLocation('1234'));
//  console.log(await Api.getMediaDetail(''));
//  console.log(await Api.followUser('1234'));
//  console.log(await Api.unfollowUser('1234'));
//  console.log(await Api.likeMedia('1234'));
//  console.log(await Api.unlikeMedia('1234'));
 await Api.logout(credentials.username);
})();
