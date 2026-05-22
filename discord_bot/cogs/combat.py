"""Combat tracker cog — live embed in player channel, DM controls."""
from __future__ import annotations
import json
import asyncio
from typing import Optional
import discord
from discord import app_commands
from discord.ext import commands
from .. import config, db
from ..guard import dm_only, is_dm


# One tracker per guild, kept in memory while active
_active: dict[int, "_Tracker"] = {}


class _Tracker:
    """In-memory state for a running encounter in one guild."""

    def __init__(self, encounter_id: int, guild_id: int, player_message: discord.Message):
        self.encounter_id = encounter_id
        self.guild_id = guild_id
        self.player_message = player_message  # The embed DMs update live

    def combatants(self) -> list[dict]:
        return db.fetchall(
            "SELECT * FROM combatants WHERE encounter_id=? AND is_active=1 ORDER BY initiative DESC",
            (self.encounter_id,),
        )

    def encounter(self) -> dict:
        return db.fetchone("SELECT * FROM encounters WHERE id=?", (self.encounter_id,))

    def current_combatant(self) -> dict | None:
        enc = self.encounter()
        if not enc:
            return None
        combatants = self.combatants()
        if not combatants:
            return None
        idx = enc["current_turn"] % len(combatants)
        return combatants[idx]

    def build_embed(self) -> discord.Embed:
        enc = self.encounter()
        combatants = self.combatants()
        current = self.current_combatant()

        embed = discord.Embed(
            title=f"⚔️  {enc['name']}",
            colour=0xCC2222,
        )
        embed.add_field(
            name="Round",
            value=str(enc["round"]),
            inline=True,
        )
        embed.add_field(
            name="Status",
            value=enc["status"].title(),
            inline=True,
        )

        lines = []
        for i, c in enumerate(combatants):
            conditions = json.loads(c.get("conditions") or "[]")
            cond_str = f" *[{', '.join(conditions)}]*" if conditions else ""

            hp = c["hp"]
            max_hp = c["max_hp"]
            bar_len = 10
            filled = round((hp / max_hp) * bar_len) if max_hp else 0
            bar = "█" * filled + "░" * (bar_len - filled)

            is_current = current and c["id"] == current["id"]
            arrow = "▶ " if is_current else "   "

            name_str = f"**{c['name']}**" if is_current else c["name"]
            lines.append(
                f"{arrow}{name_str} — HP {hp}/{max_hp} `{bar}` AC {c['ac']}{cond_str}"
            )
            if c.get("notes"):
                lines.append(f"      *{c['notes']}*")

        embed.add_field(
            name="Initiative Order",
            value="\n".join(lines) or "_No combatants_",
            inline=False,
        )

        if current:
            embed.set_footer(text=f"Current turn: {current['name']} · Initiative {current['initiative']}")

        return embed


def _require_tracker(guild_id: int) -> "_Tracker | None":
    return _active.get(guild_id)


