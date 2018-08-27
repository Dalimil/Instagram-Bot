Instagram Bot
============================
First read this, it's a MUST: https://petapixel.com/2017/04/06/spent-two-years-botting-instagram-heres-learned/

Motivation
----------
- How to get 'a lot of followers => lot of likes => top of trending charts' on Instagram
- Could buy likes and followers - but these are fake and meaningless
- Most active Instagram people are below the age of 24 - that's your Instagram audience
- Observation: When someone likes your picture or more importantly follows you, you check their page / who they are
-> We can exploit this human behaviour

Competition - What is out there
------------------------------
- This has been done a few time and paid services exist that do exactly this.
- See (~ $30/month): Gramista, Instato.io, Instamber, Instavast, Instazood, ...

Requirements
------------
0. You feed/account has to look good - for people to decide to follow you based on your page; Are you unique?
1. Target audience - what hashtags or accounts do these people (photographers) follow
2. Check instagram limits for daily follows and likes; Avoid bot & spam detectors
3. Non-evil interactions:
	- Limit to follow, unfollow, like (below 1000likes/day is safe)
	- other actions like DM, comments, reposts, could be spammy or harmful

Implementation
--------------
- We need to drive a browser instance to do this (Webdriver.IO)
	- OR: come up with an API script-only solution (<- we chose this, thanks to discovery of existing work)
- Instagram account login
- BFS Algorithm with time delays between each step
- Algorithm
	- Need a list of accounts or posts to start with
		- initialize with target hashtags OR target (really good) accounts
		- Idea: Crawl through accounts (people) that follow these hashtags or good accounts,
			and add them to the 'Future Follow' list (unless already processed in the past: `processed-accounts.json`)
			- For good account there is going to be thousands of followers, so this is enough for now
		- Keed adding to the 'Future Follow' list until it's filled with a set number of unprocessed accounts (e.g. 500)
	- For each account on 'Future Follow' list:
		- scrape for quality:
			- must be public, must not be already followed and not already following me
			- must have > 30 posts
			- must have < 3000 followers
			- must have < 2000 following
			- must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 5000 followers)
			- must not have these words in bio: "click, bio, link, webcam, cam, gain, snapchat, follow, followers, kik"
			- must not have these words in name or username: "salon, sex, rental, free, follow, follower"
			- randomly skip this acc with 10% chance (more human like behaviour)
		- if checks OK:
			- follow this account and like maximum 1 or 2 of its posts
			- add to the 'Future Unfollow' list with timestamp
	- Go through 'Future Unfollow' list and remove people older than say 3 days

