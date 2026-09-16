const schemes = [
  { id: "pmmsy", title: "PMMSY", category: "FISHING EQUIPMENT / INFRASTRUCTURE" },
  { id: "kcc", title: "KCC (Fisheries)", category: "CREDIT / WORKING CAPITAL" },
  { id: "diesel", title: "Diesel Subsidy", category: "FUEL / OPERATING COST" },
];

export function getWelfareSchemes() {
  return { mode: "demo", schemes };
}

export function answerWelfareQuestion(question) {
  return {
    question,
    answer: "The demo profile most likely matches PMMSY, the fisheries Kisan Credit Card, and the state diesel subsidy.",
    verifiedAt: "Dec 2025",
  };
}