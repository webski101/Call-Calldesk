export const BUSINESS = {
  name: "Harbor Roast",
  kind: "neighborhood café",
  phoneLabel: "front desk",
  voiceId: "49c443a4-8a1d-5f7e-b70b-98bdbd9823c3", // Audrey
  hours: {
    weekdays: "7am to 6pm",
    saturday: "8am to 4pm",
    sunday: "closed",
  },
  address: "14 Pier Lane, by the ferry terminal",
  wifi: "HarborGuest, no password before noon, after that ask the bar",
  menuHighlights: [
    "oat flat white",
    "seasonal pour-over",
    "avocado toast",
    "warm chocolate croissant",
  ],
  booking: {
    partyMax: 8,
    leadHours: 2,
    note: "Tables for more than eight need a day of notice.",
  },
} as const;

export const GREETING =
  `Hi, thanks for calling ${BUSINESS.name}. This is the ${BUSINESS.phoneLabel}. I can help with hours, the menu, directions, or a table. What do you need?`;

export type AgentReply = {
  intent: string;
  reply: string;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
}

export function answerCaller(message: string): AgentReply {
  const q = normalize(message);

  if (!q) {
    return {
      intent: "empty",
      reply: "I didn't catch that. Want hours, the menu, directions, or a booking?",
    };
  }

  if (/(who are you|what is this|are you (a )?robot|ai|human|real person)/.test(q)) {
    return {
      intent: "identity",
      reply: `I'm the voice desk for ${BUSINESS.name}, a ${BUSINESS.kind}. I can answer the usual front-desk questions right away. What can I help with?`,
    };
  }

  if (/(hour|open|close|closing|when.*open|are you open)/.test(q)) {
    return {
      intent: "hours",
      reply: `We're open weekdays ${BUSINESS.hours.weekdays}, Saturday ${BUSINESS.hours.saturday}, and ${BUSINESS.hours.sunday} on Sunday. Want a table for later today?`,
    };
  }

  if (/(where|address|direction|locate|find you|how do i get)/.test(q)) {
    return {
      intent: "location",
      reply: `You'll find us at ${BUSINESS.address}. If you're facing the water, we're the brick storefront with the green awning.`,
    };
  }

  if (/(wifi|wi fi|password|internet)/.test(q)) {
    return {
      intent: "wifi",
      reply: `Wifi is ${BUSINESS.wifi}. Anything else while I have you?`,
    };
  }

  if (/(menu|coffee|drink|eat|food|croissant|toast|latte|flat white|pour.?over|price|cost)/.test(q)) {
    return {
      intent: "menu",
      reply: `Today's favorites are the ${BUSINESS.menuHighlights.slice(0, 3).join(", ")}, and the ${BUSINESS.menuHighlights[3]}. Most drinks run from three fifty to five fifty. Want a recommendation?`,
    };
  }

  if (/(book|reserv|table|seat|party|come in|tonight|tomorrow|thursday|friday|saturday)/.test(q)) {
    const party = q.match(/\b([2-9]|1[0-2])\b/);
    const size = party ? Number(party[1]) : null;
    if (size && size > BUSINESS.booking.partyMax) {
      return {
        intent: "booking_large",
        reply: `For ${size} people, ${BUSINESS.booking.note} Leave a name with the team on site, or tell me a smaller party and I can hold a table idea for you.`,
      };
    }
    return {
      intent: "booking",
      reply: `Happy to help with a table. We seat parties up to ${BUSINESS.booking.partyMax} with about ${BUSINESS.booking.leadHours} hours notice. Tell me the day, time, and party size, and I'll note it for the floor.`,
    };
  }

  if (/(thanks|thank you|that's all|that is all|bye|goodbye|nothing else)/.test(q)) {
    return {
      intent: "goodbye",
      reply: `You're welcome. Thanks for calling ${BUSINESS.name}. See you soon.`,
    };
  }

  if (/(help|what can you|options|support)/.test(q)) {
    return {
      intent: "help",
      reply: "I can cover hours, directions, wifi, menu highlights, or booking a table. What should we start with?",
    };
  }

  return {
    intent: "fallback",
    reply: `I can help with hours, the menu, where we are, wifi, or a table at ${BUSINESS.name}. Which one do you want?`,
  };
}
