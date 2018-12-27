const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const Path = require('path');

const parseQuery = require('../utils/parseQuery');
const parseLink = require('../utils/parseLink');

const download =  (res) => {
    if(!res.status === 200){
        throw new Error(`Can't get to link`);
    }

    const html = res.data;
    const $ = cheerio.load(html);
    // get Thumb Element
    const tb_thumb = $('.tb-item-info-l ul#J_UlThumb');

    let links = {
        // video: "",
        images : []
    }
    //get link video
    //get link images
    tb_thumb.children('li').each((i, elem) => {
        if(!$(elem).hasClass('tb-video-thumb')){
            links.images.push(parseLink($(elem).find('img').attr('data-src')));
        }
    });
    const dir = Path.resolve(__dirname,`../images/${res.itemID}`);
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    return axios.all(links.images.map(async (link, index) => {
        try {
            let respone = await axios({
                method: 'GET',
                url: link,
                responseType: 'stream'
            });
            const path = Path.resolve(__dirname, `../images/${res.itemID}`, `anh${index}.jpg`);
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
    }));
}


exports.crawl = (req, res, next) => {
    const link = req.body.link;
    const itemID = parseQuery(link).id;
    if(!link){
        return res.status(500).json({msg: 'Invalid link!'});
    }
    return axios.get(link)
                .then(res => {
                    if(!res.status === 200){
                        throw new Error(`Can't get to link`);
                    }
                    return Object.assign({itemID: itemID}, res);
                })
                .then(download)
                .then(axios.spread((...args) => {
                    console.log(args);
                   return new Promise ( (resolve, reject) => {
                        args.forEach( (param) => {
                            if(!param) reject(`An image wasn't saved!`);
                        });
                        resolve('Success!');
                   });
                }))
                .then(status => {
                    return res.status(200).json({
                        msg: status
                    });
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json({msg: err});
                });
}