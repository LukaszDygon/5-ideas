// Grow Your Own: all topic content lives here, apart from the engine (app.js) and the art (sprites.js).
// Swapping the topic means replacing AREAS: maps, lessons and gate quizzes.
//
// Map legend (15 x 11 tiles):
//   #  hedge        .  grass        :  path          *  flowers      T  tree
//   W  shed wall    w  shed floor   G  glass wall    g  greenhouse floor
//   s  soil bed     ~  water        B  bench         x  log pile     =  street gate
//   S  signpost     1-4  the area's lessons, in order
//   <  exit back    >  gate forward (asks the area's quiz, if it has one)    @  start

export const TOPIC = {
  title: 'Grow Your Own',
  subject: 'practical gardening in the UK',
};

export const AREAS = [
  {
    id: 'gate',
    name: 'The Garden Gate',
    kicker: 'Start',
    floor: '.',
    blurb: 'Your plot starts here. Follow the path east.',
    sign: {
      title: 'Welcome to your plot',
      body: [
        'Walk into anything with a yellow marker to read a lesson. Every lesson you read goes into your codex.',
        'Each area ends at a gate with one question. Read all four lessons in the area and the gate will ask it.',
      ],
    },
    map: [
      '###############',
      '#T.*.....*..T.#',
      '#....~~~......#',
      '#*...~~~...*..#',
      '#.............#',
      '#.....S:::::::>',
      '#.......:.....#',
      '#.*.....:...T.#',
      '#T......:..*..#',
      '#*......@.....#',
      '########=######',
    ],
  },
  {
    id: 'shed',
    chapter: 1,
    name: 'The Potting Shed',
    kicker: 'Plan',
    floor: 'w',
    blurb: 'Before you sow a seed: what soil, how much sun, and when is it safe?',
    map: [
      'WWWWWWWWWWWWWWW',
      'WBB1BBwwwwB2BBW',
      'WwwwwwwwwwwwwwW',
      'WwwwwwwwwwwwwwW',
      'WwwBBwwwwwBBwwW',
      '<wwB3wwwwwBBwwW',
      'WwwwwwwwwwwwwwW',
      'Wwwwwwwwwwwwww>',
      'Wxxwwwwwwwwww4W',
      'WxxwwwwwwwwwwwW',
      'WWWWWWWWWWWWWWW',
    ],
    lessons: [
      {
        id: 'soil',
        sprite: 'soilSack',
        title: 'Know your soil',
        body: [
          'Squeeze a damp handful. Clay rolls into a sticky ball you can polish with your thumb; sandy soil feels gritty and falls apart; loam crumbles but holds together for a moment.',
          'Large parts of England, including much of London, the south-east and the Midlands, sit on heavy clay: rich in nutrients but slow to drain and slow to warm up in spring. Sandy soil warms quickly but dries out and loses nutrients.',
        ],
        tip: 'Whatever you have, the fix is the same: spread or dig in organic matter such as garden compost or well-rotted manure every year.',
      },
      {
        id: 'sun',
        sprite: 'sun',
        title: 'Follow the sun',
        body: [
          'Most fruit and vegetables want at least six hours of direct sun a day in summer.',
          'A south-facing garden gets the most light and a north-facing one the least. East-facing plots get the morning sun and west-facing plots the warm evening sun. Watch your plot for a day and note where fences, walls and trees throw shade.',
        ],
        tip: 'Give the sunniest spot to tomatoes, courgettes and beans. Leafy salads, chard, mint and parsley cope with part shade.',
      },
      {
        id: 'frost',
        sprite: 'thermometer',
        title: 'Watch for frost',
        body: [
          'Frost kills tender plants such as tomatoes, courgettes, squash and runner beans. The last spring frost comes anywhere from March in mild coastal areas to late May or even June in the north, in Scotland and on high ground.',
          'Hardy crops such as broad beans, peas, onions and spinach cope with cold. Tender ones go outside only once frost has passed: usually late May in the south and early June further north.',
        ],
        tip: 'Keep an eye on the forecast in spring. If frost is due, cover young plants overnight with horticultural fleece.',
      },
      {
        id: 'year',
        sprite: 'calendar',
        title: 'The gardening year',
        body: ['Most of the work follows the seasons, so a rough calendar keeps you ahead of it.'],
        list: [
          ['Winter · Dec–Feb', 'Plan your beds, order seeds and chit seed potatoes.'],
          ['Spring · Mar–May', 'Sow, plant out hardy crops and harden off tender ones.'],
          ['Summer · Jun–Aug', 'Water, feed, and pick little and often.'],
          ['Autumn · Sep–Nov', 'Plant garlic, clear finished crops, mulch bare soil and bag up fallen leaves.'],
        ],
        tip: 'Start small. One or two beds you can keep weeded will feed you better than a big plot that gets away from you.',
      },
    ],
    quiz: {
      question: 'Your soil squeezes into a shiny, sticky ball and puddles sit on it after rain. What is the best long-term fix?',
      options: [
        'Dig in plenty of sand',
        'Spread compost or well-rotted manure every year',
        'Leave it bare so it dries out',
        'Add lime every spring',
      ],
      answer: 1,
      hint: 'Clay and sandy soils share one cure. Think back to the soil sack.',
      explain: 'Organic matter opens up clay so it drains, and helps sandy soil hold on to water and nutrients.',
    },
  },
  {
    id: 'greenhouse',
    chapter: 2,
    name: 'The Greenhouse',
    kicker: 'Sow',
    floor: 'g',
    blurb: 'Start seeds indoors, get young plants ready for outside, and water well.',
    map: [
      'GGGGGGGGGGGGGGG',
      'GBBBB1gggBBBBBG',
      'GgggggggggggggG',
      'GggBBBBgBBBBggG',
      'Gggggg2gggggggG',
      '<ggBBBBgBBBBggG',
      'GgggggggggggggG',
      'Gg3ggggggggggg>',
      'GgggggggggggggG',
      'G~~ggggggg4BBBG',
      'GGGGGGGGGGGGGGG',
    ],
    lessons: [
      {
        id: 'windowsill',
        sprite: 'seedTray',
        title: 'Sow on a windowsill',
        body: [
          "You don't need a greenhouse. A bright windowsill is enough to start tomatoes, chillies and peppers in late winter and early spring.",
          "Fill a tray or small pots with peat-free seed compost, sow at the depth on the packet (roughly twice the seed's own size) and keep it moist but not soggy. When the seedlings have their first true leaves, move each one into its own small pot. This is called pricking out.",
        ],
        tip: 'Give pots a quarter turn every day so seedlings grow straight. Tall, floppy seedlings are asking for more light.',
      },
      {
        id: 'plugs',
        sprite: 'plugTray',
        title: 'Seeds or plug plants?',
        body: [
          'Seeds are cheap and give you hundreds of varieties to choose from. Plug plants, the young plants sold in trays by garden centres and mail-order nurseries each spring, cost more but skip the fiddly early weeks.',
          "Plugs are handy for slow or tricky crops, or when you start late. Some crops dislike being moved at all and do best sown straight into the ground where they'll grow.",
        ],
        tip: 'Sow carrots, parsnips and radishes direct. Tomatoes, courgettes and peppers are easy to buy as plugs.',
      },
      {
        id: 'hardening',
        sprite: 'coldFrame',
        title: 'Harden off',
        body: [
          'Plants raised indoors are soft. Moving them straight outside can scorch or stunt them, even without frost.',
          "Over one to two weeks, put them out in a sheltered spot by day and bring them in at night. Then leave them out at night too, under fleece or in a cold frame with the lid open a crack, until they're used to wind, sun and cooler nights.",
        ],
        tip: 'Plan backwards: start hardening off tender plants about two weeks before you mean to plant them out.',
      },
      {
        id: 'watering',
        sprite: 'wateringCan',
        title: 'Water well',
        body: [
          'Water deeply and less often rather than a little every day. A good soak reaches the roots and encourages them to grow down, so plants cope better in dry spells.',
          'Water the soil at the base of the plant, not the leaves, ideally in the morning or evening when less is lost to evaporation. Pots and grow bags dry out fastest, so check them daily in summer. A water butt on a shed or house downpipe gives you free rainwater.',
        ],
        tip: "Push a finger into the soil. If it's dry at knuckle depth, it's time to water.",
      },
    ],
    quiz: {
      question: "It's late May, the frosts are over and your windowsill tomatoes look ready. What should you do before planting them out?",
      options: [
        'Plant them straight out today',
        'Harden them off outside by day for one to two weeks',
        'Cut them back by half',
        'Stop watering so they toughen up',
      ],
      answer: 1,
      hint: 'Indoor plants need to get used to wind, sun and cooler nights gradually.',
      explain: 'Hardening off over one to two weeks toughens up soft indoor growth before it lives outside for good.',
    },
  },
  {
    id: 'veg',
    chapter: 3,
    name: 'The Veg Patch',
    kicker: 'Grow',
    floor: '.',
    blurb: 'Four easy, reliable crops for a first UK plot.',
    map: [
      '###############',
      '#.*..T....*..T#',
      '#.sss.:1.sss..#',
      '#.sss.:..sss..#',
      '#2....:.......#',
      '<:::::::::::::>',
      '#.....:.....3.#',
      '#.sss.:.sss...#',
      '#.sss.:.sss.4.#',
      '#*....:....*.T#',
      '###############',
    ],
    lessons: [
      {
        id: 'potatoes',
        sprite: 'potatoes',
        title: 'First early potatoes',
        when: 'Plant Mar–Apr · Lift Jun–Jul',
        body: [
          'Buy certified seed potatoes in late winter and "chit" them: stand them in an egg box, eyes up, somewhere cool and bright for about six weeks until they grow short, sturdy shoots.',
          'Plant first earlies from late March to mid-April, about 12 cm deep and 30 cm apart. As shoots appear, earth them up by drawing soil over them. This protects them from late frost and stops the potatoes turning green.',
        ],
        tip: "No bed? Grow them in a large bag or bucket with drainage holes. They're ready about ten weeks after planting, often around when the plants flower.",
      },
      {
        id: 'beans',
        sprite: 'beans',
        title: 'Runner beans',
        when: 'Sow May–Jun · Pick Jul–Oct',
        body: [
          "Runner beans are productive, pretty and very British, but they're tender. Sow them indoors in pots in late April or May, or outside in late May and June once the soil is warm and the frosts are over.",
          'Grow them up a wigwam or a row of canes about 2 m tall. Keep the soil moist, especially once they flower: dry roots make the flowers drop off.',
        ],
        tip: 'Pick pods young and often, before the beans inside bulge. The more you pick, the more they make.',
      },
      {
        id: 'salad',
        sprite: 'lettuce',
        title: 'Cut-and-come-again salad',
        when: 'Sow Mar–Sep',
        body: [
          "Loose-leaf lettuce, rocket, mizuna and spinach can be cut several times. Snip leaves about 3 cm above the base and they'll regrow for more pickings.",
          'Sow a short row every two to three weeks for a steady supply instead of one big glut. In hot, dry spells salad bolts (runs to seed), so give it a little shade and keep it watered.',
        ],
        tip: "Salad grows happily in a window box, trough or pot, so it's perfect if you have no garden at all.",
      },
      {
        id: 'garlic',
        sprite: 'garlic',
        title: 'Garlic in autumn',
        when: 'Plant Oct–Nov · Lift Jun–Jul',
        body: [
          'Garlic needs a cold spell to split into cloves, so it goes in during autumn, ideally October to November. Some varieties can be planted until early spring.',
          'Buy bulbs from a garden centre or seed supplier rather than the supermarket, which may carry disease or suit a different climate. Split them into cloves and plant each one pointy end up, its tip about 2.5 cm below the surface and 15 cm apart.',
        ],
        tip: 'Lift it in early to midsummer when the lower leaves turn yellow, then dry it somewhere airy for a couple of weeks.',
      },
    ],
    quiz: {
      question: 'When is it usually safe to plant runner beans outside in southern England?',
      options: ['Early March', 'Mid April', 'Late May to early June', 'September'],
      answer: 2,
      hint: 'Runner beans are tender. Wait until the risk of frost has passed.',
      explain: 'By late May the frost risk has usually passed in the south and the soil is warm enough for beans.',
    },
  },
  {
    id: 'compost',
    chapter: 4,
    name: 'The Compost Corner',
    kicker: 'Care',
    floor: '.',
    blurb: 'Feed the soil, deal with pests kindly, and let wildlife help.',
    map: [
      '###############',
      '#xx...*..*..1.#',
      '#x....**......#',
      '#.....*...~~~.#',
      '#..3......~~~2#',
      '<:::::::::....#',
      '#.......:.....#',
      '#.**....:..T..#',
      '#4......::::::>',
      '#T*.........*x#',
      '###############',
    ],
    lessons: [
      {
        id: 'compost',
        sprite: 'compostBin',
        title: 'Make compost',
        body: [
          'A compost bin turns kitchen and garden waste into free soil improver. Aim for a roughly even mix of "greens" (veg peelings, grass clippings, soft plant waste) and "browns" (cardboard, paper, straw, woody prunings, dry leaves).',
          "Too many greens and it turns wet and smelly; too many browns and it's slow. Mix or turn it now and then to let air in. It's ready in six months to two years, when it's dark and crumbly.",
        ],
        tip: 'Leave out meat, fish, dairy and cooked food, which attract rats. Many councils sell compost bins at a discount.',
      },
      {
        id: 'slugs',
        sprite: 'snail',
        title: 'Slugs and snails',
        body: [
          "The UK's damp climate makes slugs and snails the most common garden pest. They feed at night, especially after rain, and love young seedlings.",
          'Go out with a torch on damp evenings and pick them off, sink beer traps into the soil, and grow seedlings on until they are sturdier before planting out. Frogs, toads, hedgehogs, thrushes and ground beetles all eat them.',
        ],
        tip: 'Metaldehyde slug pellets have been banned outdoors in Great Britain since 2022 because they harm wildlife. If you use pellets, choose ferric phosphate ones.',
      },
      {
        id: 'mulch',
        sprite: 'wheelbarrow',
        title: 'Mulch bare soil',
        body: [
          'A mulch is a layer at least 5 cm thick spread over the soil: garden compost, well-rotted manure, leaf mould, bark chips or straw.',
          'It locks in moisture, smothers weeds and, as worms pull it down, feeds the soil. Spread it on damp, weed-free soil in late winter or spring, or in autumn after clearing a bed.',
        ],
        tip: "Keep mulch a few centimetres away from stems and trunks so they don't rot. For free leaf mould, stuff damp autumn leaves into bin bags with a few holes; it's ready in one to two years.",
      },
      {
        id: 'wildlife',
        sprite: 'hedgehog',
        title: 'Invite wildlife in',
        body: [
          'A garden full of life does a lot of pest control for you. Ladybirds, hoverflies and lacewings eat aphids; frogs and hedgehogs eat slugs.',
          'Cut a 13 cm × 13 cm gap at the bottom of your fence so hedgehogs can travel between gardens; they roam a kilometre or two each night. Grow flowers for pollinators from spring to autumn, leave a log pile in a quiet corner and add a small pond. Even a washing-up bowl sunk into the ground will do.',
        ],
        tip: 'Go easy on pesticides: they kill the predators that would otherwise clear pests for free.',
      },
    ],
    quiz: {
      question: 'Your compost heap is wet, slimy and smells bad. What should you add?',
      options: ['More grass clippings', 'Shredded cardboard and dry leaves', 'Leftover cooked food', 'A bucket of water'],
      answer: 1,
      hint: 'A smelly heap has too many wet "greens". Balance it with something dry.',
      explain: 'Browns such as cardboard and dry leaves soak up moisture, let air in and get the heap working again.',
    },
  },
  {
    id: 'harvest',
    name: 'The Harvest',
    kicker: 'Finish',
    floor: '.',
    ripe: true,
    blurb: 'Every bed is full. Your codex holds the whole season.',
    sign: {
      title: 'Harvest time',
      body: [
        "You've read all 16 lessons and opened every gate.",
        'Open your codex any time to look back over the season.',
      ],
    },
    map: [
      '###############',
      '#*.*.T.*.*.T.*#',
      '#.sss.*.*.sss.#',
      '#.sss.....sss.#',
      '#.............#',
      '<:::::S.......#',
      '#.............#',
      '#.sss.*.*.sss.#',
      '#.sss..B..sss.#',
      '#*.*...*...*.*#',
      '###############',
    ],
  },
];
