const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');

(async () => {
  // Follow limit: between 100 up to max 500 per day
  // HARD LIMIT: 40 follows per hour!
  // 7500 total following is the global MAX
  // Max number of likes is 1.5x that amount

  // Browser (webdriver) version of the bot
  // TODO: Could implement name/username filtering for 'photography' to find photographers
  // TODO: Could get #streetphotography feed likers because these are active users
  await BrowserBot.runMain({ username: 'jordhammond' });
  // await BrowserBot.runMassUnfollow();

  // TODO: terminal version of the bot is currently broken
  //  due to a security challenge issues
  // await TerminalBot.runMain(10, /* collectListOnly */ true);
  // await TerminalBot.runMassUnfollow();
})();
