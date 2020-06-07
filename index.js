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
 * Any unusual behavior gets blocked. You need to slowly ramp up follow rates.
 * Task Scheduler should not start your task at 2pm exactly, but randomly between 1pm and 3pm
 * Way to ramp up - 4 triggers at 7am, 12pm, 6pm, 12am with random 10min start delay and 4 hour
 * forced timeout.
 * 
 * Iterating through a lot of accounts (without (un)following) is now newly also considered bad
 * by Instagram. So simply visiting a lot of /username pages will trigger bot detection. So the
 * decision algorithm cannot be too strict.
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
    const isCompilationTest = commandArg === '--test';
    const followNumberTarget = process.argv.includes('--lightweight') ? 4 : 4; // * 4 (the number of hashtags)
    const targetHashtags = ['venice', 'earthoutdoors', 'neverstopexploring', 'sheexplores'];

    console.log('Started at', new Date().toLocaleString());
    
    if (isCompilationTest) {
      // no-op
      console.log("Node execution successful");
      process.exit();
    }

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
      for (const hashtag of targetHashtags) {
        if (!skipUnfollow) {
          await BrowserBot.runMassUnfollow(followNumberTarget);
        }
        if (!skipFollow) {
          // 'Follow by hashtag' follows feed likers (because these are active users)
          // 'Follow by user' is not recommended because it quickly runs into repetition
          await BrowserBot.runMain({ hashtag }, followNumberTarget);
        }
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
