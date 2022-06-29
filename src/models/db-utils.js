const mongoose = require('mongoose');
const {getConfig} = require('../lib/config');
const logger = require('../lib/logger');

function initMongo() {
    mongoose.connect(getConfig().dbUrl, {useNewUrlParser: true})
    const db = mongoose.connection
    db.on('error', console.error.bind(console, 'connection error:'))
    db.once('open', function() {
        logger.info('connection opened to mogno')
    });
}

module.exports = {
    initMongo: initMongo
}