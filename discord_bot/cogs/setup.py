"""Setup cog — configure DM role, channels, and view server status."""
from __future__ import annotations
import discord
from discord import app_commands
from discord.ext import commands
from .. import config
from ..guard import dm_only, is_dm


class SetupCog(commands.Cog, name="Setup"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    setup_group = app_commands.Group(name="setup", description="Configure the bot for this server")

    @setup_group.command(name="role", description="Set the DM role (grants DM command access)")
    @dm_only()
    async def setup_role(self, interaction: discord.Interaction, role: discord.Role):
        config.set_key(interaction.guild.id, "dm_role_id", role.id)
        await interaction.response.send_message(
            f"DM role set to **{role.name}**. Members with this role can use DM commands.",
            ephemeral=True,
        )

    @setup_group.command(name="dm_channel", description="Set the DM-only channel (commands here are DM-restricted)")
    @dm_only()
    async def setup_dm_channel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        config.set_key(interaction.guild.id, "dm_channel_id", channel.id)
        await interaction.response.send_message(
            f"DM channel set to {channel.mention}. Commands used there are treated as DM commands.",
            ephemeral=True,
        )

    @setup_group.command(name="player_channel", description="Set the player feed channel")
    @dm_only()
    async def setup_player_channel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        config.set_key(interaction.guild.id, "player_channel_id", channel.id)
        await interaction.response.send_message(
            f"Player feed channel set to {channel.mention}.",
            ephemeral=True,
        )

    @setup_group.command(name="status", description="Show current bot configuration")
    async def setup_status(self, interaction: discord.Interaction):
        cfg = config.get(interaction.guild.id)
        guild = interaction.guild

        def resolve_role(rid):
            if not rid:
                return "_not set_"
            r = guild.get_role(int(rid))
            return r.mention if r else f"_unknown role {rid}_"

        def resolve_channel(cid):
            if not cid:
                return "_not set_"
            c = guild.get_channel(int(cid))
            return c.mention if c else f"_unknown channel {cid}_"

        embed = discord.Embed(title="Bot Configuration", colour=0xD4A040)
        embed.add_field(name="DM Role", value=resolve_role(cfg["dm_role_id"]), inline=True)
        embed.add_field(name="DM Channel", value=resolve_channel(cfg["dm_channel_id"]), inline=True)
        embed.add_field(name="Player Channel", value=resolve_channel(cfg["player_channel_id"]), inline=True)

        cid = cfg["active_campaign_id"]
        if cid:
            from .. import db
            campaign = db.fetchone("SELECT name FROM campaigns WHERE id=?", (cid,))
            cname = campaign["name"] if campaign else f"ID {cid} (not found)"
        else:
            cname = "_none selected_"
        embed.add_field(name="Active Campaign", value=cname, inline=False)

        you_are = "**DM**" if is_dm(interaction) else "Player"
        embed.set_footer(text=f"You are recognized as: {you_are}")
        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(SetupCog(bot))
