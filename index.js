const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');
// Note: terminal version of the bot is currently broken due to security challenge issues

// Usage: yarn start [--follow] [--unfollow] [--experiment]
//  or simply 'yarn start', 'yarn follow', 'yarn unfollow', 'yarn experiment'
(async () => {
  // Follow limit: between 100 up to max 500 per day
  // HARD LIMIT: 40 follows per hour!
  // Unknown unfollow limit: about 50 per hour, but Instagram will force you to
  //  space it out in that one hour (it pretends it allows, but in fact ignores actions over limit)
  // 7500 total following is the global MAX
  // Max number of likes is 1.5x that amount

  const commandArg = process.argv[2];
  const skipFollow = ['unfollow', '--unfollow'].includes(commandArg);
  const skipUnfollow = ['follow', '--follow'].includes(commandArg);
  const isExperimentMode = ['experiment', '--experiment'].includes(commandArg);

  // Browser (webdriver) version of the bot
  await BrowserBot.init();

  if (isExperimentMode) {
    // EXPERIMENT MODE
    // const inputData = JSON.parse(require('fs').readFileSync('./tmp.json')).data;
    // await BrowserBot.runBrowseList(inputData);
    // await BrowserBot.runMassUnfollowFromList(inputData);
  } else {
    // STANDARD MODE (10-20% conversion rate)
    if (!skipUnfollow) {
      await BrowserBot.runMassUnfollow(15);
    }
    if (!skipFollow) {
      // 'Follow by hashtag' follows feed likers (because these are active users)
      await BrowserBot.runMain({ hashtag: 'portraiture_kings' }, 19);
      // 'Follow by username' follows accounts following the given account
      // await BrowserBot.runMain({ username: 'jordhammond' });
    }
    if (!skipUnfollow) {
      await BrowserBot.runMassUnfollow(15);
    }
    if (!skipFollow) {
      await BrowserBot.runMain({ hashtag: 'portrait_bw' }, 19);
    }
    if (!skipUnfollow && !skipFollow) {
      // Final batch
      await BrowserBot.runMassUnfollow(15);
    }
  }

  await BrowserBot.end();
})();
