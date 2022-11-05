const notes = require("../../release-notes.json")
const { getBotVersion, updateBotVersion, getConfiguration } = require("../models/configuration-model")
const { getVersion } = require("./global-vars")
const logger = require("./logger")
const { toJson } = require("./utils")

async function publishReleaseNotes(client) {
    logger.info(`checking release notes`)
    const botVersion = getVersion()
    await client.guilds.fetch()
    client.guilds.cache.forEach(async guild => {
        logger.info(`evaluating guild ${guild.id}`)
        const config = await getConfiguration(guild.id)
        const currentVersion = config.botVersion
        if(currentVersion != botVersion) {
            logger.info(`new version detected for guild ${guild.id}. Current = ${currentVersion}, new = ${botVersion}`)
            const rnMessage = await getReleaseNoteMessage(botVersion)
            logger.debug("message: ")
            logger.debug(rnMessage)
            if(rnMessage) {
                await guild.channels.fetch()
                const rnChannels = await guild.channels.cache.filter(channel => channel.name.includes("release-notes"))
                const botChannels = await guild.channels.cache.filter(channel => channel.name.includes("bot-channel"))
                logger.debug(botChannels)
                let channel
                if(rnChannels.size == 1) {
                    channel = rnChannels.first()
                } else if(botChannels.size == 1) {
                    channel = botChannels.first()
                }
                if(channel) {
                    await channel.send(rnMessage)
                    updateBotVersion(guild.id, botVersion)
                }
            } else {
                logger.info(`no release notes to send for version ${botVersion}`)
            }
        } else {
            logger.info(`nothing new for guild ${guild.id}. Current = ${currentVersion}, new = ${botVersion}`)
        }
    })
}

async function getReleaseNoteMessage(version) {
    logger.debug(`looking for release notes for version ${version}`)
    logger.debug(toJson(notes))
    const releaseNotes = notes[version]
    logger.debug('checking release notes:')
    logger.debug(releaseNotes)
    if(releaseNotes && releaseNotes.length > 0) {
        let noteMessage = `**GFN Bot Version ${version} -- Release Notes**`
        await releaseNotes.forEach(note => {
            noteMessage += `\n - **${note.change}**\n   -> ${note.description}`
        })
        return noteMessage
    }
    return undefined
}

module.exports = {
    publishReleaseNotes: publishReleaseNotes
}