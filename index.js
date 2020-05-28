const BrowserBot = require('./src/browser');
const TerminalBot = require('./src/terminal');
// Note: terminal version of the bot is currently broken due to security challenge issues

// Usage: yarn start [(--follow | --unfollow | --experiment)] [--lightweight] [--headless]
//  or simply 'yarn start', 'yarn follow', 'yarn unfollow', 'yarn experiment',
//  'yarn start --lightweight --headless' etc.

/**
 * When something throws an error or you get blocked, wipe session and login again.
 * It looks at session history to suspect a bot. So when you wipe the session and try to restart
 * at previous rate, it will break again, because this new session is not trusted.
 * With each new session you need to slowly ramp up again I believe.
 * 
 * The machine learning to detect bots on Instagram servers is looking at user behavior.
 * Any unusual behavior gets blocked. If you suddenly start following 100 accounts every day,
 * you get blocked. Instead you need to start with 1 every day, then 2, then maybe every other
 * day you add one more to still look like your usual behavior to match behavior history.
 * Avoid regularities, don't follow 1 every hour, or don't follow 20 at 12pm exactly.
 * Task Scheduler should not start your task at 2pm exactly, but randomly between 1pm and 3pm
 * Way to ramp up - 4 triggers at 7am, 12pm, 6pm, 12am with random 10min start delay and 4 hour
 * forced timeout. Start with 1, 2, 3 ..., 11. That's 11*2*4 per day => 88 follows per day
 * The unfollow cycles between your follow cycles are very important and if they don't introduce
 * the pauses, the 19*2 follow actions will get you blocked.
 * 
 * Iterating through a lot of accounts (without (un)following) is now newly also considered bad
 * by Instagram. So simply visiting a lot of /username pages will trigger bot detection. So the
 * decision algorithm cannot be too strict. One could also try experimenting with a different
 * user agent (mobile device?).
 */
(async () => {
  try {
    // Follow limit: around 100 per day ??
    // HARD LIMIT: 40 follows per hour!
    // 7500 total following is the global MAX

    const commandArg = process.argv[2];
    const skipFollow = commandArg === '--unfollow';
    const skipUnfollow = commandArg === '--follow';
    const isExperimentMode = commandArg === '--experiment';
    const followNumberTarget = process.argv.includes('--lightweight') ? 12 : 12;

    console.log('Started at', new Date().toLocaleString());

    // Browser (webdriver) version of the bot
    await BrowserBot.init();

    if (isExperimentMode) {
      // EXPERIMENT MODE
      const inputData = JSON.parse(require('fs').readFileSync('./tmp.json'))
        .data;
      await BrowserBot.runBrowseList(inputData); // ['pnwisbeautiful']);
      // const untrackedAccounts = await BrowserBot.runGetUntrackedFutureUnfollowAccounts(
      //   "dali_hiking",
      //   inputData
      // );
      // console.log(untrackedAccounts);
      // await BrowserBot.runMassUnfollowFromList(inputData.slice(0, 30));
    } else {
      // STANDARD MODE (10-20% conversion rate)
      if (!skipUnfollow) {
        await BrowserBot.runMassUnfollow(followNumberTarget);
      }
      if (!skipFollow) {
        // 'Follow by hashtag' follows feed likers (because these are active users)
        await BrowserBot.runMain({ hashtag: 'venice' }, followNumberTarget);
        // 'Follow by username' follows accounts following the given account
        // await BrowserBot.runMain({ username: 'jordhammond' });
      }
      if (!skipUnfollow) {
        await BrowserBot.runMassUnfollow(followNumberTarget);
      }
      if (!skipFollow) {
        await BrowserBot.runMain({ hashtag: 'earthoutdoors' }, followNumberTarget);
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
