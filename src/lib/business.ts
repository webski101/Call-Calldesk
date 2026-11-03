export type BusinessHours = {
  weekdays: string;
  saturday: string;
  sunday: string;
};

export type BusinessBooking = {
  /** What callers book: table, appointment, slot, etc. */
  noun: string;
  partyMax: number;
  leadHours: number;
  note: string;
};

export type BusinessOfferings = {
  /** Spoken label: "menu", "services", "treatments" */
  label: string;
  items: string[];
  priceNote?: string;
};

export type BusinessProfile = {
  id: string;
  name: string;
  kind: string;
  phoneLabel: string;
  voiceId: string;
  hours: BusinessHours;
  address: string;
  wifi?: string;
  offerings: BusinessOfferings;
  booking: BusinessBooking;
  /** Optional spoken pitch after the greeting / when asked what you do. */
  pitch?: string;
  ownerNote?: string;
};

export type AgentReply = {
  intent: string;
  reply: string;
};

export const DEFAULT_VOICE_ID =
  "49c443a4-8a1d-5f7e-b70b-98bdbd9823c3"; // Audrey

export const VOICES = [
  { id: DEFAULT_VOICE_ID, name: "Audrey", vibe: "Warm front desk" },
  { id: "aai-jane", name: "Jane", vibe: "Clear default" },
  { id: "aai-alba", name: "Alba", vibe: "Bright guide" },
  { id: "aai-michael", name: "Michael", vibe: "Steady host" },
] as const;

function uid() {
  return `biz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** "a" / "an" for spoken templates. */
export function articleFor(word: string) {
  const w = word.trim().toLowerCase();
  if (!w) return "a";
  return /^[aeiou]/.test(w) ? "an" : "a";
}

export function withArticle(noun: string) {
  return `${articleFor(noun)} ${noun.trim()}`;
}

/** Lowercase the first letter so a note can follow mid-sentence. */
function softenStart(text: string) {
  const t = text.trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function usesPartyWording(business: BusinessProfile) {
  const kind = business.kind.toLowerCase();
  const noun = business.booking.noun.toLowerCase();
  return (
    noun === "table" ||
    /\b(caf[eé]|coffee|restaurant|diner|bistro|bar|pub|eatery)\b/i.test(kind)
  );
}

export function greetingFor(business: BusinessProfile) {
  const offer = business.offerings.label;
  const book = withArticle(business.booking.noun);
  const pitch = business.pitch?.trim();
  const open = `Hi, thanks for calling ${business.name}.`;
  const desk = `This is the ${business.phoneLabel}.`;
  const ask = `I can help with hours, ${offer}, directions, or ${book}. What do you need?`;
  if (pitch) {
    return `${open} ${pitch} ${desk} ${ask}`;
  }
  return `${open} ${desk} ${ask}`;
}

/** Verb agreement for "Our X include(s) ..." */
export function includeVerbFor(label: string) {
  const w = label.trim().toLowerCase();
  if (!w) return "includes";
  // Known plurals / collective labels that take plural verb.
  if (
    /\b(services|offerings|packages|treatments|items|options|products)\b/.test(w)
  ) {
    return "include";
  }
  // Regular plurals ending in s (not ss/us/is).
  if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) {
    return "include";
  }
  return "includes";
}

export function promptsFor(business: BusinessProfile) {
  return [
    "What are your hours?",
    "Where are you located?",
    `What's on the ${business.offerings.label}?`,
    `Can I book ${withArticle(business.booking.noun)}?`,
  ];
}

