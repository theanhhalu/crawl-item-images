const axios = require('axios');
const puppepeer = require('puppeteer');
const randomUA = require('modern-random-ua');

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
    const item = {
        linkVideo: "",
        linkImages: []
    }
    const TABPANE_SELECTOR = ".mod-detail-gallery > .content > .tab-pane";
    const IMAGES_SELECTOR = ".mod-detail-gallery > .content > #dt-tab > .tab-content-container > ul";
    const LINK_THUMB_IMAGE_SELECTOR = ".mod-detail-gallery > .content > #dt-tab > .tab-content-container > ul > li:nth-child(INDEX)";
    await page.goto(req.body.link).then( async (response) => {
            // check login
            if(response.url().indexOf('https://login.1688.com/member/signin.htm') > -1){
                const username = "theanha5";
                const password = "0961204798a5"
                const USERNAME_SELECTOR = "#TPL_username_1";
                const PASSWORD_SELECTOR = "#TPL_password_1";
                const LOGIN_BUTTON_SELECTOR = "#J_SubmitStatic";
                const BUTTON_CAPTCHA = "#nc_1_n1z";
                const LOGIN_CHINA = "#loginchina";
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
                    const contentLogin = await page.$eval(LOGIN_CHINA, content =>{
                        const {top, left, bottom, right} = content.getBoundingClientRect();
                        return {top, left, bottom, right};
                    });
                    const buttonCaptcha = await loginFrame.$eval(BUTTON_CAPTCHA, button =>{
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
        const hasVideo = await page.$eval(TABPANE_SELECTOR, link => ((" " + link.className + " ").replace(/[\t\r\n\f]/g, " ").indexOf('video') > -1)); // check having video
        // get link video
        if(hasVideo){
            const VIDEO_SELECTOR = ".mod-detail-gallery > .content > .tab-pane > #detail-main-video-content > .lib-video > video";
            try {
                const linkVideo = await page.$eval(VIDEO_SELECTOR, video => video.src);
                console.log(linkVideo);
                item[linkVideo] = linkVideo;
            } catch (error) {
                console.log(error);
                return res.status(500).json({msg:error});
            }
        }
        try {
            const listImages = await page.$eval(IMAGES_SELECTOR , images => images.children.length);
            for (let i= 1; i <= listImages; i++){ 
                let dataImgs = await page.$eval(LINK_THUMB_IMAGE_SELECTOR.replace('INDEX', i), link => link.getAttribute('data-imgs'));
                let linkImage = JSON.parse(dataImgs).original;
                item.linkImages.push(linkImage);   
            }
            console.log(item);
            return res.status(200).json({msg:'Download Success!'});
        } catch (error) {
            console.log(error);
            return res.status(500).json({msg:error});
        }
         browser.close();
    })
    .catch((err) => {
        console.log(err);
        return res.status(500).json({msg: err});
    });
}