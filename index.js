const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');
// Note: terminal version of the bot is currently broken due to security challenge issues

// Usage: yarn start [(--follow | --unfollow | --experiment)] [--lightweight] [--headless]
//  or simply 'yarn start', 'yarn follow', 'yarn unfollow', 'yarn experiment',
//  'yarn start --lightweight --headless' etc.
(async () => {
  try {
    // Follow limit: between 100 up to max 500 per day
    // HARD LIMIT: 40 follows per hour!
    // Unknown unfollow limit: about 50 per hour, but Instagram will force you to
    //  space it out in that one hour (it pretends it allows, but in fact ignores actions over limit)
    // 7500 total following is the global MAX
    // Max number of likes is 1.5x that amount

    const commandArg = process.argv[2];
    const skipFollow = commandArg === '--unfollow';
    const skipUnfollow = commandArg === '--follow';
    const isExperimentMode = commandArg === '--experiment';
    const followNumberTarget = process.argv.includes('--lightweight') ? 6 : 19;

    console.log('Started at', new Date().toLocaleString());

    // Browser (webdriver) version of the bot
    await BrowserBot.init();

    if (isExperimentMode) {
      // EXPERIMENT MODE
      const inputData = JSON.parse(require('fs').readFileSync('./tmp.json'))
        .data;
      await BrowserBot.runBrowseList(inputData);
      // const untrackedAccounts = await BrowserBot.runGetUntrackedFutureUnfollowAccounts(
      //   "dali_mil",
      //   inputData
      // );
      // console.log(untrackedAccounts);
      // await BrowserBot.runMassUnfollowFromList(inputData.slice(0, 30));
    } else {
      // STANDARD MODE (10-20% conversion rate)
      if (!skipUnfollow) {
        await BrowserBot.runMassUnfollow(Math.min(15, followNumberTarget));
      }
      if (!skipFollow) {
        // 'Follow by hashtag' follows feed likers (because these are active users)
        await BrowserBot.runMain({ hashtag: 'pnw' }, followNumberTarget);
        // 'Follow by username' follows accounts following the given account
        // await BrowserBot.runMain({ username: 'jordhammond' });
      }
      if (!skipUnfollow) {
        await BrowserBot.runMassUnfollow(Math.min(15, followNumberTarget));
      }
      if (!skipFollow) {
        await BrowserBot.runMain({ hashtag: 'vancouver' }, followNumberTarget);
      }
    }
  } catch (e) {
    console.error('------------- Terminated with an error -----------');
    console.error(e);
  } finally {
    // No matter what error is thrown, we should terminate the processes correctly
    await BrowserBot.end();
    console.log('Finished at', new Date().toLocaleString());
    // Force terminate (because selenium subprocess kill is buggy)
    setTimeout(() => {
      process.exit();
    }, 5000);
  }
})();
