const BrowserBot = require('./src/browser');
const Random = require('./src/shared/Random');

// Usage: yarn start [(--follow | --unfollow | --experiment)] [--lightweight] [--headless]
//  or simply 'yarn start', 'yarn follow', 'yarn unfollow', 'yarn experiment',
//  'yarn start --lightweight --headless' etc.

/**
 * When something throws an error or you get blocked, wipe session and wait 2 days.
 * 
 * The machine learning to detect bots on Instagram servers is looking at user behavior.
 * Any unusual behavior gets blocked. You need to slowly ramp up follow rates.
 * STRATEGY
 * Imitate human behaviour in your timezone.
 * Every 7th day or so have a day of rest (nothing on Sunday?)
 * Following without looking and scrolling gets you blocked. Avoid repeating same action.
 * Simply iterating (without follow/unfollow) through a lot of account is also detectable and blockable.
 * Focus on recently posted (last 1h ideally) and don't follow the same number of people every time.
 * Keep < 100 actions/hour (any action)
 * 
 * RAMP UP:
 * Day 1-7: Follow 2-3/h (increase next day), like some, rest few hours and repeat (5x?),
 *    (up to 20/day for first week)
 * Day 7-30: Follow 22-30/h and up to 150/day
 * Day 30+: Follow 40/h and up to 250/day
 * 
 * Task Scheduler should not start your task at 2pm exactly, but randomly between 1pm and 3pm
 * Way to ramp up - 5 triggers at 7am, 11am, 3pm, 7pm 11pm with random 30min start delay and 4 hour
 * forced timeout with a weekly omission on Sunday.
 * 
 */
(async () => {
  const commandArg = process.argv[2];
  const unfollowMode = commandArg === '--unfollow';
  const followMode = commandArg === '--follow' || !unfollowMode; // follow is the default mode
  const isExperimentMode = commandArg === '--experiment';
  const isCompilationTest = commandArg === '--test';
  const followNumberTarget = 
    (process.argv.includes('--lightweight') ? 12 : 12) +
    Random.integerInRangeInclusive(-2, 2);
  ;
  // One could also follow posts of pages but hashtag feeds seem to have more recent posts
  const targetHashtags = [
    'venice', 'banff', 'earthoutdoors',
    'neverstopexploring', 'sheexplores', 'travel', 'neverstopexploring',
    'stayandwander', 'awesomeearth', 'beautifuldestinations', 'ourplanetdaily',
    'liveoutdoors', 'modernoutdoors', 'earthpix', 'voyaged', 'adventure'
  ];

  try {
    console.log('Started at', new Date().toLocaleString());

    if (isCompilationTest) {
      // no-op
      console.log("Node execution successful");
      console.log('Coin tosses:', Array(10).fill().map(() => Random.coinToss(50)));
      process.exit();
    }

    await BrowserBot.init(/* login */ !isExperimentMode);
    if (isExperimentMode) {
      // EXPERIMENT MODE
      await BrowserBot.setUpExperiment();
    } else if (followMode) {
      await BrowserBot.runFollowStrategy(targetHashtags, followNumberTarget);
    } else if (unfollowMode) {
      await BrowserBot.runMassUnfollow(followNumberTarget);
    }
  } catch (e) {
    console.error('------------- Terminated with an error -----------');
    console.error(e);
    await BrowserBot.takeErrorScreenshot();
  } finally {
    // No matter what error is thrown, we should terminate the processes correctly
    await BrowserBot.end(/* logout */ !isExperimentMode);
    console.log('Finished at', new Date().toLocaleString());
    // Force terminate (because selenium subprocess kill is buggy)
    setTimeout(() => {
      process.exit();
    }, 5000);
  }
})();
