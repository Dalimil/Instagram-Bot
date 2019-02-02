#!/bin/sh

pkill -9 java
pkill -9 chromium

cd /home/dalimilhajek/main-source/
yarn start --headless | tee -a ../served/log.txt

pkill -9 java
pkill -9 chromium
