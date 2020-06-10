const config = {
  isMobile: false,
  isHeadless: process.argv.includes('--headless'),
  isBrowseOnlyMode: process.argv.includes('--browseOnly'),
  webdriverBrowserConfig: null
};

config.webdriverBrowserConfig = {
  // logLevel: 'trace',
  outputDir: process.argv.includes('--experiment') ? undefined : './served/',
  capabilities: {
    browserName: 'chrome',
    newCommandTimeout: 300,
    chromeOptions: {
      args: [
        ...(config.isMobile
          ? ['user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60 Instagram 12.0.0.16.90 (iPhone9,4; iOS 10_3_3; en_US; en-US; scale=2.61; gamut=wide; 1080x1920)']
          : ['user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36']
        ),
        ...(config.isHeadless ? ['headless', 'disable-gpu', 'disable-sync', 'no-sandbox'] : []),
        `--window-size=1920,1080`,
      ],
    },
  }
};

module.exports = config;
