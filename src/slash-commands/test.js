const Discord = require('discord.js');
const { getVersion } = require('../lib/global-vars');

module.exports = {
	data: new Discord.SlashCommandBuilder()
        .setName('test')
        .setDescription('Sends a random gif!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The gif category')
                .setRequired(true)
                .addChoices(
                    { name: 'Funny', value: 'gif_funny' },
                    { name: 'Meme', value: 'gif_meme' },
                    { name: 'Movie', value: 'gif_movie' },
                )),
	async execute(interaction) {
        const embed = new Discord.EmbedBuilder()
            .setColor(0xa0a0a0)
            .setTitle('GFN Discord Bot')
            //.setDescription('Beep boop, I am a bot made for the GFN clan. My purpose is to ~~destroy Rogue~~ help in any way I can.')
            .addFields({name: `Version`, value: `${getVersion()}`})
            .setFooter({ text: `Made with ❤ by digitalFlame` })
		await interaction.reply({ embeds: [embed]})
	},
};