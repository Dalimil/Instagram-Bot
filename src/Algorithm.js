const Data = require('./Data');
const Api = require('./Api');

const Algorithm = {
  async runMain(numUsersToProcess, collectListOnly = false) {
    console.info(new Date().toLocaleString(), 'Executing main follow algorithm...');
    // For now we just use the first account
    const initialAccount = Data.getInitialTargets().initial_accounts[0];
    if (!initialAccount) {
      console.error('No initial account target! Aborting...')
      return;
    }
    const targetUsername = initialAccount.username;
    const { id: targetUserId } = (await Api.getUser(targetUsername)).graphql.user;

    const alreadyProcessed = new Set(Data.getProcessedAccountsList().map(account => account.userId));
    const futureFollowList = await Api.getUserFollowersFirstN(targetUserId, numUsersToProcess, alreadyProcessed);
    
    // Follow users (but make sure they are quality accounts first)
    const qualityFutureFollowList = [];
    for (const account of futureFollowList) {
      const shouldSelectAccount = await Algorithm.shouldSelectAccount(account.username);
      if (shouldSelectAccount) {
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
    const timestamp = Date.now();
    const newlyProcessed = futureFollowList.map(({ id, username }) =>
      ({ userId: id, username, timestamp })
    );
    const newlyFollowed = qualityFutureFollowList.map(({ id, username }) =>
      ({ userId: id, username, timestamp })
    );
    // Store in 'processed' so we don't process them in the future
    Data.storeProcessedAccountsList([
      ...Data.getProcessedAccountsList(),
      ...newlyProcessed
    ]);
    // Store in 'unfollow' so that we unfollow them after 3 days
    Data.storeFutureUnfollowList([
      ...Data.getFutureUnfollowList(),
      ...newlyFollowed
    ]);
  },

  async runMassUnfollow() {
    console.info(new Date().toLocaleString(), 'Executing mass unfollow...');
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
    console.info(`Accounts to be unfollowed: ${toUnfollow.length}`);
    for (const userId of toUnfollow) {
      await Api.unfollowUser(userId);
    };
    
    // Update storage
    Data.storeFutureUnfollowList(toKeep);
  },

  shouldSelectAccount(username) {
    return Api.getUser(username).then(userData => {
      if (Algorithm.isQualityAccount(userData)) {
        // Randomly skip this acc with 5% chance (more human like behaviour)
        return Math.random() > 0.05;
      }
      return false;
    });
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
      console.info('(already following or follower)')
      return false;
    }

    // must be public
    if (user.is_private) {
      console.info('(is private account)');
      return false;
    }

    // must have > 10 posts
    const { count: numPosts } = user.edge_owner_to_timeline_media;
    if (numPosts < 10) {
      console.info(`(does not have enough posts: ${numPosts})`);
      return false;
    }

    // must have < 3000 followers
    const { count: followers } = user.edge_followed_by;
    if (followers > 3000) {
      console.info('(has over 3000 followers)');
      return false;
    }
    
    // must have < 2000 following
    const { count: following } = user.edge_follow;
    if (following > 2000) {
      console.info('(is following over 2000 accounts)');
      return false;
    }

    // must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 8000 followers)
    if (followers / numPosts > 80) {
      console.info(`(bad ratio: ${(followers / numPosts).toFixed(1)})`);
      return false;
    }

    // must not have offensive words in bio
    const cheapWords = ["click", "link", "webcam", "gain", "follow", "followers", "kik"];
    const { biography } = user;
    if (cheapWords.find(word => biography.includes(word))) {
      console.info('(has offensive bio)');
      return false;
    }

    // must not have offensive words in name or username
    const badWords = ["salon", "sex", "rental", "free", "follow", "follower"];
    const { id, username, full_name: fullName } = user;
    if (badWords.find(word => username.includes(word) || fullName.includes(word))) {
      console.info('(has offensive name)');
      return false;
    }

    // All passed
    return true;
  },
};

module.exports = Algorithm;
