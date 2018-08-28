const fs = require('fs');

const Data = {
  futureUnfollowListFile: './data/future-unfollow.json',
  initialTargetsFile: './data/initial-targets.json',
  processedAccountsFile: './data/processed-accounts.json',
  qualityListCollectionFile: './data/quality-accounts-collection.json',

  getFutureUnfollowList() {
    return JSON.parse(fs.readFileSync(Data.futureUnfollowListFile)).future_unfollow;
  },

  storeFutureUnfollowList(data) {
    fs.writeFileSync(Data.futureUnfollowListFile, JSON.stringify({ future_unfollow: data }, null, 2));
  },

  getInitialTargets() {
    return JSON.parse(fs.readFileSync(Data.initialTargetsFile));
  },

  getProcessedAccountsList() {
    return JSON.parse(fs.readFileSync(Data.processedAccountsFile)).processed_accounts;
  },

  storeProcessedAccountsList(data) {
    fs.writeFileSync(Data.processedAccountsFile, JSON.stringify({ processed_accounts: data }, null, 2));
  },

  storeQualityListCollection(list) {
    fs.writeFileSync(Data.qualityListCollectionFile, JSON.stringify({ quality_accounts: list }, null, 2));
  },
};

module.exports = Data;
