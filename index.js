const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');

(async () => {
  // Follow limit: max 100 per day and 40 per hour
  // - increase 20 per day and later up to max 500/day
  // 7500 total following is the global MAX
  // Max number of likes is 1.5x that amount

  // Browser (webdriver) version of the bot
  await BrowserBot.runMain(10);
  // await BrowserBot.runMassUnfollow();

  // TODO: terminal version of the bot is currently broken
  //  due to a security challenge issues
  // await TerminalBot.runMain(10, /* collectListOnly */ true);
  // await TerminalBot.runMassUnfollow();
})();
