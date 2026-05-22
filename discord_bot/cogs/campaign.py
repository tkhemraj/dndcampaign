"""Campaign management cog — create, select, info."""
from __future__ import annotations
import discord
from discord import app_commands
from discord.ext import commands
from .. import config, db
from ..guard import dm_only


class CampaignCog(commands.Cog, name="Campaign"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    campaign_group = app_commands.Group(name="campaign", description="Manage campaigns")

    @campaign_group.command(name="new", description="Create a new campaign")
    @dm_only()
    async def campaign_new(
        self,
        interaction: discord.Interaction,
        name: str,
        setting: str = "Wildemount",
        description: str = "",
    ):
        cid = db.execute(
            "INSERT INTO campaigns (name, setting, description) VALUES (?,?,?)",
            (name, setting, description),
        )
        config.set_key(interaction.guild.id, "active_campaign_id", cid)
        embed = discord.Embed(
            title="Campaign Created",
            description=f"**{name}** is now the active campaign.",
            colour=0xD4A040,
        )
        embed.add_field(name="Setting", value=setting, inline=True)
        embed.add_field(name="ID", value=str(cid), inline=True)
        if description:
            embed.add_field(name="Description", value=description, inline=False)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @campaign_group.command(name="select", description="Switch the active campaign by ID")
    @dm_only()
    async def campaign_select(self, interaction: discord.Interaction, campaign_id: int):
        row = db.fetchone("SELECT id, name FROM campaigns WHERE id=?", (campaign_id,))
        if not row:
            await interaction.response.send_message("No campaign with that ID.", ephemeral=True)
            return
        config.set_key(interaction.guild.id, "active_campaign_id", campaign_id)
        await interaction.response.send_message(
            f"Active campaign set to **{row['name']}** (ID {campaign_id}).", ephemeral=True
        )

    @campaign_group.command(name="list", description="List all campaigns")
    @dm_only()
    async def campaign_list(self, interaction: discord.Interaction):
        rows = db.fetchall("SELECT id, name, setting, created_at FROM campaigns ORDER BY id DESC")
        if not rows:
            await interaction.response.send_message("No campaigns yet. Use `/campaign new` to create one.", ephemeral=True)
            return
        active_id = config.get_key(interaction.guild.id, "active_campaign_id")
        embed = discord.Embed(title="Campaigns", colour=0xD4A040)
        for r in rows[:10]:
            marker = " ★" if r["id"] == active_id else ""
            embed.add_field(
                name=f"[{r['id']}] {r['name']}{marker}",
                value=f"{r['setting']} · {r['created_at'][:10]}",
                inline=False,
            )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @campaign_group.command(name="info", description="Show details about the active campaign")
    async def campaign_info(self, interaction: discord.Interaction):
        cid = config.get_key(interaction.guild.id, "active_campaign_id")
        if not cid:
            await interaction.response.send_message("No active campaign. Ask your DM to set one up.", ephemeral=True)
            return
        row = db.fetchone("SELECT * FROM campaigns WHERE id=?", (cid,))
        if not row:
            await interaction.response.send_message("Active campaign not found in database.", ephemeral=True)
            return

        npc_count = db.fetchone("SELECT COUNT(*) as c FROM npcs WHERE campaign_id=?", (cid,))["c"]
        quest_count = db.fetchone("SELECT COUNT(*) as c FROM quests WHERE campaign_id=? AND status='active'", (cid,))["c"]
        enc_count = db.fetchone("SELECT COUNT(*) as c FROM encounters WHERE campaign_id=?", (cid,))["c"]

        embed = discord.Embed(title=row["name"], colour=0xD4A040)
        embed.add_field(name="Setting", value=row["setting"], inline=True)
        embed.add_field(name="NPCs", value=str(npc_count), inline=True)
        embed.add_field(name="Active Quests", value=str(quest_count), inline=True)
        embed.add_field(name="Encounters", value=str(enc_count), inline=True)
        if row.get("description"):
            embed.add_field(name="Description", value=row["description"][:1024], inline=False)
        embed.set_footer(text=f"Campaign ID: {cid} · Created: {row['created_at'][:10]}")
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(CampaignCog(bot))