class CombatCog(commands.Cog, name="Combat"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    combat_group = app_commands.Group(name="combat", description="Combat tracker")

    async def _refresh(self, tracker: _Tracker):
        """Edit the player-facing message with the latest state."""
        try:
            await tracker.player_message.edit(embed=tracker.build_embed())
        except discord.NotFound:
            _active.pop(tracker.guild_id, None)

    @combat_group.command(name="start", description="Start combat for an encounter")
    @dm_only()
    async def combat_start(self, interaction: discord.Interaction, encounter_id: int):
        gid = interaction.guild.id
        if gid in _active:
            await interaction.response.send_message(
                "Combat is already running. Use `/combat end` first.", ephemeral=True
            )
            return

        enc = db.fetchone("SELECT * FROM encounters WHERE id=?", (encounter_id,))
        if not enc:
            await interaction.response.send_message(f"No encounter with ID {encounter_id}.", ephemeral=True)
            return

        db.execute(
            "UPDATE encounters SET status='active', round=1, current_turn=0 WHERE id=?",
            (encounter_id,),
        )

        player_channel_id = config.get_key(gid, "player_channel_id")
        target = interaction.guild.get_channel(int(player_channel_id)) if player_channel_id else interaction.channel

        await interaction.response.defer(ephemeral=True)

        # Post the live tracker embed to the player channel
        msg = await target.send(embed=discord.Embed(title="Loading combat...", colour=0xCC2222))
        tracker = _Tracker(encounter_id, gid, msg)
        _active[gid] = tracker
        await self._refresh(tracker)

        await interaction.followup.send(
            f"Combat started! Tracker posted in {target.mention}.", ephemeral=True
        )

    @combat_group.command(name="next", description="Advance to the next turn")
    @dm_only()
    async def combat_next(self, interaction: discord.Interaction):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        enc = tracker.encounter()
        combatants = tracker.combatants()
        next_turn = enc["current_turn"] + 1
        next_round = enc["round"]
        if next_turn >= len(combatants):
            next_turn = 0
            next_round += 1

        db.execute(
            "UPDATE encounters SET current_turn=?, round=? WHERE id=?",
            (next_turn, next_round, tracker.encounter_id),
        )
        await self._refresh(tracker)
        current = tracker.current_combatant()
        name = current["name"] if current else "?"
        await interaction.response.send_message(
            f"Turn advanced → **{name}**", ephemeral=True
        )

    @combat_group.command(name="hp", description="Adjust HP for a combatant (+heal, -damage)")
    @dm_only()
    async def combat_hp(self, interaction: discord.Interaction, name: str, delta: int):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        row = db.fetchone(
            "SELECT id, hp, max_hp, name FROM combatants WHERE encounter_id=? AND name LIKE ? AND is_active=1",
            (tracker.encounter_id, f"%{name}%"),
        )
        if not row:
            await interaction.response.send_message(f"No combatant matching '{name}'.", ephemeral=True)
            return

        new_hp = max(0, min(row["hp"] + delta, row["max_hp"]))
        db.execute("UPDATE combatants SET hp=? WHERE id=?", (new_hp, row["id"]))
        await self._refresh(tracker)
        direction = f"+{delta}" if delta >= 0 else str(delta)
        await interaction.response.send_message(
            f"**{row['name']}** HP {row['hp']} → {new_hp} ({direction})", ephemeral=True
        )

    @combat_group.command(name="add", description="Add a combatant to the current encounter")
    @dm_only()
    async def combat_add(
        self,
        interaction: discord.Interaction,
        name: str,
        hp: int,
        ac: int = 10,
        initiative: int = 0,
        combatant_type: str = "monster",
    ):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        db.execute(
            """INSERT INTO combatants
               (encounter_id, name, combatant_type, initiative, hp, max_hp, ac, conditions, notes)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (tracker.encounter_id, name, combatant_type, initiative, hp, hp, ac, "[]", ""),
        )
        await self._refresh(tracker)
        await interaction.response.send_message(
            f"Added **{name}** (HP {hp}, AC {ac}, initiative {initiative}).", ephemeral=True
        )

    @combat_group.command(name="condition", description="Set or clear a condition on a combatant")
    @dm_only()
    async def combat_condition(
        self,
        interaction: discord.Interaction,
        name: str,
        condition: str,
        remove: bool = False,
    ):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        row = db.fetchone(
            "SELECT id, name, conditions FROM combatants WHERE encounter_id=? AND name LIKE ? AND is_active=1",
            (tracker.encounter_id, f"%{name}%"),
        )
        if not row:
            await interaction.response.send_message(f"No combatant matching '{name}'.", ephemeral=True)
            return

        conditions = json.loads(row.get("conditions") or "[]")
        if remove:
            conditions = [c for c in conditions if c.lower() != condition.lower()]
            verb = "Removed"
        else:
            if condition not in conditions:
                conditions.append(condition)
            verb = "Applied"

        db.execute("UPDATE combatants SET conditions=? WHERE id=?", (json.dumps(conditions), row["id"]))
        await self._refresh(tracker)
        await interaction.response.send_message(
            f"{verb} **{condition}** on {row['name']}.", ephemeral=True
        )

    @combat_group.command(name="notes", description="Set notes for a combatant")
    @dm_only()
    async def combat_notes(self, interaction: discord.Interaction, name: str, notes: str):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        row = db.fetchone(
            "SELECT id, name FROM combatants WHERE encounter_id=? AND name LIKE ? AND is_active=1",
            (tracker.encounter_id, f"%{name}%"),
        )
        if not row:
            await interaction.response.send_message(f"No combatant matching '{name}'.", ephemeral=True)
            return

        db.execute("UPDATE combatants SET notes=? WHERE id=?", (notes, row["id"]))
        await self._refresh(tracker)
        await interaction.response.send_message(f"Notes updated for **{row['name']}**.", ephemeral=True)

    @combat_group.command(name="remove", description="Remove a combatant (mark as defeated)")
    @dm_only()
    async def combat_remove(self, interaction: discord.Interaction, name: str):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        row = db.fetchone(
            "SELECT id, name FROM combatants WHERE encounter_id=? AND name LIKE ? AND is_active=1",
            (tracker.encounter_id, f"%{name}%"),
        )
        if not row:
            await interaction.response.send_message(f"No combatant matching '{name}'.", ephemeral=True)
            return

        db.execute("UPDATE combatants SET is_active=0, hp=0 WHERE id=?", (row["id"],))
        await self._refresh(tracker)
        await interaction.response.send_message(f"**{row['name']}** removed from combat.", ephemeral=True)

    @combat_group.command(name="status", description="Show the current tracker state (DM only)")
    @dm_only()
    async def combat_status(self, interaction: discord.Interaction):
        tracker = _require_tracker(interaction.guild.id)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return
        await interaction.response.send_message(embed=tracker.build_embed(), ephemeral=True)

    @combat_group.command(name="end", description="End the current combat encounter")
    @dm_only()
    async def combat_end(self, interaction: discord.Interaction):
        gid = interaction.guild.id
        tracker = _require_tracker(gid)
        if not tracker:
            await interaction.response.send_message("No active combat.", ephemeral=True)
            return

        enc = tracker.encounter()
        db.execute("UPDATE encounters SET status='completed' WHERE id=?", (tracker.encounter_id,))

        final_embed = tracker.build_embed()
        final_embed.title = f"✅  {enc['name']} — Completed"
        final_embed.colour = 0x44AA44
        await tracker.player_message.edit(embed=final_embed)

        _active.pop(gid, None)
        await interaction.response.send_message("Combat ended.", ephemeral=True)

    # ── Session recaps ────────────────────────────────────────────────────────

    session_group = app_commands.Group(name="session", description="Session notes")

    @session_group.command(name="log", description="Log a session recap and post it to the player channel")
    @dm_only()
    async def session_log(self, interaction: discord.Interaction, title: str, notes: str):
        cid = config.get_key(interaction.guild.id, "active_campaign_id")
        lore_id = db.execute(
            "INSERT INTO lore (campaign_id, title, content, lore_type) VALUES (?,?,?,?)",
            (cid, title, notes, "session"),
        )

        player_channel_id = config.get_key(interaction.guild.id, "player_channel_id")
        target = (
            interaction.guild.get_channel(int(player_channel_id))
            if player_channel_id
            else interaction.channel
        )

        embed = discord.Embed(
            title=f"Session Recap — {title}",
            description=notes[:4096],
            colour=0x7060A0,
        )
        embed.set_footer(text=f"Session log ID {lore_id}")
        await target.send(embed=embed)
        await interaction.response.send_message(
            f"Session recap posted to {target.mention}.", ephemeral=True
        )

    @session_group.command(name="history", description="Show recent session recaps")
    async def session_history(self, interaction: discord.Interaction, limit: int = 5):
        cid = config.get_key(interaction.guild.id, "active_campaign_id")
        if not cid:
            await interaction.response.send_message("No active campaign.", ephemeral=True)
            return
        rows = db.fetchall(
            "SELECT id, title, content, created_at FROM lore WHERE campaign_id=? AND lore_type='session' ORDER BY id DESC LIMIT ?",
            (cid, min(limit, 10)),
        )
        if not rows:
            await interaction.response.send_message("No session logs yet.", ephemeral=True)
            return
        embed = discord.Embed(title="Session History", colour=0x7060A0)
        for r in rows:
            preview = (r["content"] or "")[:200]
            if len(r["content"] or "") > 200:
                preview += "…"
            embed.add_field(
                name=f"[{r['id']}] {r['title']} · {r['created_at'][:10]}",
                value=preview or "_no notes_",
                inline=False,
            )
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(CombatCog(bot))
