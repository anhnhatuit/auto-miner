#!/bin/bash
sudo apt-get update
sudo apt-get install -y wget gconf-service libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    ca-certificates fonts-liberation libappindicator1 lsb-release xdg-utils libgtk2.0-0 libgconf-2-4 \
    libnotify4 libasound2 libxtst6 libxss1 libnss3 xvfb libgbm-dev
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
npm install -g npm
npm install -g pm2
npm i
