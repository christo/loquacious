/*
Many phrases, especially opening phrases by the system or user can
be anticipated and pre-generated. Each of these may have variations
which are equivalent and such cases can be either pre-calculated
or quickly checked, hopefully by a fast LLM with appropriate embeddings,
to be equivalent to an already understood intent. Further, in many
cases, a response may be pre-generated and cached so that playback
of this is low-latency.

However, since we want responses to feel fresh, and we want to avoid
conspicuous repeated replay of exact recordings, we can pre-generate
multiple rephrasings of each dialogue part and pre-generate multiple
TTS renderings of each and consequently, generated lipsync video
sequences.

This is hoped to help with latency-hiding and to give better
average response time overall.

Finally, we can use caching and some kind of equivalence analysis to
determine when dynamically generated text, speech and video
 */

type Equivalence = {}

const EXPERT = {
  speak: {
    petnames: [
      "dear one",
      "darling",
      "my darling",
      "honey",
      "sweetie",
      "my friend",
      "my dear friend",
      "sweetheart",
      "pet",
      "sunshine",
      "darling heart",
      "sweet child",
      "little one",
      "treasure",
      "my dove",
      "cupcake",
      "dear soul",
      "cherub",
      "sweet blossom",
      "golden one",
      "dear lamb",
      "dearest",
      "dear heart",
      "blossom",
      "sweetling",
      "poppet",
      "precious",
      "love",
      "my love"
    ],
    exclamations: [
      "heavens above!",
      "goodness!",
      "oh my!",
      "wonders will never cease!",
      "muk tute!",
      "oy vey!",
      "deary me!",
      "bless my soul!",
      "oh my stars!",
      "lordy!",
      "gracious me!",
      "stars alive!",
      "well, I never!",
      "mercy me!",
      "crikey!",
      "lawks!",
      "saint preserve us!",
      "by the powers!",
      "good gracious!",
      "my word!",
      "blimey!",
      "dear heavens!",
      "holy smoke!",
      "sweet mercy!",
      "by golly!",
      "land sakes!",
      "goddess help me!",
      "by the old gods!",
      "bless the moon!",
      "mother earth save us!",
      "by the cauldron!",
      "spirits above!",
      "by the four winds!",
      "blessed be!",
      "gods and goddesses!",
      "by the elements!",
      "ancestors watch over me!",
      "by the sacred flame!",
      "goddess preserve us!",
      "oh, the fates!",
      "by the stars!",
      "crone’s wisdom!",
      "moon and stars help me!",
      "by the pentacle!",
      "blessed goddess!",
      "by the ancient ones!",
      "oh Fortuna!"
    ],
    ponderings: [
      "hmmmmm... now let me see",
      "hmm, let’s think...",
      "how intriguing...",
      "how curious...",
      "how strange...",
      "how strange...",
      "interesting...",
      "hmm, I wonder...",
      "interesting, very interesting...",
      "let’s see what’s what...",
      "ah, yes...",
      "well, well",
      "well, well, well...",
      "indeed..."
    ],
    ponderResponse: [
      "curious, very curious...",
      "now what do we have here...",
      "well now...",
      "now that IS something...",
      "hmm, let me ponder that...",
      "well, now, isn’t that something...",
      "hmm, quite interesting indeed...",
      "hmm, what’s the story here...",
      "now, that’s a puzzle...",
      "hmm, let me think on that...",
      "now, what’s to be done here...",
      "hmm, let’s consider this...",
      "now, that’s a mystery...",
      "hmm, a curious thing indeed...",
      "let me mull that over..."
    ],
    genericStall: [
      "now wait a minute",
      "give me a moment",
      "alright then",
      "alright give me a moment",
      "just a moment",
      "hold your horses",
      "now, wait a minute",
      "just a tick",
      "just a second",
      "patience, my dear",
      "hold on now",
      "let me think for a sec",
      "let me think for a tick",
      "one moment, love",
      "steady on",
      "just a moment",
      "hang on a bit",
      "let me gather my thoughts",
      "wait a tick",
      "hold on there cowboy",
      "hmm, let me see",
      "one second, darling",
      "give me a second to think",
      "let me get my head around this",
      "now, now, give me time",
      "just give me a moment to breathe"
    ],
    greetings: [
      "hello",
      "hi",
      "oh hi",
      "hello there",
      "good day",
      "good evening",
      "greetings",
      "greetings, traveller",
      "greetings, seeker"
    ]
  },
  detectOnly: {
    isolatedGreetings: [
      "hey",
      "heya",
      "yo",
      "yo wassup",
      "yo what's up",
      "how's it hanging",
    ]
  },
  unaddressed: [
    "wow",
    "oh wow",
    "look at this",
    "look at her",
    "look at him",
    "check this",
    "check this out",
    "check it",
    "check it out",
    "here she is",
    "here he is",
    "here it is",
    "holy shit",
    "my goodness",
    "oh my god",
    "no way",
    "no freakin' way",
    "no fucking way",
    "take a look at this",
    "talk to her",
    "talk to him",
    "watch this",
    "sit down",
    "it's a fortune teller",
    "it's a clairvoyant",
    "it's a tarot reader",
    "it's a psychic",
    "da fuck",
    "what the"
  ],
  detect: [
    "what is it",
    "what do you do",
    "how do you do it"
  ],
  specialQuestions: [
    "how does this work",
    "who did this",
    "who made this",
    "what the hell is this"
  ]
}