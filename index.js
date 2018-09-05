const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');
// Note: terminal version of the bot is currently broken due to security challenge issues

// Usage: yarn start [--unfollow]
//  or simply 'yarn follow' and 'yarn unfollow'
(async () => {
  // Follow limit: between 100 up to max 500 per day
  // HARD LIMIT: 40 follows per hour!
  // Unknown unfollow limit: but 120 per hour ran without problems
  // 7500 total following is the global MAX
  // Max number of likes is 1.5x that amount

  // Browser (webdriver) version of the bot

  const commandArg = process.argv[2];
  if (commandArg === 'unfollow' || commandArg === '--unfollow') {
    await BrowserBot.runMassUnfollow();
    return;
  }

  // 'Follow by hashtag' follows feed likers (because these are active users)
  await BrowserBot.runMain({ hashtag: 'streetphotography' });
  // 'Follow by username' has about 10-20% conversion rate:
  // await BrowserBot.runMain({ username: 'jordhammond' });
})();
