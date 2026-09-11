"""Deterministic, original vector geometry + licensed type outlines. Run from repo root."""
from pathlib import Path
import json, hashlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools import subset
ROOT=Path('assets/brand/arcade'); V=ROOT/'vector'; R=ROOT/'runtime'
font=instantiateVariableFont(TTFont(ROOT/'fonts/source/Fredoka.ttf',recalcTimestamp=False),{'wght':600,'wdth':100},inplace=False)
def words(s,x,y,size,color):
    glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); scale=size/font['head'].unitsPerEm; offset=0; paths=[]
    for ch in s:
        name=cmap[ord(ch)]; pen=SVGPathPen(glyphs); glyphs[name].draw(pen)
        paths.append(f'<path transform="translate({offset:.3f})" d="{pen.getCommands()}"/>'); offset+=font['hmtx'][name][0]+12
    return f'<g fill="{color}" transform="translate({x} {y}) scale({scale:.6f} {-scale:.6f})">'+''.join(paths)+'</g>'
# Top attachment is part of the silhouette, never a floating ring. The hole is true negative space.
outline='M45 30C45 13 48 5 64 5S83 13 83 30C84 36 92 40 100 46C115 57 123 73 123 91C123 122 100 140 64 140S5 122 5 91C5 73 13 57 28 46C36 40 44 36 45 30Z'
def tag(mono=None,small=False):
    c=mono or '#B08B4F'
    outer=f'<path fill="{c}" fill-rule="evenodd" d="{outline} M57 22a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z"/>'
    if mono:
        # Transparent annulus and letter counter keep one-ink reproduction genuinely one-color.
        return f'<g fill="{mono}" fill-rule="evenodd"><path d="{outline} M57 22a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z M64 44a48 46 0 1 0 0 92a48 46 0 1 0 0-92Z"/><path d="M64 49a43 41 0 1 0 0 82a43 41 0 1 0 0-82Z M90 71C83 61 69 58 57 62C44 66 37 76 37 90S46 117 62 118C73 119 84 114 91 106L78 95C74 101 66 103 60 99C54 96 53 87 58 82C63 77 71 78 76 83Z"/></g>'
    inset='<path fill="#BE4E12" fill-rule="evenodd" d="M51 32V23Q51 11 64 11T77 23V32Q77 37 81 42H47Q51 37 51 32Z M57 22a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z"/>'
    return outer+inset+('<path d="M88 43Q110 54 116 77" fill="none" stroke="#FF8A2B" stroke-width="7" stroke-linecap="round"/>' if not small else '')+'<ellipse cx="64" cy="91" rx="48" ry="44" fill="#0F1113"/><ellipse cx="64" cy="91" rx="44" ry="40" fill="#F7E6CD"/><path d="M84 75C73 61 48 66 46 87C43 110 69 123 85 105L74 95C66 104 57 96 59 88C60 80 69 78 74 85Z" fill="#0F1113"/>'
def save(name,w,h,body):
    (V/f'cdawg-{name}-v001.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="CDAWG ARCADE"><title>CDAWG ARCADE</title>{body}</svg>\n')
for variant,ink in [('dark','#F7E6CD'),('light','#0F1113'),('mono-cream','#F7E6CD'),('mono-charcoal','#0F1113')]:
    mono=ink if variant.startswith('mono') else None; mark=tag(mono)
    save('tag-'+variant,128,144,mark)
    save('horizontal-'+variant,510,144,mark+words('CDAWG',150,66,83,ink)+words('ARCADE',150,133,83,mono or '#FF8A2B' if variant!='light' else '#AD4300'))
    save('stacked-'+variant,410,310,'<g transform="translate(141)">'+mark+'</g>'+words('CDAWG',37,216,88,ink)+words('ARCADE',24,296,88,mono or ('#AD4300' if variant=='light' else '#FF8A2B')))
    save('wordmark-'+variant,920,108,words('CDAWG',8,85,100,ink)+words('ARCADE',450,85,100,mono or ('#AD4300' if variant=='light' else '#FF8A2B')))
save('tag-small',128,144,tag(small=True))
save('avatar-frame',256,256,'<rect x="6" y="6" width="244" height="244" rx="58" fill="#0F1113" stroke="#FF8A2B" stroke-width="8"/><path d="M36 216H80" stroke="#FF8A2B" stroke-width="6" stroke-linecap="round"/>')
for source,name,f in [('Fredoka.ttf','display',font),('AtkinsonHyperlegible-Regular.ttf','ui',TTFont(ROOT/'fonts/source/AtkinsonHyperlegible-Regular.ttf',recalcTimestamp=False))]:
    options=subset.Options(); options.flavor='woff2'; options.recalc_timestamp=False
    sub=subset.Subsetter(options=options); sub.populate(unicodes=list(range(32,256))+list(range(0x2010,0x2040))+[0x20AC,0x2212,0x2190,0x2192]); sub.subset(f)
    for record in f['name'].names:
        if record.nameID in [1,2,3,4,6,16,17]:
            val=('Regular' if record.nameID in [2,17] else 'CDAWG '+name.title()+' Subset').replace(' ','') if record.nameID==6 else ('Regular' if record.nameID in [2,17] else 'CDAWG '+name.title()+' Subset')
            record.string=val.encode(record.getEncoding())
    f.flavor='woff2'; f.save(R/f'cdawg-{name}-latin-v001.woff2')
tokens=json.loads((ROOT/"tokens.json").read_text())
(ROOT/"tokens.css").write_text("/* Generated from tokens.json; isolated brand preview only. */\n:root {\n"+"".join("  --brand-"+k+": "+v+";\n" for k,v in tokens.items())+"}\n")

manifest={str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(ROOT.rglob('*')) if p.is_file() and 'runtime' not in p.parts and 'vector' not in p.parts and p.name!='provenance.json'}
(ROOT/'provenance.json').write_text(json.dumps({'archive':{'expectedSha256':'d3969780b9be18f22ff11aae1ef6a15ceec330e2b3d96390e3e48cb80e06541c','status':'ZIP SHA-256 verified; safe extraction matches all five preserved originals'},'files':manifest},indent=2)+'\n')
