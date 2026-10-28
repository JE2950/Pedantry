# Pedantry, the Game

The Pedantico Institute for Young People Who Wish to Speak Properly. A first-person 3D game, three miles under the sea, where a cast of very rude staff test you on the mistakes that make pedants twitch.

## The staff

| Department | Who runs it | What they test |
|---|---|---|
| Entrance hall | **Pembleton**, head butler | Welcomes you, gives tips |
| Department of Quantities | **Lady Fewerton**, Duchess of Counting | less / fewer, amount / number, much / many |
| Pronoun Processing Plant | **Whomsley**, the butler | I / me / myself, he / him, we / us, who / whom |
| Homophone Hydroponics | **The Triplets** (There, Their and They're), footmen | their / there / they're, your / you're, its / it's, to / too / two, whose / who's, then / than and more |
| Laboratory of Confusion | **Professor Effect** | affect / effect, lose / loose, accept / except, practice / practise, advice / advise, bought / brought and more |
| The Apostrophe Vault | **Mrs Possessive**, housekeeper | possession, plurals, contractions |
| Grammar Crimes Unit | **Sergeant Couldhave** | could have, I saw / I've seen, double negatives, good / well, lend / borrow, lie / lay |
| Hall of False Rules | **Colonel Grumbleton** (retired) | rules that are not rules (And at the start, split infinitives, prepositions at the end), with real mistakes mixed in |

381 sentences in all, each with a short explanation. British English throughout.

## The games

Every sentence works in three games:

- **Fill the Gap**: choose the word that fits.
- **Red Pen**: click the mistake. The correction appears in red pen.
- **Rejection Desk**: stamp the sentence APPROVED or REJECTED.

In the Institute, talk to a member of staff and take their test. Three quarters right earns a stamp and turns their lamp green. Missed questions come back next time, and the results screen lists every mistake with the explanation. When every lamp above the lift is green, take the lift out and print a Certificate of Insufferable Correctness.

The title screen also has **quick play** (no 3D needed): Fill the Gap (20 questions), Red Pen (15), Rejection Desk (60 seconds against the clock) and a Mixed bag. Best scores are remembered on each computer.

## Teacher settings (title screen)

- Tick which departments are open. The lift only needs the ticked ones.
- Tick which games appear.
- Questions per test: 6, 8, 10 or 12.
- Graphics: **School PC** (default), Standard, High.
- Sound effects on or off, and optional spoken voices.

## Playing it

Hosted on GitHub Pages: open the Pages address for this repository. To test locally, run a small web server in this folder (`python3 -m http.server`, then visit `http://localhost:8000`). Double-clicking `index.html` will not work, because browsers block the scripts.

Controls: WASD to walk, mouse to look, Shift to run, E or click to talk, 1 to 4 to answer, Esc to pause. On a tablet: left stick to move, drag to look, USE button to talk.

## Adding questions

All questions live in `js/bank.js`. A gap sentence is one line:

```
'Matron says we should eat ___ sweets. | fewer | less :: Sweets can be counted, so fewer.',
```

The sentence, then the right answer, then one or more wrong answers, then `::` and the explanation. A hint in brackets at the end, like `(one dog)`, shows under the sentence.

For the Hall of False Rules:

```
'And then the dragon ate the prefect. :: ok :: Starting a sentence with "And" is fine.',
'We was robbed! :: no :: We were robbed.',
```

## Files

```
index.html          screens and panels
css/style.css       styling
js/bank.js          the questions, the staff's lines and the rule cards
js/characters.js    the staff: bodies, painted faces, expressions
js/world.js         the Institute: hall, departments, lift, props, lighting
js/games.js         the three games and the test runner
js/player.js        walking, looking, collisions, touch controls
js/textures.js      wallpaper, posters, neon signs, the sea outside the windows
js/audio.js         synthesised sound
js/main.js          start-up, title screen, dialogue, tests, quick play, certificate
vendor/three/       a local copy of Three.js, so school networks that block CDNs still work
assets/             marble, wood and brass textures, and Poly Haven props (CC0)
```

## Credits

- [Three.js](https://threejs.org), MIT licence (see `vendor/three/LICENSE`).
- 3D props: [Poly Haven](https://polyhaven.com), CC0.
- Fonts: Limelight, Josefin Sans, Special Elite and Caveat from Google Fonts.
