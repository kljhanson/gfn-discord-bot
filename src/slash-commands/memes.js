const Discord = require('discord.js');
const { replyImage, sendReply } = require('../lib/discord-utils');
const { messWithRogue, messWithRogueManual } = require('../lib/meme-utils');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('memes')
		.setDescription('Clan meme commands')
        .addSubcommand(subcommand => subcommand.setName("spook").setDescription("spook"))
        .addSubcommand(subcommand => subcommand.setName("snek").setDescription("snek"))
        .addSubcommand(subcommand => subcommand.setName("hybrid").setDescription("hybrid"))
        .addSubcommand(subcommand => subcommand.setName("knob").setDescription("knob"))
        .addSubcommand(subcommand => subcommand.setName("knobie").setDescription("knobie"))
        .addSubcommand(subcommand => subcommand.setName("rogue").setDescription("rogue"))
        .addSubcommand(subcommand => subcommand.setName("rumi").setDescription("rumi"))
        .addSubcommand(subcommand => subcommand.setName("otherrogue").setDescription("otherrogue")),
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand()
        if(subcommand === 'spook') { 
            replyImage(interaction, 'https://media.discordapp.net/attachments/503667887576317982/640994085909430323/ezgif.com-crop.gif')
        }
        if(subcommand === 'rumi') {
            sendReply(interaction, '<@533119423490293761> Hello bone guy :bone: ')
        }
        if(subcommand === 'rogue') {
            sendReply(interaction, '<@251761701194563584> Hello muppet, beep boop. I calculate we are enemies.')
        }
        if(subcommand === 'otherrogue') {
            messWithRogueManual(interaction)
        }
        if(subcommand === 'snek' || subcommand === 'hybrid') {
            replyImage(interaction, 'https://media.tenor.com/images/f88700a975e4139be55cb933e05f64d7/tenor.gif', '<@231577281758232576>')
        }
        if(subcommand === 'knob' || subcommand === 'knobie') {
            replyImage(interaction, 'https://media.giphy.com/media/Qxp1ahQCHArlK/giphy.gif', '🏳️‍🌈 <@364872700931342339>')
        }
	},
};