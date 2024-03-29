const Data = require('./Data');

const Algorithm = {
  /**
   * Determines if this account is worth following, according to criteria in README
   *
   * @param userData - JSON obtained from API
   */
  decideAccountQuality(userData, isSimplified) {
    // REQUIRED ENTRIES
      // 'followed_by_viewer': true/false,
      // 'follows_viewer': true/false,
      // 'is_private': true/false,
      // 'edge_owner_to_timeline_media': {
      //   count: 34,
      //   edges: [{ node: { 'taken_at_timestamp': 1535159232, } }] // just the most recent
      // },
      // 'edge_followed_by': { count: 34 },
      // 'edge_follow': { count: 15 },
      // 'biography': 'blablabla',
      // 'full_name': 'blabla a',
      // 'username': username
    const requiredDataEntries = [
      'followed_by_viewer', 'follows_viewer', 'is_private', 'edge_owner_to_timeline_media',
      'edge_followed_by', 'edge_follow', 'biography', 'full_name', 'username'
    ];
    const missingEntry = requiredDataEntries.find(entry => !(entry in userData));
    if (missingEntry != null) {
      console.error('Missing data in userData, cannot decide account quality.', missingEntry);
      return ({
        isQualityAccount: false
      });
    }
    const badQualityReason = (() => {
      // not already following, and not already my follower
      const alreadyFollowing = userData.followed_by_viewer;
      const alreadyFollower = userData.follows_viewer;
      if (alreadyFollower || alreadyFollowing) {
        return 'already following or follower';
      }

      // must be public
      if (userData.is_private) {
        return 'is private account';
      }

      // must not have offensive words in name or username
      const badWords = ["salon", "sex", "rental", "free", "follow", "follower"];
      const { username, full_name: fullName } = userData;
      if (badWords.find(word => username.includes(word) || fullName.includes(word))) {
        return 'has offensive name';
      }

      // must have < 2000 followers
      const { count: followers } = userData.edge_followed_by;
      if (followers > 2000 || followers < 200) {
        return 'has over 2000 followers or < 200 followers';
      }

      // must have < 2000 following
      const { count: following } = userData.edge_follow;
      if (following > 2000 || following < 200) {
        return 'is following > 2000 accounts or < 200 accounts';
      }

      // must follow back a good amount of people. If followed by 1000, should be following at least 500
      // This works because people who follow pages will have following > followers.
      // Otherwise we suspect it is an arrogant business page
      if (2 * following < followers) {
        return 'is not following many people back';
      }

      // must have >= 5 posts
      const { count: numPosts, edges: posts } = userData.edge_owner_to_timeline_media;
      if (numPosts < 5) {
        return `does not have enough posts: ${numPosts})`;
      }

      //// To limit the API calls we can just decide to follow pretty much anybody
      if (isSimplified) {
        // Passed!
        return null;
      }

      // must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 8000 followers)
      // 5 -> max 400
      // 10 -> max 800
      // 15 -> max 1200
      if (followers / numPosts > 80) {
        return `bad followers-per-post ratio: ${(followers / numPosts).toFixed(1)}`;
      }

      // must have posted within the last 60 days
      const severalDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 60);
      const latestPostTimestamp = posts[0].node.taken_at_timestamp * 1000;
      if (latestPostTimestamp < severalDaysAgo) {
        return 'latest post is too old';
      }

      // must not have offensive words in bio - instagram is getting better at removing inappropriate
      // content, so this should not be an issue with public accounts anymore
      const cheapWords = ["webcam", "gain", "follow"];
      const { biography } = userData;
      if (cheapWords.find(word => biography.includes(word))) {
        return 'has offensive bio';
      }

      // All passed
      return null;
    })();

    return ({
      isQualityAccount: badQualityReason === null,
      ...(badQualityReason ? { reason: badQualityReason } : {}),
    });
  },

  /**
   * Returns which accounts from the currently marked as future-unfollow
   * have reached their time-to-live of 3 days
   */
  getCurrentUnfollowLists(unfollowLimit = 20) {
    const unfollowList = Data.getFutureUnfollowList();
    const fiveDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 8);
    const toKeep = [];
    const toUnfollow = [];
    // Determine which accounts were added long time ago
    unfollowList.forEach(account => {
      if (toUnfollow.length < unfollowLimit && account.timestamp < fiveDaysAgo) {
        toUnfollow.push(account);
      } else {
        toKeep.push(account);
      }
    });

    return {
      toUnfollow,
      toKeep,
    };
  }
};

module.exports = Algorithm;
