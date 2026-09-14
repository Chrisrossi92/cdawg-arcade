# Approved artwork upload plan — v1

Status: artwork creatively approved 2026-09-14; upload/save actions NOT authorized. No Portal access or changes occurred during this preparation.

Use only the existing CDAWG Arcade application associated with accepted Release B. During the later authorized session, compare its public application ID with the existing approved release configuration; do not use dummy fixture IDs or create a new application. Application name, description, participants, URLs, mappings, credentials, permissions and discovery settings are outside this upload plan.

## Exact files and destinations

Package: `assets/brand/soft-launch/v001/CDAWG-Arcade-Discord-Upload-v001/`. All four files are PNG. Match the full hash against manifest.json before upload.

| Portal destination | File | Dimensions | Bytes | SHA-256 |
|---|---|---|---:|---|
| General Information → App Icon | 01-application-icon-1024-v001.png | 1024×1024 | 48141 | `fb491c3c6b4918971dc262a02625e39f304d317d9726cb37a65616bcfca1a54b` |
| Bot → Avatar (same identity, separately configured) | 02-bot-avatar-1024-v001.png | 1024×1024 | 48141 | `fb491c3c6b4918971dc262a02625e39f304d317d9726cb37a65616bcfca1a54b` |
| Activities → Art Assets → Cover Art | 03-activity-cover-1920x1080-v001.png | 1920×1080 | 387761 | `f7dc170667d0fd2671fde2a211986b75fd631c1656532e12dfd155ab8106b200` |
| Activities → Art Assets → Embedded Background | 04-embedded-background-1920x1080-v001.png | 1920×1080 | 193543 | `10f110f1ddf3b57f7b3beb2a0144e46a1ae12807656fd0373ee52e5b97e547b7` |

Portal labels may vary slightly. Discord documents application metadata under Settings → General Information, bot identity separately under Settings → Bot, and Activity artwork under Activities → Art Assets. The cover supports 16:9 and 13:11 display; the background is 16:9 with its center clear. Both exports are at least 1024px wide. Source: [Discord assets and metadata](https://docs.discord.com/developers/activities/development-guides/assets-and-metadata), checked 2026-09-14. No authenticated Portal inspection was performed.

## One consolidated session: five steps

1. Select the existing application and match its ID. Record current artwork (or empty/default state) and preserve recoverable originals in the local rollback bundle before replacing them. If the previous artwork cannot be recovered, stop the upload portion and explain that limitation before saving replacements. Do not expose credentials while doing this.
2. In General Information, upload **01-application-icon-1024-v001.png** to App Icon and save only this field.
3. In Bot, upload **02-bot-avatar-1024-v001.png** as the avatar and save only this field. Do not change the bot name or reset a token.
4. In Activities → Art Assets, upload **03-activity-cover-1920x1080-v001.png** to Cover Art and **04-embedded-background-1920x1080-v001.png** to Embedded Background; inspect crop/center previews and save only these artwork fields.
5. Reopen the three sections and confirm persistence, no unrelated pending edits, and readable crop previews. Record uploaded filenames/hashes and saved state. Allow for Discord caching; use the one later native acceptance session to check their actual presentation.

Target hands-on time: under five minutes once authenticated and originals are preserved; stop for missing access rather than request new scopes or credentials. Codex can perform these steps after publication authorization if the existing authorized session and UI tooling support upload. Chris is needed only for unavailable sign-in/2FA or an upload control the available automation cannot operate; consolidate all four assets into this same session.

Do not upload the seven size specimens, editable SVGs, favicon, or social/share PNG. The favicon ships with the reviewed application deployment. Social artwork is optional future publishing material. Shelf video remains a storyboard only; no video, new URL, metadata rewrite, discovery expansion or Portal configuration change is proposed.

## Rollback boundary

The accepted application deployment rollback target remains dep-dak230uq1p3s73cb18l0. Render rollback does not undo Discord-hosted artwork or messages. Artwork restoration uses the saved pre-upload originals/default-state record. Any message edits/unpinning/deletion require their own authorized scope; do not infer them from application rollback permission.
