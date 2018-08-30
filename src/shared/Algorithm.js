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

    // must have >= 5 posts
    const { count: numPosts, edges: posts } = userData.edge_owner_to_timeline_media;
    if (numPosts < 5) {
      console.info(`(does not have enough posts: ${numPosts})`);
      return false;
    }

    // must have posted within the last 80 days
    const eightyDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 90);
    const latestPostTimestamp = posts[0].node.taken_at_timestamp * 1000;
    if (latestPostTimestamp < eightyDaysAgo) {
      console.info('(latest post is too old)');
      return false;
    }


    // must have < 3000 followers
    const { count: followers } = userData.edge_followed_by;
    if (followers > 3000) {
      console.info('(has over 3000 followers)');
      return false;
    }
    
    // must have < 3000 following
    const { count: following } = userData.edge_follow;
    if (following > 3000) {
      console.info('(is following over 3000 accounts)');
      return false;
    }

    // must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 8000 followers)
    if (followers / numPosts > 80) {
      console.info(`(bad ratio: ${(followers / numPosts).toFixed(1)})`);
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
    const unfollowList = Data.getFutureUnfollowList();
    const threeDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 3);
    const toKeep = [];
    const toUnfollow = [];
    // Determine which accounts were added long time ago
    unfollowList.forEach(({ timestamp, userId }) => {
      if (timestamp < threeDaysAgo) {
        toUnfollow.push(userId);
      } else {
        toKeep.push({ userId, timestamp });
      }
    });

    return {
      toUnfollow,
      toKeep,
    };
  }
};

module.exports = Algorithm;