export const PRESETS: BusinessProfile[] = [
  {
    id: "preset-cafe",
    name: "Harbor Roast",
    kind: "neighborhood café",
    phoneLabel: "front desk",
    voiceId: DEFAULT_VOICE_ID,
    hours: {
      weekdays: "7am to 6pm",
      saturday: "8am to 4pm",
      sunday: "closed",
    },
    address: "14 Pier Lane, by the ferry terminal",
    wifi: "HarborGuest — ask the bar after noon",
    offerings: {
      label: "menu",
      items: [
        "oat flat white",
        "seasonal pour-over",
        "avocado toast",
        "warm chocolate croissant",
      ],
      priceNote: "Most drinks run from three fifty to five fifty.",
    },
    booking: {
      noun: "table",
      partyMax: 8,
      leadHours: 2,
      note: "Parties larger than eight need a day of notice.",
    },
    pitch:
      "We're a neighborhood café by the ferry — coffee, toast, and a quiet table when you need one.",
  },
  {
    id: "preset-clinic",
    name: "Northside Family Clinic",
    kind: "walk-in clinic",
    phoneLabel: "front desk",
    voiceId: DEFAULT_VOICE_ID,
    hours: {
      weekdays: "8am to 7pm",
      saturday: "9am to 2pm",
      sunday: "closed",
    },
    address: "220 Maple Avenue, suite 2",
    offerings: {
      label: "services",
      items: [
        "same-day sick visits",
        "physicals",
        "vaccines",
        "basic lab draws",
      ],
      priceNote: "Insurance and self-pay options are available at check-in.",
    },
    booking: {
      noun: "appointment",
      partyMax: 1,
      leadHours: 1,
      note: "For emergencies, hang up and dial your local emergency number.",
    },
    pitch:
      "We're a walk-in family clinic for sick visits, physicals, vaccines, and basic labs.",
  },
  {
    id: "preset-salon",
    name: "Lumen Salon",
    kind: "hair salon",
    phoneLabel: "booking desk",
    voiceId: "aai-alba",
    hours: {
      weekdays: "10am to 8pm",
      saturday: "9am to 6pm",
      sunday: "11am to 4pm",
    },
    address: "88 Glass Street",
    offerings: {
      label: "services",
      items: ["cuts", "color", "blowouts", "treatments"],
      priceNote: "Cuts start around forty-five.",
    },
    booking: {
      noun: "appointment",
      partyMax: 2,
      leadHours: 24,
      note: "Same-day openings depend on stylist availability.",
    },
    pitch: "Lumen is a hair salon for cuts, color, blowouts, and treatments.",
  },
  {
    id: "preset-gym",
    name: "Forge Fitness",
    kind: "gym",
    phoneLabel: "member desk",
    voiceId: "aai-michael",
    hours: {
      weekdays: "5am to 11pm",
      saturday: "7am to 9pm",
      sunday: "7am to 9pm",
    },
    address: "401 Ironworks Blvd",
    wifi: "ForgeGuest",
    offerings: {
      label: "offerings",
      items: [
        "day passes",
        "monthly memberships",
        "personal training",
        "group classes",
      ],
      priceNote:
        "Day passes are fifteen; memberships start at forty-nine a month.",
    },
    booking: {
      noun: "class spot",
      partyMax: 1,
      leadHours: 2,
      note: "Training sessions need twenty-four hours notice to cancel.",
    },
    pitch:
      "Forge is a gym with day passes, memberships, training, and group classes.",
  },
];

export function blankBusiness(): BusinessProfile {
  return {
    id: uid(),
    name: "",
    kind: "",
    phoneLabel: "front desk",
    voiceId: DEFAULT_VOICE_ID,
    hours: {
      weekdays: "9am to 5pm",
      saturday: "10am to 2pm",
      sunday: "closed",
    },
    address: "",
    wifi: "",
    offerings: {
      label: "services",
      items: ["", "", ""],
      priceNote: "",
    },
    booking: {
      noun: "appointment",
      partyMax: 4,
      leadHours: 2,
      note: "",
    },
    pitch: "",
  };
}

