#!/bin/sh

pkill -9 java
pkill -9 chromium
pkill -9 .*chrome
pkill -9 node

cd /home/dalimilhajek/main-source/
yarn start --headless | tee -a ../served/log.txt

pkill -9 java
pkill -9 chromium
pkill -9 .*chrome
pkill -9 node
