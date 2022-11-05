const Discord = require('discord.js');
const logger = require('./logger');
const { toJson } = require('./utils');

async function cleanupIronBannerChannels(client) {
    logger.info(`cleaning up iron banner voice channels`)
    // await client.guilds.fetch()
    client.guilds.cache.forEach(async guild => {
        await guild.channels.fetch()
        const ibChannels = await guild.channels.cache.filter(channel => channel.name.startsWith("ib-") && channel.type === Discord.ChannelType.GuildVoice)
        logger.debug(ibChannels)
        logger.debug(toJson(ibChannels))
        ibChannels.forEach(async channel => {
            // await channel.fetch()
            logger.debug(`checking ${channel.name}`)
            logger.debug(toJson(channel.members))
            logger.debug(channel.members.size)
            // await channel.members.forEach(async member => await member.fetch())
            if(channel.members.size == 0) {
                logger.debug(`${channel.name} is empty...`)
                channel.delete()
            } else {
                logger.debug(`${channel.name} is still active`)
            }
        })
    })
}

module.exports = {
    cleanupIronBannerChannels: cleanupIronBannerChannels
}