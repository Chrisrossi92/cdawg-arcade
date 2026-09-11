# CDAWG Mascot — 3D Production Specification V1

Status: Concept direction approved; production model not yet created  
Mascot direction: B1 chunky bulldog  
Primary use: Cdawg Arcade and reusable appearances across future CDAWG games

## 1. Canonical identity

The mascot is a compact, broad-headed bulldog with a sturdy quadruped build. His personality is friendly, confident, competitive, slightly mischievous, and comically panicked when control is lost.

Permanent features:

- Charcoal-black short fur
- Warm cream eyebrows, muzzle, chest blaze, and toes
- Broad square head and short folded ears
- Large brown eyes with highly readable brows and eyelids
- Short legs, oversized paws, compact torso, and small curled tail
- Burnt-orange leather collar with cream stitching
- Circular cream-and-muted-brass tag bearing a simple capital `C`

The collar and tag are part of his permanent silhouette. Jerseys, jackets, hats, bandanas, harnesses, and other clothing are optional game-specific costumes, not part of the base design.

## 2. Shape language

- Head: approximately 40% of total standing height; broad rather than tall
- Body: barrel-shaped and weighty, with a low center of gravity
- Legs: short and thick with clearly separated paws
- Muzzle: rounded and prominent, never flat or realistically brachycephalic
- Eyes and brows: oversized enough to read at small gameplay scale
- Silhouette: recognizable from the head, chest, collar/tag, and curled tail
- Motion: heavy and grounded at rest; springy and exaggerated during reactions

Avoid realistic bulldog breathing distress, drooping facial anatomy, sharp claws, aggressive musculature, or proportions that make him intimidating.

## 3. Color and material targets

Exact production values should be sampled and finalized from the approved concept art during texture creation.

| Element | Target appearance |
| --- | --- |
| Main fur | Near-black charcoal with warm highlights; never featureless pure black |
| Cream fur | Warm ivory/cream with enough contrast to read against the dark coat |
| Collar | Burnt CDAWG orange, lightly textured leather, cream stitching |
| Tag face | Warm cream enamel with a charcoal `C` |
| Tag rim/hardware | Muted brass; readable without mirror-like reflections |
| Eyes | Deep warm brown with strong catchlights |
| Nose/paw pads | Soft charcoal-black with restrained roughness variation |

Use a stylized PBR treatment. Fur should be communicated primarily through sculpted form, texture, roughness, and carefully controlled normal detail—not expensive strand simulation.

## 4. Modeling deliverables

- One clean high-resolution sculpt for reference and baking
- One game-ready retopologized model
- Clean, symmetrical neutral pose suitable for rigging
- Separate but properly parented collar, tag, eyes, teeth, tongue, and optional costume attachment points
- UVs with minimal distortion around face, chest marking, paws, collar, and tag
- Shape keys/blendshapes authored on the final production topology
- No hidden duplicate geometry, nonmanifold surfaces, unapplied negative scale, or unnecessary internal faces

Recommended real-time target:

| Resource | Preferred target | Hard ceiling |
| --- | ---: | ---: |
| Character triangles | 22,000–30,000 | 40,000 |
| Materials | 2–3 | 4 |
| Texture sets | 1 primary set plus eyes/tag if needed | 3 sets |
| Main textures | 2048×2048 | 2048×2048 |
| Draw calls | 2–3 | 4 |
| Game-ready `.glb` | Under 5 MB preferred | 8 MB |

Create at least one lower-detail version or validated decimation path for thumbnails, crowded scenes, and future multi-character use.

## 5. Rig specification

Use a conventional quadruped rig with deformation quality prioritized at the shoulders, neck, cheeks, and short legs.

Required controls:

- Root, global scale, pelvis, spine, chest, neck, and head
- IK/FK-capable front and rear legs with planted-paw controls
- Individual paw roll and toe spread where useful
- Curled-tail chain with simple secondary motion
- Independent folded-ear controls
- Jaw and tongue controls
- Eye aim, independent pupils, eyelids, and blink
- Brow controls capable of asymmetrical posing
- Cheek, muzzle, lip-corner, upper-lip, lower-lip, and nose-scrunch controls
- Collar/tag follow controls plus optional lightweight secondary animation
- Attachment points at head, neck, back, chest, and each front paw for future game props/costumes

The rig must support brief celebratory rearing but should remain fundamentally quadrupedal. Avoid humanlike shoulders, hands, or permanent bipedal posture.

## 6. Facial expression set

The facial rig must reproduce these approved expression families:

