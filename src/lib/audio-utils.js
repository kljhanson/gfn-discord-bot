const Discord = require('discord.js');
const logger = require('./logger');
const discordTTS = require('discord-tts');
const { createReadStream } = require('node:fs');
const {AudioPlayer, createAudioResource, StreamType, entersState, VoiceConnectionStatus, joinVoiceChannel, AudioPlayerStatus, getVoiceConnection} = require("@discordjs/voice");
const { join } = require('node:path');
const { sleep } = require('./utils');

let audioPlayer = null
function getAudioPlayer(guild, disconnectOnFinished = true) {
    if(!audioPlayer || audioPlayer === null) {
        audioPlayer = new AudioPlayer();
    }
    return audioPlayer
}

function getMessageAudio(message) {
    const stream = discordTTS.getVoiceStream(message);
    return createAudioResource(stream, {inputType: StreamType.Arbitrary});
}

async function playMessage(channel, message, delay, disconnectOnFinished = true) {
    await play(channel, getMessageAudio(message), delay, disconnectOnFinished)
}

async function playMusic(channel, filename, delay, disconnectOnFinished = true) {
    const songResource = createAudioResource(
        createReadStream(join(__dirname, filename)), {inputType: StreamType.OggOpus, inlineVolume: true});
    songResource.volume.setVolume(0.35)
    await play(channel, songResource, delay, disconnectOnFinished)
}

async function play(channel, audioResource, delay, disconnectOnFinished = true) {
    let connection = await connectToVoice(channel)
    if(connection) {
        let player = getAudioPlayer(channel.guild, disconnectOnFinished)
        if(connection.status === VoiceConnectionStatus.Connected) {
            connection.subscribe(player)
            player.play(audioResource)
            await sleep(delay)
            player.stop()
            if(disconnectOnFinished) {
                disconnect(channel.guild)
            }
        }
    }
}

async function connectToVoice(channel) {
    if(channel && channel.type === Discord.ChannelType.GuildVoice) {
        logger.info(`checking connection status`)
        let connection = getVoiceConnection(channel.guild.id);
        logger.debug(`connection: ${connection}`)
        logger.debug(`status: ${connection?.status}`)
        logger.debug(`connected to channel: ${connection?.channel?.id}`)
        logger.debug(`checking for channel: ${channel?.id}`)
        if(!connection) {
            logger.info(`connecting to voice channel ${channel.name}`)
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            connection = await entersState(connection, VoiceConnectionStatus.Connecting, 5_000);
        }
        return connection
    }
    return null
}

async function disconnect(guild) {
    let connection = getVoiceConnection(guild.id);
    if(!connection) {
        logger.error(`not able to disconnect`)
        return
    }
    audioPlayer.stop()
    connection.destroy()
    audioPlayer = null
    logger.info(`disconnected from voice`)
}

module.exports = {
    play: play,
    playMusic: playMusic,
    playMessage: playMessage,
    connectToVoice: connectToVoice,
    getAudioPlayer: getAudioPlayer,
    disconnect: disconnect
}