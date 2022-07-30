const prod = require('../../configs/production.json')
const beta = require('../../configs/beta.json')
const dev = require('../../configs/dev.json')
const test = require('../../configs/test.json')
// const logger = require('./logger')

function getConfig() {
    // logger.info(`getting ${process.env.NODE_ENV} configuration`)
    if(process.env.NODE_ENV === "production") {
        return prod
    }
    if(process.env.NODE_ENV === "beta") {
        return beta
    }
    if(process.env.NODE_ENV === "test") {
        return test
    }
    return dev
}

function getEnv() {
    // logger.info(`getting ${process.env.NODE_ENV} configuration`)
    if(process.env.NODE_ENV === "production") {
        return "prod"
    }
    if(process.env.NODE_ENV === "beta") {
        return "beta"
    }
    return "dev"
}

module.exports = {
    getConfig: getConfig,
    getEnv: getEnv
}