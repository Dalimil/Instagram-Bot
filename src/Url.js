
const Url = {
  defaultUrl: 'https://www.instagram.com/',
  loginUrl: 'https://www.instagram.com/accounts/login/ajax/',
  logoutUrl: 'https://www.instagram.com/accounts/logout/',
  graphqlApiUrl: 'https://www.instagram.com/graphql/query/',

  getHashtagUrl: (hashtag) =>
    `https://www.instagram.com/explore/tags/${hashtag}/?__a=1`,

  getLocationUrl: (locationId) =>
    `https://www.instagram.com/explore/locations/${locationId}/?__a=1`,

  getUsernameUrl: (username) =>
    `https://www.instagram.com/${username}/?__a=1`,

  getFollowUrl: (userId) =>
    `https://www.instagram.com/web/friendships/${userId}/follow/`,

  getUnfollowUrl: (userId) =>
    `https://www.instagram.com/web/friendships/${userId}/unfollow/`,

  getLikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/like/`,

  getUnlikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/unlike/`,

  getMediaDetailUrl: (mediaId) =>
   `https://www.instagram.com/p/${mediaId}/?__a=1`,
};

module.exports = Url;
