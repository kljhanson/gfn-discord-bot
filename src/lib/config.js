const prod = require('../../configs/production.json')
const beta = require('../../configs/beta.json')
const dev = require('../../configs/dev.json')
// const logger = require('./logger')

function getConfig() {
    // logger.info(`getting ${process.env.NODE_ENV} configuration`)
    if(process.env.NODE_ENV === "production") {
        return prod
    }
    if(process.env.NODE_ENV === "beta") {
        return beta
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