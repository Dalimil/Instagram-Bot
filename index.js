
const Url = {
  loginUrl: 'https://www.instagram.com/accounts/login/ajax/',
  logoutUrl: 'https://www.instagram.com/accounts/logout/',

  getHashtagUrl(hashtag) =>
    `https://www.instagram.com/explore/tags/${hashtag}/?__a=1`,

  getLocationUrl(location) =>
    `https://www.instagram.com/explore/locations/${location}/?__a=1`,

  getUsernameUrl(username) =>
    `https://www.instagram.com/${username}/?__a=1`,

  getUserDetailUrl(username) =>
   `https://i.instagram.com/api/v1/users/${username}/info/`,
   // alternatively: https://www.instagram.com/${username}/

  getFollowUrl(username) =>
    `https://www.instagram.com/web/friendships/${username}/follow/`,

  getUnfollowUrl(username) =>
    `https://www.instagram.com/web/friendships/${username}/unfollow/`,

  getLikeUrl(mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/like/`,

  getUnlikeUrl(mediaId) =>
    `https://www.instagram.com/web/likes/${mediaId}/unlike/`,

  getMediaDetailUrl(mediaId) =>
   `https://www.instagram.com/p/${mediaId}/?__a=1`,
};


// HTTP Error 400 = Instagram ban -> wait 2 hours
const Http = {
  // handle cookies etc. here
  get(url) => {
    // todo
  }
  post(url, data) => {
    // todo
  }
}

/*
describe('Hangouts invites', function() {
  browser.log('driver');

  it('should send invites', function() {
    browser.url(loginUrl);
    browser.element('input[type="email"]').setValue("dalimil.me");
    browser.click('div#identifierNext');
    browser.pause(1000);
    ids.forEach(id => {
      try {
        console.log(id);
        browser.url(getHangoutInviteUrl(id));
        const frameId = $$("iframe.Xyqxtc")[1].getAttribute("id");
        browser.frame(frameId);
        const name = browser.getText('div.Ob2Lud');
        browser.element('div.editable').setValue(getInviteMsg(name.split(" ")[0]));
        browser.pause(3000);
        try { 
          browser.click('button.mj7wCe');
        } catch (e) {
          browser.keys("\uE007"); 
        }
        browser.frame(null);
        browser.pause(2000);
      } catch (e) {}
    });
  });
});
*/