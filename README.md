Instagram Bot
============================
First read this, it's a MUST: https://petapixel.com/2017/04/06/spent-two-years-botting-instagram-heres-learned/

Motivation
----------
- Larger number of followers => more likes => reaching top trending charts on Instagram
- Followers need to be real and engaged to produce likes and comments for you.
- Observation: Interaction with other profiles leads to them viewing your profile, which leads to some new followers.

Competition - What is out there
------------------------------
- This has been done a few time and paid services exist that do exactly this.
- See (~ $30/month): Gramista, Instato.io, Instamber, Instavast, Instazood, ...

Requirements
------------
0. You feed/account has to look good - for people to decide to follow you based on your page; Are you unique?
1. Target audience
	- what hashtags or accounts do these people (photographers) follow?
	- Idea: if there is a good photographer I admire, then his/her followers could like my content too (follow me)
2. Check instagram limits for daily follows and likes; Avoid bot & spam detectors
3. Non-evil interactions:
	- Limit to likes, follow, and unfollow
	- other actions like DM, comments, reposts, could be spammy or harmful

Implementation
--------------
- We need to drive a browser instance to do this (Webdriver.IO)
	- OR: come up with an API script-only solution (<- existing work/libraries attempted this)
- Instagram account login
- Algorithm (with time delays between steps)
	- Need a list of accounts or posts to start with
		- initialize with target hashtags OR target (really good) accounts
		- Idea: Crawl through accounts (people) that follow these hashtags or good accounts,
			and add them to the 'Future Follow' list (unless already processed in the past: `processed-accounts.json`)
			- For good account there is going to be thousands of followers, so this is enough for now
		- Keed adding to the 'Future Follow' list until it's filled with a set number of unprocessed accounts (e.g. 500)
	- For each account on 'Future Follow' list:
		- scrape for quality:
			- must be public, must not be already followed and not already following me
			- must have > 10 posts and must have at least one post in the last 14 days
			- must have < 1000 followers and must have < 2000 following
			- must have followers-per-post ratio below say 80 (e.g. account with 100 posts has max 5000 followers)
			- must not have offensive or spammy words in bio, name, or username
			- and more requirements... (see code for implementation details)
		- if checks OK:
			- follow this account and like maximum 1 or 2 of its posts
			- add to the 'Future Unfollow' list with timestamp
			- add to the `processed-accounts.json` list
	- Go through 'Future Unfollow' list and remove people older than say 3 days

