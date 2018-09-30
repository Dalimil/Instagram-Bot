const fs = require('fs');

const Data = {
  credentialsFile: './creds.json',
  cookieSessionFile: './session.json',
  futureUnfollowListFile: './data/future-unfollow.json',
  processedAccountsFile: './data/processed-accounts.json',
  qualityListCollectionFile: './data/quality-accounts-collection.json',
  blacklistedMediaPosts: './data/blacklisted-media.json',

  getCredentials() {
    return JSON.parse(fs.readFileSync(Data.credentialsFile));
  },

  getCookieSession() {
    return JSON.parse(fs.readFileSync(Data.cookieSessionFile)).cookies;
  },

  storeCookieSession(data) {
    fs.writeFileSync(Data.cookieSessionFile, JSON.stringify({ cookies: data }, null, 2));
  },

  getFutureUnfollowList() {
    return JSON.parse(fs.readFileSync(Data.futureUnfollowListFile)).future_unfollow;
  },

  storeFutureUnfollowList(data) {
    fs.writeFileSync(Data.futureUnfollowListFile, JSON.stringify({ future_unfollow: data }, null, 2));
  },

  getProcessedAccountsList() {
    return JSON.parse(fs.readFileSync(Data.processedAccountsFile)).processed_accounts;
  },

  storeProcessedAccountsList(data) {
    fs.writeFileSync(Data.processedAccountsFile, JSON.stringify({ processed_accounts: data }, null, 2));
  },

  getBlacklistedMediaPosts() {
    return JSON.parse(fs.readFileSync(Data.blacklistedMediaPosts)).blacklisted_media;
  },

  appendBlacklistedMediaPost(mediaShortcode) {
    const currentBlacklist = Data.getBlacklistedMediaPosts();
    const newBlacklist = [...new Set([...currentBlacklist, mediaShortcode])];
    fs.writeFileSync(
      Data.blacklistedMediaPosts,
      JSON.stringify({ blacklisted_media: newBlacklist }, null, 2),
    );
  },

  persistNewlyProcessedAndFollowed(newlyProcessed, newlyFollowed) {
    const timestamp = Date.now();

    // Store in 'processed' so we don't process them in the future
    Data.storeProcessedAccountsList([
      ...Data.getProcessedAccountsList(),
      ...newlyProcessed.map(({ id, username }) => ({ userId: id, username, timestamp })),
    ]);
    // Store in 'unfollow' so that we unfollow them after 3 days
    Data.storeFutureUnfollowList([
      ...Data.getFutureUnfollowList(),
      ...newlyFollowed.map(({ id, username }) => ({ userId: id, username, timestamp })),
    ]);
  },

  storeQualityListCollection(list) {
    fs.writeFileSync(Data.qualityListCollectionFile, JSON.stringify({ quality_accounts: list }, null, 2));
  },
};

module.exports = Data;
