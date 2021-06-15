Instagram Bot
============================
*I've used my bot on and off for 3 whole years. I slowly got to 10k followers ([@dali_hiking](https://www.instagram.com/dali_hiking/)) and then got bored of constantly staying up to date with IG changes, so I've stopped. I'm sharing it as a learning resource for anyone who is looking into botting or bot mitigation.*

Motivation
----------
- Required Reading: https://petapixel.com/2017/04/06/spent-two-years-botting-instagram-heres-learned/
- Larger number of followers => more likes => reaching top trending charts on Instagram
- Followers need to be real and engaged to produce likes and comments for you.
- **Observation**: Interaction with other profiles leads to them viewing yours, which leads to new followers.

What is out there
------------------------------
- This has been done a few time and paid services exist that do exactly this.
- See (~ $30/month): Gramista, Instato.io, Instamber, Instavast, Instazood, ...

Requirements
------------
- You feed/account has to look good - for people to decide to follow you based on your page
- Target audience - what hashtags or accounts do these people follow?
- Check instagram limits for daily follows and likes; Avoid bot & spam detectors
- Non-evil interactions: Limit to likes, follow, and unfollow. (other actions like DMs, comments!, or reposts, are spammy and harmful)

Implementation
--------------
- We need to drive a browser instance to do this (Webdriver.IO)
	- OR: come up with an API script-only solution (<- much harder)
- Pass Instagram account login gate - captcha, 2-auth, etc. can be manual just to get valid session cookies
- Follow Algorithm (with random time delays between steps)
	- Open home page
		- scroll through feed, like a few posts or comments randomly
		- browser through a few stories
	- Search for a random hashtag from list by typing in searchbox
	- And go to that hashtag feed
	- Pick a post from that feed and open a list of people who most recently liked that post
	- Follow a few of those people (~5)
	- Go to Discover page, browse through feed and like something
	- Repeat from start until follow target reached (say 40 people in one session)

