
const Url = {
  defaultUrl: 'https://www.instagram.com/',
  loginUrl: 'https://www.instagram.com/accounts/login/ajax/',
  logoutUrl: 'https://www.instagram.com/accounts/logout/',

  getHashtagUrl: (hashtag) =>
    `https://www.instagram.com/explore/tags/${hashtag}/?__a=1`,

  getLocationUrl: (location) =>
    `https://www.instagram.com/explore/locations/${location}/?__a=1`,

  getUsernameUrl: (username) =>
    `https://www.instagram.com/${username}/?__a=1`,

  getUserDetailUrl: (username) =>
   `https://i.instagram.com/api/v1/users/${username}/info/`,
   // alternatively: https://www.instagram.com/${username}/

  getFollowUrl: (username) =>
    `https://www.instagram.com/web/friendships/${username}/follow/`,

  getUnfollowUrl: (username) =>
    `https://www.instagram.com/web/friendships/${username}/unfollow/`,

  getLikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/like/`,

  getUnlikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/unlike/`,

  getMediaDetailUrl: (mediaId) =>
   `https://www.instagram.com/p/${mediaId}/?__a=1`,
};

module.exports = Url;
