const { AttachmentBuilder } = require("discord.js");
const { supabase } = require("../utils/supabase");
const { generateCard } = require("../utils/canvas");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const { guild } = member;

    try {
      const { data } = await supabase
        .from("welcomer")
        .select("*")
        .eq("guild_id", guild.id)
        .single();

      if (!data || !data.enabled || !data.channel_id) return;

      const channel = guild.channels.cache.get(data.channel_id);
      if (!channel) return;

      const buffer = await generateCard({
        type: "welcome",
        username: member.user.username,
        displayName: member.displayName,
        avatarURL: member.user.displayAvatarURL({ extension: "png" }),
        memberCount: guild.memberCount,
        guildName: guild.name,
        text:
          data.welcome_text ||
          "Welcome to {server}! You are member #{count}.",
        backgroundURL: data.background_url || null,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "welcome.png",
      });

      await channel.send({
        content: `${member}`,
        files: [attachment],
      });
    } catch (err) {
      console.error("[WelcomeEvent] Error:", err);
    }
  },
};
