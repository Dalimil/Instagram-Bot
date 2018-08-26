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
- Algorithm A
	- Need a queue list of accounts to start with (good 3 accounts is enough OR start with your own acc)
	- For each acc on 'Future Follow' list:
		- scrape for quality:
			- must be public
			- must have > 30 posts
			- must have < 3000 followers
			- must have < 2000 following
			- must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 5000 followers)
			- must not have these words in bio: "click, bio, link, webcam, cam, gain, snapchat, follow, followers, kik"
			- must not have these words in name or username: "salon, sex, rental, free, follow, follower"
			- randomly skip this acc with 10% chance (more human like behaviour)
		- scrape for relevance:
			- get hashtags from their posts
		- if checks OK:
			- if not already following:
				- follow this account and like maximum 1 or 2 of its posts
				- add to the 'Future Unfollow' list
			- append each person he/she follows to 'Future Follow' (unles processed visited)
	- Run until set limit (e.g. 200)
	- Go through 'Future Unfollow' list and remove people older than say 3 days
- Algorithm B
	- Similar to Algorithm A, but initialize with target hashtags + target (really good) accounts
	- Crawl through accounts that follow these targets (people who follow these hashtags or good accounts)

