"""Discord bot entry point — loads all cogs and syncs slash commands."""
from __future__ import annotations
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import discord
from discord.ext import commands

load_dotenv(Path(__file__).parent / ".env")

TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.")

# Init the standalone DB if needed (no-op when USE_SHARED_DB=1)
from . import db as _db
_db.init()

COGS = [
    "discord_bot.cogs.setup",
    "discord_bot.cogs.campaign",
    "discord_bot.cogs.generate",
    "discord_bot.cogs.maps",
    "discord_bot.cogs.combat",
]

intents = discord.Intents.default()
intents.message_content = False  # Not needed — all interactions are slash commands


class DnDBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        for cog in COGS:
            await self.load_extension(cog)
        await self.tree.sync()
        print(f"Synced slash commands for {len(COGS)} cogs.")

    async def on_ready(self):
        print(f"Logged in as {self.user} (ID: {self.user.id})")
        print(f"Connected to {len(self.guilds)} guild(s)")
        db_mode = "shared (FastAPI)" if os.getenv("USE_SHARED_DB") == "1" else "standalone"
        print(f"Database mode: {db_mode}")


def main():
    bot = DnDBot()
    bot.run(TOKEN)


if __name__ == "__main__":
    main()