export function clonePreset(preset: BusinessProfile): BusinessProfile {
  return {
    ...structuredClone(preset),
    id: uid(),
  };
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function offerList(business: BusinessProfile) {
  return business.offerings.items.map((i) => i.trim()).filter(Boolean);
}

export function answerCaller(
  message: string,
  business: BusinessProfile,
): AgentReply {
  const q = normalize(message);
  const offerLabel = business.offerings.label;
  const bookNoun = business.booking.noun;
  const bookPhrase = withArticle(bookNoun);
  const items = offerList(business);
  const pitch = business.pitch?.trim() ?? "";

  if (!q) {
    return {
      intent: "empty",
      reply: `I didn't catch that. Want hours, the ${offerLabel}, directions, or ${bookPhrase}?`,
    };
  }

  if (
    /\b(who are you|what is this|real person)\b/.test(q) ||
    /\b(ai|robot|bot)\b/.test(q) ||
    /\bare you(?: an?)? (?:a |an )?(?:robot|bot|human|real person)\b/.test(q)
  ) {
    return {
      intent: "identity",
      reply: `I'm the voice desk for ${business.name}, ${withArticle(business.kind)}. I can answer the usual front-desk questions right away. What can I help with?`,
    };
  }

  const mentionsDay =
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|weekend)\b/.test(
      q,
    );
  if (
    /\b(hours?|open(?:ing|s)?|close[ds]?|closing)\b/.test(q) ||
    /\bare you open\b/.test(q) ||
    /\bwhen (?:are you|do you) open\b/.test(q) ||
    (mentionsDay && /\b(available|open|hours|free)\b/.test(q))
  ) {
    return {
      intent: "hours",
      reply: `We're open weekdays ${business.hours.weekdays}, Saturday ${business.hours.saturday}, and ${business.hours.sunday} on Sunday. Want ${bookPhrase}?`,
    };
  }

  if (
    /\b(where|address|directions?|locate)\b/.test(q) ||
    /\bfind you\b/.test(q) ||
    /\bhow do i get\b/.test(q)
  ) {
    return {
      intent: "location",
      reply: `You'll find us at ${business.address}.`,
    };
  }

  if (
    business.wifi &&
    /\b(wifi|wi fi|password|internet)\b/.test(q)
  ) {
    return {
      intent: "wifi",
      reply: `Wifi is ${business.wifi}. Anything else while I have you?`,
    };
  }

  if (
    pitch &&
    (/\bwhat do you (sell|do|offer|have)\b/.test(q) ||
      /\btell me about\b/.test(q) ||
      /\babout (?:your|the) (?:business|shop|place|company)\b/.test(q) ||
      /\bwhat (?:is|are) (?:this|you)\b/.test(q))
  ) {
    return {
      intent: "pitch",
      reply: pitch,
    };
  }

  const offerLabelPattern = escapeRegExp(normalize(offerLabel));
  const offerPattern = new RegExp(
    `\\b(menu|services?|offerings?|treatments?|prices?|cost|what do you (?:offer|have|sell|do)|tell me about|${offerLabelPattern})\\b`,
  );
  if (
    offerPattern.test(q) ||
    items.some((item) => {
      const n = normalize(item);
      return n.length > 2 && new RegExp(`\\b${escapeRegExp(n)}\\b`).test(q);
    })
  ) {
    if (pitch && /\b(what do you (sell|do|offer)|tell me about)\b/.test(q)) {
      return { intent: "pitch", reply: pitch };
    }
    const listed =
      items.length > 1
        ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
        : items[0] || `our ${offerLabel}`;
    const price = business.offerings.priceNote
      ? ` ${business.offerings.priceNote}`
      : "";
    return {
      intent: "offerings",
      reply: `Our ${offerLabel} ${includeVerbFor(offerLabel)} ${listed}.${price} Want help picking one?`,
    };
  }

  const nounPattern = escapeRegExp(normalize(bookNoun));
  const bookingPattern = new RegExp(
    `\\b(book(?:ing|ed)?|reserv(?:e|ation)?|appoint(?:ment)?s?|schedule|come in|tonight|tomorrow|${nounPattern})\\b`,
  );
  if (bookingPattern.test(q)) {
    const party = q.match(/\b([2-9]|1[0-2])\b/);
    const size = party ? Number(party[1]) : null;
    const note = business.booking.note?.trim() ?? "";

    if (usesPartyWording(business)) {
      if (size && size > business.booking.partyMax) {
        const extra = note
          ? ` ${softenStart(note)}`
          : ` We usually cap a table around ${business.booking.partyMax}.`;
        return {
          intent: "booking_large",
          reply: `For ${size},${extra} Tell me a smaller group or leave a note with the team.`,
        };
      }
      const noteBit = note ? ` ${note}` : "";
      return {
        intent: "booking",
        reply: `Happy to help with ${bookPhrase}. We can usually take parties up to ${business.booking.partyMax} with about ${business.booking.leadHours} hours notice.${noteBit} Tell me the day, time, and party size.`,
      };
    }

    const noteBit = note ? ` ${note}` : "";
    const lead =
      business.booking.leadHours > 0
        ? ` About ${business.booking.leadHours} hours notice is ideal.`
        : "";
    return {
      intent: "booking",
      reply: `I can book that for you.${lead}${noteBit} Tell me the day and time you prefer.`,
    };
  }

  if (
    /\b(thanks|thank you|bye|goodbye)\b/.test(q) ||
    /\bthat(?:'s| is) all\b/.test(q) ||
    /\bnothing else\b/.test(q)
  ) {
    return {
      intent: "goodbye",
      reply: `You're welcome. Thanks for calling ${business.name}. See you soon.`,
    };
  }

  if (/\b(help|options|support)\b/.test(q) || /\bwhat can you\b/.test(q)) {
    return {
      intent: "help",
      reply: `I can cover hours, directions, ${offerLabel}, or booking ${bookPhrase}. What should we start with?`,
    };
  }

  if (
    business.ownerNote &&
    /\b(special|note|policy|anything else)\b/.test(q)
  ) {
    return {
      intent: "owner_note",
      reply: business.ownerNote,
    };
  }

  return {
    intent: "fallback",
    reply: `I can help with hours, the ${offerLabel}, where we are, or ${bookPhrase} at ${business.name}. Which one do you want?`,
  };
}

export function isBusinessReady(business: BusinessProfile) {
  return Boolean(
    business.name.trim() &&
      business.kind.trim() &&
      business.address.trim() &&
      offerList(business).length > 0,
  );
}
