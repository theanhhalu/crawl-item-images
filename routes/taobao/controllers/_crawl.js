const puppeteer = require('puppeteer');
const fs = require('fs');
const Path = require('path');
const axios = require('axios');
const utils = require('../utils');

exports._crawl = async (req, res, next) => {
    // launch browser headless
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // essential selectors
    const BUTTON_PLAY_VIDEO_SELECTOR = "div.vjs-center-container > .vjs-center-start.vjs-button";
    const MAIN_PIC_SELECTOR = '.tb-item-info-l > div.tb-gallery > div.tb-main-pic';
    const TB_THUMB_SELECTOR = '.tb-item-info-l > .tb-gallery > ul#J_UlThumb';
    const LINK_THUMB_IMAGE = '.tb-item-info-l > .tb-gallery > ul#J_UlThumb > li:nth-child(INDEX) > div > a > img';
    let links =[];

    try {
        await page.goto(req.body.link);
    } catch (e) {
        console.log(e);
        return res.status(500).json({msg:`Can't get to link item`, error: e});
    }
    // Check if having video item
    const hasVideo = await page.$eval(MAIN_PIC_SELECTOR, video => ((" " + video.className + " ").replace(/[\t\r\n\f]/g, " ").indexOf('tb-video-mode') > -1));
    if(hasVideo){
        try {
            await page.$eval(BUTTON_PLAY_VIDEO_SELECTOR, ele => ele.click());
            const linkVideo = await page.$eval(`${MAIN_PIC_SELECTOR} > div.tb-video > div.lib-video > video` , link => link.src);
            links.push(linkVideo);
        } catch (e) {
            if (e instanceof TimeoutError){
                console.log(e);
                return res.status(500).json({msg:`Can't play video item`, error: e});
            }
        }
    }
    // Get link images of item
    const listLinksLength = await page.$eval(TB_THUMB_SELECTOR, link => link.children.length);
    for (let i= 2; i <= listLinksLength; i++){ // ignore video image
        let linkImage = await page.$eval(LINK_THUMB_IMAGE.replace('INDEX', i), link => link.src);
        console.log(linkImage);
        links.push(utils.parseLink(linkImage));
    }
    const itemID = utils.parseQuery(req.body.link).id; // get id_item
    const dir = Path.resolve(__dirname,`../files/${itemID}`); // create folder with name_item
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    // download files of item
    axios.all(links.map(async (link, index) => {
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
}

