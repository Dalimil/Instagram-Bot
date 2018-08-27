const Data = require('./Data');
const Api = require('./Api');

const Algorithm = {
  run() {

  }

  async runMassUnfollow() {
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

    // Unfollow
    for (const userId of toUnfollow) {
      await Api.unfollowUser(userId);
    });
    
    // Update storage
    Data.storeFutureUnfollowList(toKeep);
  },

  selectAccount(userData) {
    if (Algorithm.isQualityAccount(userData)) {
      // Randomly skip this acc with 10% chance (more human like behaviour)
      return Math.random() > 0.1;
    }
    return false;
  },

  /**
   * Determines if this account is worth following, according to criteria in README
   *
   * @param userData - JSON obtained from API
   */
  isQualityAccount(userData) {
    const { user } = userData.graphql;

    // not already following, and not already my follower
    const alreadyFollowing = user.followed_by_viewer;
    const alreadyFollower = user.follows_viewer;
    if (alreadyFollower || alreadyFollowing) {
      return false;
    }

    // must be public
    if (user.is_private) {
      return false;
    }

    // must have > 30 posts
    const { count: numPosts } = user.edge_owner_to_timeline_media;
    if (numPosts < 30) {
      return false;
    }

    // must have < 3000 followers
    const { count: followers } = user.edge_followed_by;
    if (followers > 3000) {
      return false;
    }
    
    // must have < 2000 following
    const { count: following } = user.edge_follow;
    if (following > 2000) {
      return false;
    }

    // must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 8000 followers)
    if (followers / numPosts > 80) {
      return false;
    }

    // must not have offensive words in bio
    const cheapWords = ["click", "link", "webcam", "gain", "follow", "followers", "kik"];
    const { biography } = user;
    if (cheapWords.find(word => biography.includes(word)) !== null) {
      return false;
    }

    // must not have offensive words in name or username
    const badWords = ["salon", "sex", "rental", "free", "follow", "follower"];
    const { id, username, full_name, } = user;
    if (badWords.find(word => username.includes(word) || name.includes(word)) !== null) {
      return false;
    }

    // All passed
    return true;
  },
};

module.exports = Algorithm;
