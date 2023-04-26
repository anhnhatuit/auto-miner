FROM node:11.13.0
# Define working directory and copy source
RUN mkdir -p /app
WORKDIR /app

# Global node packages
RUN npm install pm2 -g

RUN sudo apt-get update &&\
    sudo apt-get install -y wget gconf-service libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    ca-certificates fonts-liberation libappindicator1 lsb-release xdg-utils libgtk2.0-0 libgconf-2-4 \
    libnotify4 libasound2 libxtst6 libxss1 libnss3 xvfb

RUN apt update && \
    apt install -y wget libxrender1 libssl1.0-dev xfonts-utils xfonts-base xfonts-75dpi libfontenc1 x11-common xfonts-encodings libxfont1 fontconfig

RUN wget -O /usr/local/bin/dumb-init https://precise-prod.storage.googleapis.com/packages/dumb-init_1.2.2_amd64
RUN chmod +x /usr/local/bin/dumb-init

COPY ./start.sh /start.sh
RUN chmod +x /start.sh

COPY ./pm2_start.sh /pm2_start.sh
RUN chmod +x /pm2_start.sh

COPY ./package.json /app/package.json
RUN npm install

COPY . .
ENTRYPOINT ["dumb-init", "--"]
CMD ["/pm2_start.sh"]
