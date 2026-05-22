"""DM-only permission guard — checks both Discord role AND channel."""
from __future__ import annotations
import discord
from discord import app_commands
from . import config


def is_dm(interaction: discord.Interaction) -> bool:
    """Return True if the invoking user is the DM.

    A user is considered the DM when either:
      1. They have the configured DM role, OR
      2. They are posting in the configured DM-only channel.
    Both can be set independently; either alone is sufficient.
    """
    if interaction.guild is None:
        return False

    gid = interaction.guild.id
    dm_role_id = config.get_key(gid, "dm_role_id")
    dm_channel_id = config.get_key(gid, "dm_channel_id")

    if dm_role_id:
        member = interaction.user
        if isinstance(member, discord.Member):
            if any(r.id == int(dm_role_id) for r in member.roles):
                return True

    if dm_channel_id:
        if interaction.channel_id == int(dm_channel_id):
            return True

    return False


def dm_only():
    """Decorator: block the command unless the invoker is the DM."""
    async def predicate(interaction: discord.Interaction) -> bool:
        if not is_dm(interaction):
            await interaction.response.send_message(
                "This command is restricted to the Dungeon Master.", ephemeral=True
            )
            return False
        return True
    return app_commands.check(predicate)
