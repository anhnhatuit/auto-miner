const puppeteer = require('puppeteer');
const _ = require('lodash');
const userA = require('./user-agents-gs.json');
const fs = require('fs');
const interval = require('interval-promise');

const pass = 'Anhtuan@123';
let id = new Date().getTime();
let pathFileName = `./${id}_accounts_registered.json`;

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

let list = [];

const setup = async () => {
  let browser;
  let page2;
  try {
    if (list.length >= 5) {
      id = new Date().getTime();
      pathFileName = `./${id}_accounts_registered.json`;
      list =[];
    }

    if (fs.existsSync(pathFileName)) {
      list = require(pathFileName);
    }

    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--window-size=800,600'],
      timeout: 0,
      defaultBrowserContext: 'default',
      ignoreHTTPSErrors: true,
    });
    page2 = await browser.newPage();
    await page2.setUserAgent(_.sample(userA).userAgent);
    const titleMail = makeid(10, 20).toLowerCase();
    const emailAddress = titleMail + '@mailforspam.com';
    console.log('Register for email: ', emailAddress);
    await page2.goto('https://databricks.com/try-databricks');
    try {
      await page2.waitForSelector('#onetrust-accept-btn-handler', {timeout: 60000});
    } catch (e){
      console.error(e);
      await page2.close();
      await browser.close();
      return await setup();
    }
    await new Promise((rs) => setTimeout(rs, 3000));
    if (await page2.$('#onetrust-accept-btn-handler')) {
      await page2.click('#onetrust-accept-btn-handler');
      await new Promise((rs) => setTimeout(rs, 2000));
    }
    await page2.type("input#free-trial-form_firstName", makeid(4, 5));
    await (await page2.$x('//*[@id="free-trial-form_lastName"]'))[0].type(makeid(5, 10));
    await (await page2.$x('//*[@id="free-trial-form_company"]'))[0].type(makeid(5, 10));
    await (await page2.$x('//*[@id="free-trial-form_email"]'))[0].type(emailAddress);
    await (await page2.$x('//*[@id="free-trial-form_title"]'))[0].type(makeid(5, 10));
    await page2.click('#free-trial-form_country');
    await new Promise((rs) => setTimeout(rs, 1000));
    await (await page2.$('#free-trial-form_country')).press('Space');
    await page2.click('button#submit');
    await page2.waitForSelector('#community-edition', {visible: true});
    await new Promise((rs) => setTimeout(rs, 5000));
    await page2.evaluate(() => {
      document.querySelector('#community-edition').click();
    });
    await new Promise((rs) => setTimeout(rs, 10000));
    await interval(async (num, stop) => {
      try {
        if (!await page2.$('#CaptchaFrame') && await page2.$('#main_heading')) {
          stop();
          const checkMail = async (i = 0) => {
            try {
              console.log('Check mailbox: ', emailAddress);
              await page2.goto("https://www.mailforspam.com/mail/" + titleMail + '/1');
              await page2.waitForSelector('#messagebody');
            } catch (e) {
              ++i;
              if (i <= 10) {
                await new Promise((rs) => setTimeout(rs, 5000));
                await checkMail(i);
              } else {
                throw e;
              }
            }
          }

          await checkMail();
          const href = await page2.$eval('a[href*="https://community.cloud.databricks.com/login.html"]', element => element.getAttribute('href'));
          console.log('Verify setup password for: ', emailAddress);
          await page2.goto(href);

          const trySubmit = async (i = 0) => {
            try {
              await page2.reload();
              await page2.waitForSelector('input[type="password"]');
              await new Promise((rs) => setTimeout(rs, 3000));
              await page2.type('input[placeholder="Password"]', pass);
              await page2.type('input[placeholder="Confirm Password"]', pass + '\u000d');
              await new Promise((rs) => setTimeout(rs, 2000));
              if (await page2.$('#reset-warning')) {
                await page2.type('input[placeholder="Confirm Password"]', '\u000d');
              }
              await page2.waitForSelector('a[data-testid="Compute"]');
            } catch (e) {
              ++i;
              if (i <= 5) {
                await trySubmit(i);
              } else {
                throw e;
              }
            }
          }

          await trySubmit();
          console.log('Done register for email: ', emailAddress);

          list.push({
            email: emailAddress,
            pass: pass,
          })

          console.log('Total accounts: ', list.length);

          fs.writeFile(pathFileName, JSON.stringify(list), function (err) {
            if (err) {
              return console.log(err);
            }
            console.log("The file was saved!");
          });

          const pages = await browser.pages();
          await Promise.all(pages.map(page => page.close()));
          await browser.close();
          await setup();
        } else {
          console.log('PLEASE SOLVE CAPTCHA FOR: ', emailAddress);
        }
      } catch (e) {

      }
    }, 5000);
  } catch (e) {
    console.error(e);
    await page2.close();
    await browser.close();
    throw e;
  }
}

const loopSetup = async (i = 0) => {
  try {
    await setup();
  } catch (e) {
    console.error(e)
    ++i;
    console.log('Retrying...', i);
    await loopSetup(i);
  }
}

(async () => {
  let num = 0;
  let startWorkers = 1;
  const generate = async (workers) => {
    for (let i = 1; i <= workers; i++) {
      console.log('Worker ', i)
      try {
        await loopSetup();
        ++num;
      } catch (e) {
        console.log('Ignore error', e);
      }
    }
  }
  await generate(startWorkers);
})();
