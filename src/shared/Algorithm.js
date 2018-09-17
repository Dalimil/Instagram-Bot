const Data = require('./Data');

const Algorithm = {
  /**
   * Determines if this account is worth following, according to criteria in README
   *
   * @param userData - JSON obtained from API
   */
  isQualityAccount(userData) {
    // not already following, and not already my follower
    const alreadyFollowing = userData.followed_by_viewer;
    const alreadyFollower = userData.follows_viewer;
    if (alreadyFollower || alreadyFollowing) {
      console.info('(already following or follower)')
      return false;
    }

    // must be public
    if (userData.is_private) {
      console.info('(is private account)');
      return false;
    }

    // must have >= 10 posts
    const { count: numPosts, edges: posts } = userData.edge_owner_to_timeline_media;
    if (numPosts < 10) {
      console.info(`(does not have enough posts: ${numPosts})`);
      return false;
    }

    // must have posted within the last 14 days
    const severalDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 14);
    const latestPostTimestamp = posts[0].node.taken_at_timestamp * 1000;
    if (latestPostTimestamp < severalDaysAgo) {
      console.info('(latest post is too old)');
      return false;
    }

    // must have < 2000 followers
    const { count: followers } = userData.edge_followed_by;
    if (followers > 1500) {
      console.info('(has over 1500 followers)');
      return false;
    }
    
    // must have < 2000 following
    const { count: following } = userData.edge_follow;
    if (following > 2000) {
      console.info('(is following over 2000 accounts)');
      return false;
    }

    // must follow back a good amount of people
    if (2 * following < followers) {
      console.info('(is not following many people back)');
      return false;
    }

    // must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 8000 followers)
    if (followers / numPosts > 80) {
      console.info(`(bad followers-per-post ratio: ${(followers / numPosts).toFixed(1)})`);
      return false;
    }

    // must not have offensive words in bio
    const cheapWords = ["click", "link", "webcam", "gain", "follow", "followers", "kik"];
    const { biography } = userData;
    if (cheapWords.find(word => biography.includes(word))) {
      console.info('(has offensive bio)');
      return false;
    }

    // must not have offensive words in name or username
    const badWords = ["salon", "sex", "rental", "free", "follow", "follower"];
    const { id, username, full_name: fullName } = userData;
    if (badWords.find(word => username.includes(word) || fullName.includes(word))) {
      console.info('(has offensive name)');
      return false;
    }

    // All passed
    return true;
  },

  /**
   * Returns which accounts from the currently marked as future-unfollow
   * have reached their time-to-live of 3 days
   */
  getCurrentUnfollowLists() {
    const unfollowLimit = 30;
    const unfollowList = Data.getFutureUnfollowList();
    const threeDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 2);
    const toKeep = [];
    const toUnfollow = [];
    // Determine which accounts were added long time ago
    unfollowList.forEach(account => {
      if (toUnfollow.length < unfollowLimit && account.timestamp < threeDaysAgo) {
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
