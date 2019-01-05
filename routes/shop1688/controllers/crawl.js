const axios = require('axios');
const puppepeer = require('puppeteer');
const randomUA = require('modern-random-ua');
const fs = require('fs');
const Path = require('path');
const cfs = require('../configs');

exports.crawl = async (req, res, next) => {
    const browser = await puppepeer.launch({
        
        executablePath:'/snap/bin/chromium',
        headless:false,
        slowMo:10,
        defaultViewport: false,
        ignoreDefaultArgs: [
            '--enable-automation'
        ],
    });
    const page  = await browser.newPage();
    page.setUserAgent(randomUA.generate());
    const iLink = [];
    const TABPANE_SELECTOR = ".mod-detail-gallery > div.content > div.tab-pane";
    const IMAGES_SELECTOR = ".mod-detail-gallery > .content > #dt-tab > .tab-content-container > ul";
    const LINK_THUMB_IMAGE_SELECTOR = ".mod-detail-gallery > .content > #dt-tab > .tab-content-container > ul > li:nth-child(INDEX)";
    const OFFERID_SELECTOR = 'meta[name="b2c_auction"]';
    await page.goto(req.body.link).then( async (response) => {
            // check login
            if(response.url().indexOf('https://login.1688.com/member/signin.htm') > -1){
                const username = cfs.acc.USERNAME;
                const password = cfs.acc.PASSWORD;
                const USERNAME_SELECTOR = "#TPL_username_1";
                const PASSWORD_SELECTOR = "#TPL_password_1";
                const LOGIN_BUTTON_SELECTOR = "#J_SubmitStatic";
                const BUTTON_CAPTCHA_SELECTOR = "#nc_1_n1z";
                const LOGIN_CHINA_SELECTOR = "#loginchina";
                try {
                    const loginFrame = page.frames()[0].childFrames()[0];
                    await loginFrame.click(USERNAME_SELECTOR);
                    await loginFrame.waitFor(500);
                    await loginFrame.type(USERNAME_SELECTOR,username, {delay: 100});
                        
                    await loginFrame.waitFor(500);
                    await loginFrame.click(PASSWORD_SELECTOR);
                    await loginFrame.waitFor(500);
                    await loginFrame.type(PASSWORD_SELECTOR,password,  {delay: 100});
                    await loginFrame.waitFor(3000);
                    const contentLogin = await page.$eval(LOGIN_CHINA_SELECTOR, content =>{
                        const {top, left, bottom, right} = content.getBoundingClientRect();
                        return {top, left, bottom, right};
                    });
                    const buttonCaptcha = await loginFrame.$eval(BUTTON_CAPTCHA_SELECTOR, button =>{
                        if(button === null || button ==={}) return null;
                        const {top, left, bottom, right} = button.getBoundingClientRect();
                        return {top, left, bottom, right};
                    });
                    if(buttonCaptcha !== null){
                        let x = buttonCaptcha.left + contentLogin.left;
                        let y = buttonCaptcha.top + contentLogin.top;
                        await loginFrame.waitFor(500);
                        await page.mouse.move(x, y+1);
                        await page.mouse.down();
                        await page.mouse.move(x + 260, y + 1);
                        await page.mouse.up();
                    }
                    await loginFrame.waitFor(500);
                    await loginFrame.focus(LOGIN_BUTTON_SELECTOR);
                    await loginFrame.waitFor(500);
                    await loginFrame.click(LOGIN_BUTTON_SELECTOR);
                    await loginFrame.waitForNavigation();
                }catch (error) {
                    console.log(error);
                    return res.status(500).json({msg:error});
                };
            }
            else {
                return res.status(500).json({msg: "Redirected to unknown link!"})
            }
        // }
        // Get link images to ownload files
        try {
            await page.waitForSelector(IMAGES_SELECTOR);
            await page.waitForSelector(TABPANE_SELECTOR);
        } catch (error) {
            return res.status(500).json({
                msg: "Failed Login!",
                error
            })
        }
        try {
            const listImages = await page.$eval(IMAGES_SELECTOR , images => images.children.length);
            for (let i= 1; i <= listImages; i++){ 
                let dataImgs = await page.$eval(LINK_THUMB_IMAGE_SELECTOR.replace('INDEX', i), link => link.getAttribute('data-imgs'));
                let linkImage = JSON.parse(dataImgs).original;
                iLink.push(linkImage);   
            }
            await page.waitFor(5000);
            // get link video
            const hasVideo = await page.$eval(TABPANE_SELECTOR, video => ((" " + video.className + " ").replace(/[\t\r\n\f]/g, " ").indexOf('video') > -1)); // check having v
            console.log(hasVideo);
            if(hasVideo){
                const VIDEO_SELECTOR = ".mod-detail-gallery > .content > .tab-pane > #detail-main-video-content > .lib-video > video";
                try {
                    const linkVideo = await page.$eval(VIDEO_SELECTOR, video => video.src);
                    console.log(linkVideo);
                    iLink.push(linkVideo);
                } catch (error) {
                    console.log(error);
                    res.status(500).json({msg:error});
                }
            }
            console.log(iLink);
        } catch (error) {
            console.log(error);
           return res.status(500).json({msg:error});
        }
        //create folder
        const itemID = await page.$eval(OFFERID_SELECTOR, offerID => offerID.getAttribute('content'));
        const dir = Path.resolve(__dirname,`../files/${itemID}`); // create folder with name_item
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        //download files
        axios.all(iLink.map(async (link, index) => {
            try {
                let respone = await axios({
                    method: 'GET',
                    url: link,
                    responseType: 'stream'
                });
                const path = (link.indexOf('.mp4') > -1 )? Path.resolve(__dirname, `../files/${itemID}`, `video${index}.mp4`) : Path.resolve(__dirname, `../files/${itemID}`, `anh${index}.jpg`);
                respone.data.pipe(fs.createWriteStream(path));
                return new Promise(( resolve, reject) => {
                    respone.data.on('end' , ()=>{
                        resolve('Sucess!');
                    });
                    respone.data.on('error', () => {
                        reject(err);
                    });
                });
            } catch (error) {
                return Promise.reject(`An image wasn't saved!`);
            }
        }))
        .then(axios.spread((...args) => {
            console.log(args);
            return new Promise ( (resolve, reject) => {
                args.forEach( (param) => {
                    if(!param) reject(`An files wasn't saved!`);
                });
                resolve('Success!');
            });
        }))
        .then(status => {
            browser.close();
            return res.status(200).json({
                msg: status
            });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({msg: err});
        });
    })
    .catch((err) => {
        console.log(err);
        return res.status(500).json({msg: err});
    });
}