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

export function greetingFor(business: BusinessProfile) {
  const offer = business.offerings.label;
  return `Hi, thanks for calling ${business.name}. This is the ${business.phoneLabel}. I can help with hours, ${offer}, directions, or a ${business.booking.noun}. What do you need?`;
}

export function promptsFor(business: BusinessProfile) {
  return [
    "What are your hours?",
    "Where are you located?",
    `What's on the ${business.offerings.label}?`,
    `Can I book a ${business.booking.noun} for 4?`,
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
      items: ["day passes", "monthly memberships", "personal training", "group classes"],
      priceNote: "Day passes are fifteen; memberships start at forty-nine a month.",
    },
    booking: {
      noun: "class spot",
      partyMax: 1,
      leadHours: 2,
      note: "Training sessions need twenty-four hours notice to cancel.",
    },
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
  const items = offerList(business);

  if (!q) {
    return {
      intent: "empty",
      reply: `I didn't catch that. Want hours, the ${offerLabel}, directions, or a ${bookNoun}?`,
    };
  }

  if (/(who are you|what is this|are you (a )?robot|ai|human|real person)/.test(q)) {
    return {
      intent: "identity",
      reply: `I'm the voice desk for ${business.name}, a ${business.kind}. I can answer the usual front-desk questions right away. What can I help with?`,
    };
  }

  if (/(hour|open|close|closing|when.*open|are you open)/.test(q)) {
    return {
      intent: "hours",
      reply: `We're open weekdays ${business.hours.weekdays}, Saturday ${business.hours.saturday}, and ${business.hours.sunday} on Sunday. Want a ${bookNoun}?`,
    };
  }

  if (/(where|address|direction|locate|find you|how do i get)/.test(q)) {
    return {
      intent: "location",
      reply: `You'll find us at ${business.address}.`,
    };
  }

  if (business.wifi && /(wifi|wi fi|password|internet)/.test(q)) {
    return {
      intent: "wifi",
      reply: `Wifi is ${business.wifi}. Anything else while I have you?`,
    };
  }

  const offerPattern = new RegExp(
    `menu|service|offering|treatment|price|cost|what do you (offer|have|sell)|${normalize(offerLabel)}`,
  );
  if (offerPattern.test(q) || items.some((item) => q.includes(normalize(item)))) {
    const listed =
      items.length > 1
        ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
        : items[0] || `our ${offerLabel}`;
    const price = business.offerings.priceNote
      ? ` ${business.offerings.priceNote}`
      : "";
    return {
      intent: "offerings",
      reply: `Our ${offerLabel} includes ${listed}.${price} Want help picking one?`,
    };
  }

  if (
    new RegExp(
      `book|reserv|${normalize(bookNoun)}|appoint|schedule|come in|tonight|tomorrow`,
    ).test(q)
  ) {
    const party = q.match(/\b([2-9]|1[0-2])\b/);
    const size = party ? Number(party[1]) : null;
    if (size && size > business.booking.partyMax) {
      return {
        intent: "booking_large",
        reply: `For ${size}, ${business.booking.note || `we usually cap a ${bookNoun} around ${business.booking.partyMax}.`} Tell me a smaller group or leave a note with the team.`,
      };
    }
    return {
      intent: "booking",
      reply: `Happy to help with a ${bookNoun}. We can usually take parties up to ${business.booking.partyMax} with about ${business.booking.leadHours} hours notice.${business.booking.note ? ` ${business.booking.note}` : ""} Tell me the day, time, and size.`,
    };
  }

  if (/(thanks|thank you|that's all|that is all|bye|goodbye|nothing else)/.test(q)) {
    return {
      intent: "goodbye",
      reply: `You're welcome. Thanks for calling ${business.name}. See you soon.`,
    };
  }

  if (/(help|what can you|options|support)/.test(q)) {
    return {
      intent: "help",
      reply: `I can cover hours, directions, ${offerLabel}, or booking a ${bookNoun}. What should we start with?`,
    };
  }

  if (business.ownerNote && /(special|note|anything else|policy)/.test(q)) {
    return {
      intent: "owner_note",
      reply: business.ownerNote,
    };
  }

  return {
    intent: "fallback",
    reply: `I can help with hours, the ${offerLabel}, where we are, or a ${bookNoun} at ${business.name}. Which one do you want?`,
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
