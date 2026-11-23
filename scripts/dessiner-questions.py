# Dessine les images des questions en images du Savoir-vivre (nœuds, cols, tissus, chapeaux, pochettes, revers).
# Usage : python3 scripts/dessiner-questions.py (depuis la racine du dépôt). Réécrit les SVG de public/questions/.
import os
INK='#3b2f25'; SHIRT='#fbf8f1'; SHADE='#e8e0cf'
W='stroke="%s" stroke-width="2.5" stroke-linejoin="round"'%INK
def svg(body,titre,vb="0 0 200 200"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img"><title>{titre}</title>{body}</svg>'
# ---------- Cols ----------
C='public/questions/cols/'
def chemise(): return (f'<path d="M14 200 L22 62 Q56 34 100 36 Q144 34 178 62 L186 200 Z" fill="{SHIRT}" {W}/>'
    f'<path d="M92 52 L92 200 M108 52 L108 200" stroke="{SHADE}" stroke-width="2"/>'
    + ''.join(f'<circle cx="100" cy="{y}" r="3.2" fill="{SHADE}" stroke="{INK}" stroke-width="1"/>' for y in (118,160)))
def bande(): return f'<path d="M64 26 Q100 18 136 26 L134 48 Q100 42 66 48 Z" fill="{SHADE}" {W}/>'
def ailes(l, r=None):
    r = r or ' '.join(f'{200-float(a)} {b}' if i%1==0 else '' for i,(a,b) in enumerate(p.split() for p in []))
    return f'<path d="{l}" fill="{SHIRT}" {W}/>'
def mirror(d):
    import re
    toks=re.findall(r'[A-Za-z]|-?[0-9.]+',d);out=[];i=0
    while i<len(toks):
        t=toks[i]
        if t.isalpha(): out.append(t);i+=1
        else: out.append(f'{200-float(toks[i]):g} {toks[i+1]}');i+=2
    return ' '.join(out)
def paire(d): return f'<path d="{d}" fill="{SHIRT}" {W}/><path d="{mirror(d)}" fill="{SHIRT}" {W}/>'
bouton_col=f'<circle cx="100" cy="62" r="3.2" fill="{SHADE}" stroke="{INK}" stroke-width="1"/>'
cols={
 'classique':(paire('M66 28 L98 52 L66 104 L46 44 Z'),'Un col aux pointes moyennes, assez rapprochées, qui descendent en V.'),
 'italien':(paire('M66 28 L98 52 L42 84 L38 46 Z'),'Un col aux pointes très écartées, presque à l\'horizontale.'),
 'boutonne':(paire('M66 28 L98 52 L70 112 L46 44 Z')+f'<circle cx="72" cy="104" r="3.4" fill="{SHADE}" stroke="{INK}" stroke-width="1.2"/><circle cx="128" cy="104" r="3.4" fill="{SHADE}" stroke="{INK}" stroke-width="1.2"/>','Un col aux pointes longues, fixées sur la chemise par deux petits boutons.'),
 'club':(paire('M66 28 L98 52 Q90 96 74 98 Q60 100 46 44 Z'),'Un col aux pointes arrondies.'),
 'mao':(f'<path d="M62 22 Q100 14 138 22 L138 48 Q118 54 104 56 L96 56 Q82 54 62 48 Z" fill="{SHIRT}" {W}/><path d="M100 58 L100 22" stroke="{SHADE}" stroke-width="2"/>'+bouton_col,'Un col droit qui monte autour du cou, sans pointes rabattues.'),
 'casse':(f'<path d="M62 18 Q100 10 138 18 L138 54 L104 58 L96 58 L62 54 Z" fill="{SHIRT}" {W}/>'
          f'<path d="M96 58 L84 64 L80 56 Z" fill="{SHIRT}" {W}/><path d="M104 58 L116 64 L120 56 Z" fill="{SHIRT}" {W}/>'
          f'<path d="M100 60 L76 50 L74 72 Z M100 60 L124 50 L126 72 Z" fill="#2a2420" {W}/><rect x="94" y="54" width="12" height="12" rx="3" fill="#2a2420" {W}/>',
          'Un col droit et haut dont seules deux petites pointes sont rabattues vers l\'extérieur, avec un nœud papillon noir.'),
}
for n,(c,t) in cols.items():
    body = chemise() + ('' if n in ('mao','casse') else bande()) + c + ('' if n in ('mao','casse') else bouton_col)
    open(C+n+'.svg','w').write(svg(body,t))
# ---------- Tissus (rendu de tissage) ----------
T='public/questions/tissus/'
def weave(warp, weft, ontop, cell, cols_):
    """warp/weft : listes d'indices de couleur, ontop(x,y) -> True si le fil de chaîne passe dessus."""
    nx,ny=len(warp),len(weft); rects=[]
    for y in range(ny):
        x=0
        while x<nx:
            c = warp[x] if ontop(x,y) else weft[y]; x2=x
            while x2+1<nx and (warp[x2+1] if ontop(x2+1,y) else weft[y])==c: x2+=1
            rects.append(f'<rect x="{x*cell}" y="{y*cell}" width="{(x2-x+1)*cell}" height="{cell}" fill="{cols_[c]}"/>')
            x=x2+1
    w,h=nx*cell,ny*cell
    return w,h,''.join(rects)
def swatch(tile, titre, extra='', id='m'):
    w,h,r=tile
    return svg(f'<defs><pattern id="{id}" width="{w}" height="{h}" patternUnits="userSpaceOnUse">{r}</pattern></defs>'
               f'<rect width="200" height="200" fill="url(#{id})"/>{extra}<rect x="1" y="1" width="198" height="198" fill="none" stroke="{INK}" stroke-width="2"/>', titre)
twill=lambda x,y:(x+y)%4<2
# pied-de-poule : 4 fils noirs / 4 blancs en chaîne et en trame, sergé 2/2
s=[0]*4+[1]*4
open(T+'pied-de-poule.svg','w').write(swatch(weave(s,s,twill,4,['#1f1b18','#f3ede0']),'Un tissu à petits motifs noirs et blancs dentelés, comme des crochets répétés.', id='pied-de-poule'))
# Prince-de-Galles : alternance de zones 4/4 et 2/2
g=([0]*4+[1]*4)*3+([0,0,1,1])*6
open(T+'prince-de-galles.svg','w').write(swatch(weave(g,g,twill,2.5,['#2b2a2c','#e9e4da']),'Un tissu gris à carreaux, où alternent des zones de petits motifs dentelés et de fines rayures croisées.',
   '<g opacity=".35" stroke="#7a3a3a" stroke-width="1.5"><path d="M0 60 H200 M0 180 H200 M60 0 V200 M180 0 V200"/></g>'))
# chevrons : sergé qui change de sens tous les 8 fils
che=lambda x,y:((x + (y if (x//8)%2==0 else -y))%4)<2
open(T+'chevrons.svg','w').write(swatch(weave([0]*16,[1]*16,che,3,['#5a4e44','#cfc4b2']),'Un tissu à rayures verticales en zigzag, comme des arêtes de poisson.', id='chevrons'))
# vichy
open(T+'vichy.svg','w').write(swatch((32,32,'<rect width="32" height="32" fill="#f6f3ec"/><rect width="16" height="32" fill="#3f6fa8" opacity=".5"/><rect width="32" height="16" fill="#3f6fa8" opacity=".5"/>'),'Un tissu à petits carreaux réguliers bleus et blancs, en trois tons.', id='vichy'))
# tartan
tt=('<rect width="80" height="80" fill="#2e5a3c"/>'
    '<g opacity=".55" fill="#1d2a4a"><rect x="0" width="28" height="80"/><rect y="0" width="80" height="28"/></g>'
    '<g fill="#b8322c" opacity=".9"><rect x="48" width="4" height="80"/><rect y="48" width="80" height="4"/></g>'
    '<g fill="#e3c24a" opacity=".9"><rect x="13" width="2" height="80"/><rect y="13" width="80" height="2"/></g>')
open(T+'tartan.svg','w').write(swatch((80,80,tt),'Un tissu vert et bleu marine à grands carreaux, barrés de fines lignes rouges et jaunes.', id='tartan'))
# madras
md=('<rect width="100" height="100" fill="#f2d16b"/>'
    '<g opacity=".55"><rect x="0" width="30" height="100" fill="#e2508a"/><rect x="55" width="18" height="100" fill="#3f7fc4"/>'
    '<rect y="0" width="100" height="30" fill="#e2508a"/><rect y="55" width="100" height="18" fill="#3f7fc4"/></g>'
    '<g opacity=".6" fill="#3a9a5a"><rect x="38" width="8" height="100"/><rect y="38" width="100" height="8"/></g>'
    '<g opacity=".7" fill="#f6efe2"><rect x="84" width="3" height="100"/><rect y="84" width="100" height="3"/></g>')
open(T+'madras.svg','w').write(swatch((100,100,md),'Un tissu léger à carreaux irréguliers de couleurs vives : rose, jaune, bleu et vert.', id='madras'))
# rayure craie
open(T+'rayure-craie.svg','w').write(svg('<defs><filter id="flou-craie"><feGaussianBlur stdDeviation="1.1"/></filter></defs><rect width="200" height="200" fill="#2f3440"/>'
   '<g filter="url(#flou-craie)" stroke="#e8e4da" stroke-width="2.2" opacity=".8">'+''.join(f'<path d="M{x} 0 V200"/>' for x in range(14,200,28))+'</g>'
   f'<rect x="1" y="1" width="198" height="198" fill="none" stroke="{INK}" stroke-width="2"/>','Un tissu gris anthracite à rayures blanches fines et floues, bien espacées.'))
# seersucker
ss='<rect width="200" height="200" fill="#f7f5ef"/>'
for x in range(0,200,24):
    pts=' '.join(f'{x+ (1.5 if (y//6)%2 else 0):g},{y}' for y in range(0,201,6))
    pts2=' '.join(f'{x+12+ (1.5 if (y//6)%2 else 0):g},{y}' for y in range(200,-1,-6))
    ss+=f'<polygon points="{pts} {pts2}" fill="#6f9bd1"/>'
ss+='<g stroke="#ffffff" stroke-width="1" opacity=".45">'+''.join(f'<path d="M0 {y} H200"/>' for y in range(3,200,6))+'</g>'
open(T+'seersucker.svg','w').write(svg(ss+f'<rect x="1" y="1" width="198" height="198" fill="none" stroke="{INK}" stroke-width="2"/>','Un tissu léger à rayures bleues et blanches, au relief froissé.'))
# ---------- Chapeaux ----------
H='public/questions/chapeaux/'
def hat(body,t): return svg(body,t,"0 0 200 160")
FEUTRE='#7a6a58'; PAILLE='#e3cf96'; NOIR='#2a2522'; RUBAN='#2a2522'
def fedora(col,extra=''):
    return (f'<path d="M14 118 Q40 104 100 106 Q160 104 186 118 Q160 128 100 126 Q40 128 14 118 Z" fill="{col}" {W}/>'
            f'<path d="M50 112 Q46 62 64 46 Q82 38 100 50 Q118 38 136 46 Q154 62 150 112 Z" fill="{col}" {W}/>'
            f'<path d="M100 50 L100 70" stroke="{INK}" stroke-width="2" opacity=".6"/>'
            f'<path d="M50 96 Q100 104 150 96 L150 112 Q100 118 50 112 Z" fill="{RUBAN}" {W}/>'+extra)
paille=''.join(f'<path d="M56 {y} Q100 {y-6} 144 {y}" stroke="#b89c5a" stroke-width="1" fill="none" opacity=".7"/>' for y in range(60,96,7))
chapeaux={
 'fedora':(fedora(FEUTRE),'Un chapeau de feutre brun, à calotte pincée creusée sur le dessus et bord souple, avec un ruban sombre.'),
 'panama':(fedora(PAILLE,paille),'Un chapeau de paille claire tressée, à calotte pincée et ruban noir.'),
 'melon':(f'<path d="M30 120 Q36 110 100 110 Q164 110 170 120 Q164 128 100 128 Q36 128 30 120 Z" fill="{NOIR}" {W}/>'
          f'<path d="M48 116 Q44 44 100 40 Q156 44 152 116 Z" fill="{NOIR}" {W}/>'
          f'<path d="M48 102 Q100 110 152 102 L152 114 Q100 120 48 114 Z" fill="#141110" {W}/>','Un chapeau noir rigide à calotte bien ronde et petit bord recourbé.'),
 'canotier':(f'<path d="M12 116 Q100 100 188 116 Q100 130 12 116 Z" fill="{PAILLE}" {W}/>'
             f'<path d="M54 112 L56 62 Q100 54 144 62 L146 112 Q100 118 54 112 Z" fill="{PAILLE}" {W}/>'
             f'<path d="M56 62 Q100 70 144 62" fill="none" {W}/>'
             f'<path d="M55 92 Q100 98 145 92 L146 108 Q100 114 54 108 Z" fill="#2e4a7a" {W}/>'+''.join(f'<path d="M56 {y} Q100 {y+5} 144 {y}" stroke="#b89c5a" stroke-width="1" fill="none" opacity=".7"/>' for y in (72,80,88)),
             'Un chapeau de paille rigide à calotte plate et cylindrique, bord plat et large ruban bleu.'),
 'haut-de-forme':(f'<path d="M34 128 Q40 118 100 118 Q160 118 166 128 Q160 136 100 136 Q40 136 34 128 Z" fill="{NOIR}" {W}/>'
                  f'<path d="M58 124 L54 22 Q100 14 146 22 L142 124 Z" fill="{NOIR}" {W}/><path d="M54 22 Q100 30 146 22" fill="none" {W}/>'
                  f'<path d="M57 104 Q100 110 143 104 L142 120 Q100 126 58 120 Z" fill="#141110" {W}/>','Un chapeau noir très haut, en forme de cylindre, au bord étroit.'),
 'casquette':(f'<path d="M30 112 Q30 66 100 62 Q166 64 170 100 Q172 116 150 118 L60 118 Q30 118 30 112 Z" fill="#8a7a5e" {W}/>'
              f'<path d="M30 112 Q10 116 8 124 Q40 130 80 122 L60 118 Q30 118 30 112 Z" fill="#7a6a50" {W}/>'
              +'<clipPath id="cq"><path d="M30 112 Q30 66 100 62 Q166 64 170 100 Q172 116 150 118 L60 118 Q30 118 30 112 Z"/></clipPath><g clip-path="url(#cq)">'+''.join(f'<path d="M{x} 60 L{x+30} 120" stroke="#6a5a42" stroke-width="1" opacity=".6"/>' for x in range(20,170,12))+'</g>','Une casquette plate en tweed, à petite visière.'),
}
for n,(b,t) in chapeaux.items(): open(H+n+'.svg','w').write(hat(b,t))
# ---------- Pochettes ----------
P='public/questions/pochettes/'
VESTE='#2f3b55'; LIN='#f6f3ec'
def poche(sq,t):
    body=(f'<rect width="200" height="160" fill="{VESTE}"/>'
          + ''.join(f'<path d="M{x} 0 V160" stroke="#3a4766" stroke-width="1"/>' for x in range(6,200,12))
          + sq + f'<rect x="40" y="96" width="120" height="12" rx="2" fill="#26314a" stroke="#1a2236" stroke-width="2"/>'
          + f'<path d="M40 108 L160 108 L158 150 L42 150 Z" fill="none" stroke="#3f4d70" stroke-width="1.5" stroke-dasharray="4 3"/>'
          + f'<rect x="1" y="1" width="198" height="158" fill="none" stroke="{INK}" stroke-width="2"/>')
    return svg(body,t,"0 0 200 160")
pochettes={
 'droite':(f'<rect x="46" y="84" width="108" height="16" fill="{LIN}" stroke="{INK}" stroke-width="2"/>','Une pochette blanche pliée en bande droite qui dépasse à peine, parallèle au bord de la poche.'),
 'une-pointe':(f'<path d="M58 100 L100 50 L142 100 Z" fill="{LIN}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>','Une pochette blanche qui dépasse en un seul triangle.'),
 'trois-pointes':(f'<path d="M50 100 L62 58 L80 86 L100 44 L120 86 L138 58 L150 100 Z" fill="{LIN}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>','Une pochette blanche qui dépasse en trois pointes, comme une couronne.'),
 'bouffant':(f'<path d="M52 100 Q46 64 78 64 Q88 44 108 54 Q132 46 140 70 Q156 80 148 100 Z" fill="#b8423a" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
             f'<path d="M80 70 Q92 84 88 98 M112 60 Q118 80 112 98 M132 76 Q138 90 132 98" stroke="#8a2c26" stroke-width="2" fill="none"/>','Une pochette de soie rouge glissée en boule, toute arrondie, sans pointes.'),
}
for n,(b,t) in pochettes.items(): open(P+n+'.svg','w').write(poche(b,t))
# ---------- Revers ----------
R='public/questions/revers/'
REV='#3a4868'
def veste(rev,t,col_mao=False):
    body=(f'<path d="M20 40 Q60 20 76 14 L124 14 Q140 20 180 40 L172 200 L28 200 Z" fill="{VESTE}" {W}/>')
    if col_mao:
        body+=(f'<path d="M80 14 L120 14 L118 30 Q100 34 82 30 Z" fill="{SHIRT}" {W}/>'
               f'<path d="M76 10 Q100 4 124 10 L124 26 Q100 32 76 26 Z" fill="{VESTE}" {W}/>'
               f'<path d="M100 30 L100 200" stroke="{INK}" stroke-width="2"/>'
               + ''.join(f'<circle cx="106" cy="{y}" r="3.5" fill="#1a2236" stroke="{INK}" stroke-width="1"/>' for y in (50,90,130,170)))
    else:
        body+=(f'<path d="M78 14 L122 14 L100 120 Z" fill="{SHIRT}" {W}/>'
               f'<path d="M94 20 L106 20 L109 30 L104 112 L100 118 L96 112 L91 30 Z" fill="#7a2e2a" {W}/>'
               f'<path d="M100 132 L100 200" stroke="{INK}" stroke-width="2"/><circle cx="100" cy="150" r="4" fill="#1a2236" stroke="{INK}" stroke-width="1"/>'
               + f'<path d="{rev}" fill="{REV}" {W}/><path d="{mirror(rev)}" fill="{REV}" {W}/>')
    return svg(body,t)
revers={
 'cran':('M78 12 L58 46 L66 52 L50 58 L98 132 L84 24 Z','Une veste dont les revers, sous le col, forment une petite encoche ouverte, comme un cran triangulaire.'),
 'pointe':('M78 12 L64 46 L40 38 L50 62 L98 132 L84 24 Z','Une veste dont les revers remontent en pointes aiguës vers les épaules.'),
 'chale':('M78 12 Q52 40 54 74 Q62 110 98 132 L84 24 Z','Une veste dont le revers dessine une seule courbe arrondie, sans encoche ni pointe.'),
}
for n,(d,t) in revers.items(): open(R+n+'.svg','w').write(veste(d,t))
open(R+'sans-revers.svg','w').write(veste('', 'Une veste sans revers, fermée jusqu\'en haut par un petit col droit.', col_mao=True))

# ---------- Nœuds de cravate ----------
OUT='public/questions/noeuds'
INK='#3b2f25'; TIE='#7a2e2a'; DARK='#5a1f1c'; LIGHT='#9a4a42'; SHIRT='#fbf8f1'; SHADE='#e8e0cf'
def svg_noeud(knot, kb, bw, titre, off=0):
    blade=f'<path d="M{100+off-bw/2} {kb-2} L76 192 L100 212 L124 192 L{100+off+bw/2} {kb-2} Z" fill="{TIE}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
    dimple=f'<path d="M{100+off} {kb+2} q-3 10 -1 22" fill="none" stroke="{DARK}" stroke-width="2" stroke-linecap="round"/>'
    shirt=(f'<path d="M20 220 L28 60 Q60 30 100 34 Q140 30 172 60 L180 220 Z" fill="{SHIRT}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
           f'<path d="M100 40 L100 220" stroke="{SHADE}" stroke-width="2"/>'
           f'<circle cx="100" cy="150" r="3" fill="{SHADE}"/><circle cx="100" cy="186" r="3" fill="{SHADE}"/>')
    collar=(f'<path d="M64 26 Q100 20 136 26 L132 40 Q100 34 68 40 Z" fill="{SHADE}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<path d="M66 30 L98 46 L58 98 L44 44 Z" fill="{SHIRT}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<path d="M134 30 L102 46 L142 98 L156 44 Z" fill="{SHIRT}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" role="img"><title>{titre}</title>'
            + shirt + blade + dimple + collar + knot + '</svg>')
def k(path, extra=''):
    return f'<path d="{path}" fill="{TIE}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>' + extra
def line(d, w=2.2, c=DARK):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
# Simple (four-in-hand) : étroit, allongé, un peu de travers
simple = svg_noeud(k('M85 40 Q100 36 115 41 Q117 64 111 88 Q104 92 97 88 Q88 64 85 40 Z',
               line('M87 50 Q102 62 115 56')+line('M90 46 Q100 44 112 44',1.6,LIGHT)), 87, 16, 'Nœud de cravate étroit et allongé, un peu asymétrique', 4)
# Demi-Windsor : moyen, triangle symétrique
demi = svg_noeud(k('M76 40 Q100 35 124 40 Q118 62 106 80 Q100 83 94 80 Q82 62 76 40 Z',
             line('M80 50 Q100 58 120 50')+line('M84 44 Q100 41 116 44',1.6,LIGHT)), 80, 16, 'Nœud de cravate moyen, en triangle symétrique')
# Windsor : large, épais, triangle très ouvert
windsor = svg_noeud(k('M62 40 Q100 33 138 40 Q130 60 108 82 Q100 86 92 82 Q70 60 62 40 Z',
                line('M70 48 Q86 62 100 64')+line('M130 48 Q114 62 100 64')+line('M68 43 Q100 38 132 43',1.6,LIGHT)), 82, 18, 'Nœud de cravate très large et épais, en grand triangle symétrique')
# Eldredge : tressé, en arêtes de poisson
eld_lines=''.join(line(f'M{100-w} {y} L100 {y+9}')+line(f'M{100+w} {y} L100 {y+9}') for y,w in [(42,26),(52,22),(62,16),(71,10)])
eld = svg_noeud(k('M70 38 Q100 33 130 38 Q126 60 108 86 Q100 90 92 86 Q74 60 70 38 Z', eld_lines), 86, 16, 'Nœud de cravate tressé, avec des bandes croisées en arêtes de poisson')
for n,s in [('simple',simple),('demi-windsor',demi),('windsor',windsor),('eldredge',eld)]:
    open(os.path.join(OUT,n+'.svg'),'w').write(s)

# ---------- Découpe des fromages (vue de dessus, traits de coupe en pointillés) ----------
F='public/questions/fromages/'
PATE='#f4e6b8'; CROUTE='#e9dcc0'; CHEVRE='#f7f4ec'; BLEU='#5f7fa0'
def coupe(d): return f'<path d="{d}" fill="none" stroke="#b8423a" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>'
def couteau_pose(): return ''
def fromage(body, t): return svg(body, t)
# Pointe de brie : la croûte sur l'arc (x 30→170, y 40), le nez en bas (100,175)
brie_forme = f'<path d="M28 46 Q100 18 172 46 L100 176 Z" fill="{PATE}" stroke="{CROUTE}" stroke-width="9" stroke-linejoin="round"/><path d="M28 46 Q100 18 172 46 L100 176 Z" fill="none" {W}/>'
brie = {
 'brie-long':(brie_forme+coupe('M52 40 L106 166')+coupe('M76 33 L111 156'),'Une pointe de brie, coupée en tranches fines le long d\'un côté, de la croûte jusqu\'à la pointe.'),
 'brie-nez':(brie_forme+coupe('M72 126 L128 126'),'Une pointe de brie dont on coupe le bout pointu.'),
 'brie-travers':(brie_forme+coupe('M46 80 Q100 60 154 80')+coupe('M62 110 Q100 96 138 110'),'Une pointe de brie coupée en bandes parallèles à la croûte arrondie.'),
 'brie-moitie':(brie_forme+coupe('M40 66 L140 120'),'Une pointe de brie coupée en travers, en biais, d\'un côté à l\'autre.'),
}
# Camembert vu de dessus
cam = f'<circle cx="100" cy="100" r="78" fill="{PATE}" stroke="{CROUTE}" stroke-width="9"/><circle cx="100" cy="100" r="78" fill="none" {W}/>'
camembert = {
 'camembert-parts':(cam+''.join(coupe(f'M100 100 L{100+78*__import__("math").cos(a):.1f} {100+78*__import__("math").sin(a):.1f}') for a in [i*__import__("math").pi/3 for i in range(6)]),'Un camembert coupé en parts triangulaires qui partent toutes du centre.'),
 'camembert-bandes':(cam+coupe('M60 34 L60 166')+coupe('M100 22 L100 178')+coupe('M140 34 L140 166'),'Un camembert coupé en bandes droites et parallèles.'),
 'camembert-grille':(cam+coupe('M74 26 L74 174')+coupe('M126 26 L126 174')+coupe('M26 74 L174 74')+coupe('M26 126 L174 126'),'Un camembert coupé en quadrillage, en petits carrés.'),
 'camembert-coeur':(cam+coupe('M100 62 A38 38 0 1 1 99.9 62'),'Un camembert dont on découpe un rond au centre.'),
}
# Bûche de chèvre vue de côté
buche = f'<rect x="20" y="66" width="160" height="68" rx="30" fill="{CHEVRE}" stroke="#d8d2c2" stroke-width="7"/><rect x="20" y="66" width="160" height="68" rx="30" fill="none" {W}/>'
chevre = {
 'chevre-rondelles':(buche+''.join(coupe(f'M{x} 58 L{x} 142') for x in (60,90,120,150)),'Une bûche de chèvre coupée en rondelles régulières, en travers.'),
 'chevre-long':(buche+coupe('M14 100 L186 100'),'Une bûche de chèvre coupée en deux dans sa longueur.'),
 'chevre-biseau':(buche+coupe('M40 140 L80 60')+coupe('M100 140 L140 60'),'Une bûche de chèvre coupée en longs biseaux obliques.'),
 'chevre-bout':(buche+coupe('M150 58 L150 142')+coupe('M50 58 L50 142'),'Une bûche de chèvre dont on ne coupe que les deux bouts.'),
}
# Roquefort : une pointe épaisse, le cœur persillé vers la pointe (en bas)
import random as _r
_r.seed(4)
veines=''.join(f'<path d="M{x} {y} q{_r.randint(-6,6)} {_r.randint(4,10)} {_r.randint(-8,8)} {_r.randint(8,14)}" stroke="{BLEU}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>' for x,y in [(100,140),(92,122),(110,118),(84,100),(118,96),(100,102),(76,78),(124,74),(100,80),(92,58),(110,56)] if True)
roq_forme = f'<path d="M28 46 Q100 18 172 46 L100 176 Z" fill="#efe7d4" stroke="#e2d7bd" stroke-width="9" stroke-linejoin="round"/>'+veines+f'<path d="M28 46 Q100 18 172 46 L100 176 Z" fill="none" {W}/>'
roquefort = {
 'roquefort-biais':(roq_forme+coupe('M100 176 L66 34')+coupe('M100 176 L134 34'),'Une pointe de roquefort coupée en biais depuis la pointe persillée jusqu\'à la croûte, en parts qui ont toutes un peu du cœur.'),
 'roquefort-pointe':(roq_forme+coupe('M70 120 L130 120'),'Une pointe de roquefort dont on coupe le bout persillé.'),
 'roquefort-bandes':(roq_forme+coupe('M40 66 Q100 46 160 66')+coupe('M54 94 Q100 80 146 94'),'Une pointe de roquefort coupée en bandes parallèles à la croûte.'),
 'roquefort-cote':(roq_forme+coupe('M150 46 L96 168'),'Une pointe de roquefort dont on coupe une tranche le long d\'un seul côté, sans le cœur.'),
}
for groupe in (brie, camembert, chevre, roquefort):
    for n,(b,t) in groupe.items(): open(F+n+'.svg','w').write(fromage(b,t))

# ---------- Couverts sur l'assiette (vue de dessus) ----------
K='public/questions/couverts/'
METAL='#c9ccd1'
def fourchette(x,y,a,e=.8):
    return (f'<g transform="translate({x} {y}) rotate({a}) scale({e})">'
            f'<rect x="-5" y="0" width="10" height="70" rx="5" fill="{METAL}" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M-9 0 L-9 -34 M-3 0 L-3 -36 M3 0 L3 -36 M9 0 L9 -34" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>'
            f'<path d="M-11 -4 Q0 8 11 -4 L11 2 Q0 12 -11 2 Z" fill="{METAL}" stroke="{INK}" stroke-width="2"/></g>')
def couteau(x,y,a,e=.8):
    return (f'<g transform="translate({x} {y}) rotate({a}) scale({e})">'
            f'<rect x="-5" y="0" width="10" height="70" rx="5" fill="{METAL}" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M-5 0 L-5 -44 Q-5 -54 3 -56 L5 -56 L5 0 Z" fill="#e4e6ea" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/></g>')
assiette = (f'<rect width="200" height="200" fill="#efe6d2"/><circle cx="100" cy="100" r="74" fill="#ffffff" stroke="{INK}" stroke-width="2.5"/>'
            f'<circle cx="100" cy="100" r="50" fill="none" stroke="#e3dccd" stroke-width="2"/>')
couverts = {
 'fini':(assiette+fourchette(84,84,-35)+couteau(96,76,-35),'Fourchette et couteau posés côte à côte dans l\'assiette, parallèles, en biais vers le bas à droite.'),
 'pause':(assiette+fourchette(80,88,35)+couteau(126,101,-35),'Fourchette et couteau posés en V renversé dans l\'assiette, pointes rapprochées vers le haut.'),
 'croises':(assiette+fourchette(100,100,-40)+couteau(100,100,40),'Fourchette et couteau croisés en X au milieu de l\'assiette.'),
 'nappe':(assiette+fourchette(13,88,0)+couteau(187,96,0),'Fourchette et couteau reposés sur la nappe, de chaque côté de l\'assiette vide.'),
}
for n,(b,t) in couverts.items(): open(K+n+'.svg','w').write(svg(b,t))