1. Default — friendly confidence and slight half-smile
2. Delighted — open victory grin and bright eyes
3. Determined — lowered brows and focused eyes without aggression
4. Worried — side glance and raised inner brows
5. Panic — wide eyes, lifted brows, and comic open mouth
6. Frustrated — family-friendly irritation and compressed muzzle
7. Proud — raised chin, relaxed eyes, satisfied smile
8. Dizzy — unfocused eyes and crooked mouth without injury
9. Mischief — asymmetrical brow and knowing side-smirk

Core facial shapes should be composable rather than locked to nine one-off poses. Left/right asymmetry is required for brows, eyelids, cheeks, and lip corners.

## 7. Animation package

Minimum reusable animation set:

| Animation | Loop | Purpose |
| --- | --- | --- |
| `idle_default` | Yes | Primary resting animation |
| `idle_mischief` | Yes | Alternate branded idle |
| `ready` | No/hold | Transition into gameplay |
| `lean_left` | Holdable | Cdawg Balance control response |
| `lean_right` | Holdable | Cdawg Balance control response |
| `wobble_left` | Blend/loop | Escalating danger response |
| `wobble_right` | Blend/loop | Escalating danger response |
| `fall` | No | Harmless loss reaction |
| `recover` | No | Return from stumble where gameplay permits |
| `victory_small` | No | Routine good result |
| `victory_big` | No | Personal best or major achievement |
| `defeat` | No | Disappointed but lovable result |
| `host_wave` | No | Welcome/menu presentation |
| `host_point` | No/hold | Draw attention to UI or game selection |
| `blink` | Additive | Natural facial life |
| `look_direction` | Additive | Gaze tracking and reaction staging |

Use restrained secondary motion in ears, cheeks, tail, collar, and tag. Gameplay animations must remain readable when the mascot occupies a relatively small portion of the screen.

## 8. Cdawg Balance behavior

For the first game, use a blend-driven balance pose rather than only discrete left/right animations:

- A signed normalized balance value from `-1` to `1` drives the main lean pose
- Increasing instability adds paw scrambling, ear lag, eye direction, and tag swing
- The face progresses from determined to worried to panic as failure approaches
- A loss triggers the authored fall animation only after the deterministic gameplay result is fixed
- Cosmetic animation must never influence physics, timing, score validation, or deterministic replay

The mascot may be rendered live in 3D later, but the first safe integration may use pre-rendered sprite sequences generated from this same model and rig. That keeps the current lightweight Phaser game and official-score simulation isolated from presentation changes.

## 9. Export package

Required source and runtime outputs:

- Master `.blend` file with clean collections and documented scale
- Game-ready binary `.glb` with embedded or adjacent textures
- Original texture sources plus exported PNG/WebP maps
- Animation clips named consistently and trimmed to exact frame ranges
- Neutral-pose and expression preview renders
- Turntable render for review
- Optional sprite atlas exports for Cdawg Balance
- README containing software version, export settings, scale, forward axis, licensing/provenance, and known limitations

Recommended interchange settings:

- Units: meters
- Character standing height: approximately `0.75 m` at the top of the head
- Up axis: `+Y` in glTF output
- Forward direction: document explicitly and verify in the target viewer
- Origin: centered between planted paws at ground level
- Transforms: applied before final export

## 10. Quality gates

The asset is not accepted until:

- Front, side, back, and three-quarter views match the approved concept closely
- Fur markings remain stable across poses and LODs
- All nine expression families are reproducible without broken muzzle volume
- Paws remain planted during idle, ready, and balance holds
- Collar and tag do not clip through the neck or chest in required animations
- The silhouette reads clearly at Discord Activity gameplay size
- The GLB loads without warnings in at least two independent viewers
- Animation names, durations, looping flags, and root-motion behavior are documented
- Texture and model budgets meet the targets above
- Desktop and narrow Activity layouts maintain acceptable frame time
- Gameplay simulation remains deterministic and visually decoupled from animation timing

## 11. Approved versus still open

Approved:

- B1 chunky bulldog direction
- Black-and-cream markings
- Orange collar and circular `C` tag as permanent identifiers
- Expression language
- Heavy, springy, quadrupedal movement language

Still open:

- Final sampled color values
- Exact topology and deformation approach
- Live 3D versus pre-rendered sprites for the first Arcade integration
- Production artist/tooling route
- Final animation frame rates and clip durations
- Mascot name, if distinct from “CDAWG”

## 12. Recommended next checkpoint

Create a small production feasibility prototype: one neutral game-ready model, basic rig, `idle_default`, blendable left/right lean, and one panic face. Test it outside production first. Do not replace the live Cdawg Balance character until visual quality, bundle impact, rendering performance, and deterministic-gameplay isolation all pass.
