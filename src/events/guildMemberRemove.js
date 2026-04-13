const { AttachmentBuilder } = require("discord.js");
const { supabase } = require("../utils/supabase");
const { generateCard } = require("../utils/canvas");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const { guild } = member;

    try {
      const { data } = await supabase
        .from("leaver")
        .select("*")
        .eq("guild_id", guild.id)
        .single();

      if (!data || !data.enabled || !data.channel_id) return;

      const channel = guild.channels.cache.get(data.channel_id);
      if (!channel) return;

      const buffer = await generateCard({
        type: "goodbye",
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatarURL: member.user.displayAvatarURL({ extension: "png" }),
        memberCount: guild.memberCount,
        guildName: guild.name,
        text:
          data.leave_text ||
          "{user} has left the server. Members remaining: {count}.",
        backgroundURL: data.background_url || null,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "goodbye.png",
      });

      await channel.send({ files: [attachment] });
    } catch (err) {
      console.error("[LeaveEvent] Error:", err);
    }
  },
};
