# Cdawg Arcade Vision

Cdawg Arcade is a collection of short, readable, phone-first arcade games built for Discord servers. A player gets one attempt, spectators can watch and cheer, and the final score can become a social moment through leaderboards and challenges.

## Product Principles

- One run should be understandable in a few seconds.
- A failed run should feel quick enough to retry.
- Spectators should add energy without blocking or changing the core game loop.
- Every game should produce a simple score that can be compared fairly.
- Games should be small enough to load comfortably inside Discord Activity constraints.

## First Game: Cdawg Balance

Cdawg Balance tests timing and correction. The player holds left or right to counter a rocking platform. The game gets harder as disturbances grow and recovery becomes less forgiving.

## Future Game Slots

- Bounce: keep a character bouncing through moving lanes.
- Reflex: tap the correct signal before time expires.
- Memory: repeat short Cdawg-themed patterns.
- Dodge: avoid incoming hazards for as long as possible.

## Architecture Direction

The application shell should stay independent from individual games. Each game should register metadata, own its Phaser scene and logic, and report score results through a shared contract. Services for persistence, spectators, audio, and future Discord integration should remain replaceable.
