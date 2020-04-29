
const Url = {
  defaultUrl: 'https://www.instagram.com/',
  defaultLoginUrl: 'https://www.instagram.com/accounts/login/',
  loginUrl: 'https://www.instagram.com/accounts/login/ajax/',
  logoutUrl: 'https://www.instagram.com/accounts/logout/',
  graphqlApiUrl: 'https://www.instagram.com/graphql/query/',
  exploreUrl: 'https://www.instagram.com/explore/',

  getHashtagApiUrl: (hashtag) =>
    `https://www.instagram.com/explore/tags/${hashtag}/?__a=1`,

  getLocationApiUrl: (locationId) =>
    `https://www.instagram.com/explore/locations/${locationId}/?__a=1`,

  getUserPageUrl: (username) =>
    `https://www.instagram.com/${username}/`,

  getUsernameApiUrl: (username) =>
    `https://www.instagram.com/${username}/?__a=1`,

  getFollowUrl: (userId) =>
    `https://www.instagram.com/web/friendships/${userId}/follow/`,

  getUnfollowUrl: (userId) =>
    `https://www.instagram.com/web/friendships/${userId}/unfollow/`,

  getLikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/like/`,

  getUnlikeUrl: (mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/unlike/`,

  getMediaUrl: (mediaId) =>
   `https://www.instagram.com/p/${mediaId}/`,

  getMediaDetailApiUrl: (mediaId) =>
   `https://www.instagram.com/p/${mediaId}/?__a=1`,
};

module.exports = Url;
