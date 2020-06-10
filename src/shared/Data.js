const fs = require('fs');

const Data = {
  credentialsFile: './creds.json',
  cookieSessionFile: './session.json',
  futureUnfollowListFile: './data/future-unfollow.json',  
  processedAccountsLegacyFile: './data/processed-accounts.json',
  processedAccountsModernFile: './data/processed-accounts-modern.json',
  qualityListCollectionFile: './data/quality-accounts-collection.json',
  blacklistedMediaPosts: './data/blacklisted-media.json',
  unfollowByIdAccountsFile: './data/unfollow-by-id.json', // tracking future unfollow users who changed usernames

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

  /* Modern is the new one where we only use usernames, not ids */
  getProcessedAccountsList(modern = false) {
    return JSON.parse(fs.readFileSync(modern ? Data.processedAccountsModernFile : Data.processedAccountsLegacyFile))
      .processed_accounts;
  },

  storeProcessedAccountsList(data, modern = false) {
    fs.writeFileSync(
      modern ? Data.processedAccountsModernFile : Data.processedAccountsLegacyFile,
      JSON.stringify({ processed_accounts: data })
    );
  },

  getUnfollowByIdAccountList() {
    return JSON.parse(fs.readFileSync(Data.unfollowByIdAccountsFile)).future_unfollow_by_id;
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

  appendUserToBeUnfollowedById(account) {
    const currentUserIdFutureUnfollows = Data.getUnfollowByIdAccountList();
    const newList = [...currentUserIdFutureUnfollows, account];
    fs.writeFileSync(
      Data.unfollowByIdAccountsFile,
      JSON.stringify({ future_unfollow_by_id: newList }, null, 2),
    );
  },

  persistNewlyProcessedAndFollowed(newlyProcessed, newlyFollowed, modern = false) {
    const timestamp = Date.now();

    // Store in 'processed' so we don't process them in the future
    Data.storeProcessedAccountsList(
      [
        ...Data.getProcessedAccountsList(modern),
        ...newlyProcessed.map(acc => modern ? acc.username : acc.id),
      ],
      modern
    );
    // Store in 'unfollow' so that we unfollow them after 7 days or so
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
