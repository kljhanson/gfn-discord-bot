const logger = require('./logger');
const { playMessage, playMusic } = require('./audio-utils');
const { sleep } = require('./utils');
const { getConfiguration } = require('../models/configuration-model');

async function messWithRogue(client) {
    logger.info(`bothering rogue`)
    let guild = client.guilds.cache.first()
    const config = await getConfiguration(guild.id)
    if(config.botherRogue === false) {
        logger.info(`Rogue protocol disabled, sad beep boops`)
    } else {
        logger.info(`Rogue protocol is a go, waiting for target to join the rendezvous`)
        client.on('voiceStateUpdate', async (oldState, newState) => {
            logger.debug(newState.member.user.username)
            logger.debug(newState.mute)
            logger.debug(newState.channelId)
            let isTimeToClownRogue = newState.member.user.username === "RogueOutsider" && !newState.mute && newState.channelId
            logger.debug(isTimeToClownRogue)
            if (isTimeToClownRogue) {
            logger.info(`Rogue has joined a VC, this is not a drill!!`)
            await sleep(30000)
            await newState.member.fetch()
            if(!newState.member.voice?.channel) {
                logger.info(`target has left the VC, I repeat -- target is AWOL`)
                return 
            }
            dispatchPayload(newState.guild, newState.channel)
            } else {
                logger.info("User isn't rogue, false alarm");
            }
        });
    }
}

function messWithRogueManual(interaction) {
    dispatchPayload(interaction.guild, interaction.member.voice.channel)
}

async function dispatchPayload(guild, channel) {
    if(guild && channel) {
        logger.debug(`sending payload`)
        await playMessage(channel, 'I found you, Rogue!', 4000, false)
        await playMessage(channel, `You can't hide from me!`, 3000, false)
        await playMessage(channel, `I have something for you, don't go anywhere`, 6000, false)
        await playMusic(channel, '../../assets/pumpkin-cowboy.ogg', 32000, false)
        await playMessage(channel, `Thanks for listening, Rogue. Talk to you later, love you. Beep boop, Bye!`, 10000, true)
    } else {
        logger.debug(`${channel} is invalid channel`)
    }
}

module.exports = {
    messWithRogue: messWithRogue,
    messWithRogueManual: messWithRogueManual
}