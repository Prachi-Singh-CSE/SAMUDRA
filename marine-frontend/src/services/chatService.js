function action(label, to) {
  return { label, to };
}

const severityByLanguage = {
  hi: {
    low: "कम",
    moderate: "मध्यम",
    high: "उच्च",
    severe: "गंभीर",
  },
  mr: {
    low: "कमी",
    moderate: "मध्यम",
    high: "जास्त",
    severe: "गंभीर",
  },
};

function translateSeverity(severity, lang = "hi") {
  const key = (severity || "").toLowerCase();
  const dict = severityByLanguage[lang] || severityByLanguage.hi;
  return dict[key] || severity;
}

const templates = {
  en: {
    route: (marineData) =>
      `The safer demo route is preferred because it avoids the ${marineData.hazards[0]?.name.toLowerCase() || "known hazard area"}.`,
    zone: () =>
      "Zone A is the best nearby demo fishing area: it has high potential and a shorter approach than the alternatives.",
    hazard: (marineData) =>
      `${marineData.hazards.length} hazard is currently recorded near the marine route. Review the map before leaving.`,
    cyclone: () =>
      "The demo weather feed includes an elevated weather contribution. Treat the current risk as a reason to verify conditions before departure.",
    boundary: () =>
      "Crossing the marked boundary is not recommended while the IMBL proximity warning is active. Use the safer route instead.",
    why: (risk) =>
      `The current risk is ${risk.severity.toLowerCase()} because wind, wave height, weather contribution, and the nearby hazard are contributing to the score.`,
    risk: (risk) =>
      `Based on the current demo marine data, the risk is ${risk.severity.toLowerCase()} at ${risk.score}/100. ${risk.recommendation}`,
  },
  hi: {
    route: (marineData) =>
      `सुरक्षित डेमो मार्ग को प्राथमिकता दी जाती है क्योंकि यह ${marineData.hazards[0]?.name || "ज्ञात खतरे वाले क्षेत्र"} से बचता है।`,
    zone: () =>
      "ज़ोन A सबसे अच्छा नज़दीकी डेमो मछली पकड़ने का क्षेत्र है: यहाँ संभावना अधिक है और अन्य विकल्पों की तुलना में दूरी कम है।",
    hazard: (marineData) =>
      `समुद्री मार्ग के पास इस समय ${marineData.hazards.length} खतरा दर्ज है। रवाना होने से पहले मानचित्र ज़रूर देखें।`,
    cyclone: () =>
      "डेमो मौसम फ़ीड में मौसम का प्रभाव बढ़ा हुआ दिखाया गया है। रवाना होने से पहले परिस्थितियों की पुष्टि करें।",
    boundary: () =>
      "जब तक IMBL निकटता चेतावनी सक्रिय है, सीमा पार करने की सलाह नहीं दी जाती। सुरक्षित मार्ग का उपयोग करें।",
    why: (risk) =>
      `वर्तमान जोखिम ${translateSeverity(risk.severity, "hi")} है क्योंकि हवा, लहर की ऊँचाई, मौसम का प्रभाव और पास का खतरा स्कोर को प्रभावित कर रहे हैं।`,
    risk: (risk) =>
      `वर्तमान डेमो समुद्री आंकड़ों के अनुसार, जोखिम ${translateSeverity(risk.severity, "hi")} है (${risk.score}/100)। ${risk.recommendation}`,
  },
  mr: {
    route: (marineData) =>
      `सुरक्षित डेमो मार्गाला प्राधान्य दिले जाते कारण तो ${marineData.hazards[0]?.name || "ज्ञात धोकादायक क्षेत्र"} टाळतो.`,
    zone: () =>
      "झोन A हे सर्वात जवळचे उत्तम डेमो मासेमारी क्षेत्र आहे: येथे संभावना जास्त आहे आणि इतर पर्यायांच्या तुलनेत अंतर कमी आहे.",
    hazard: (marineData) =>
      `सागरी मार्गाजवळ सध्या ${marineData.hazards.length} धोका नोंदवला गेला आहे. निघण्यापूर्वी नकाशा जरूर पहा.`,
    cyclone: () =>
      "डेमो हवामान फीडमध्ये हवामानाचा प्रभाव वाढलेला दिसत आहे. निघण्यापूर्वी परिस्थितीची खात्री करा.",
    boundary: () =>
      "जोपर्यंत IMBL निकटता इशारा सक्रिय आहे, तोपर्यंत सीमा ओलांडण्याचा सल्ला दिला जात नाही. सुरक्षित मार्ग वापरा.",
    why: (risk) =>
      `सध्याचा धोका ${translateSeverity(risk.severity, "mr")} आहे कारण वारा, लाटांची उंची, हवामानाचा प्रभाव आणि जवळचा धोका गुणांवर परिणाम करत आहेत.`,
    risk: (risk) =>
      `सध्याच्या डेमो सागरी आकडेवारीनुसार, धोका ${translateSeverity(risk.severity, "mr")} आहे (${risk.score}/100). ${risk.recommendation}`,
  },
};

function responseText(intent, risk, marineData, lang = "en") {
  const dict = templates[lang] || templates.en;
  const builder = dict[intent] || dict.risk;
  // "why" and "risk" templates read from the risk assessment (severity,
  // score); every other intent reads from the marine snapshot (hazards,
  // route). Fixes a pre-existing bug where the default "risk" intent was
  // handed marineData instead of risk, crashing on risk.severity.
  const usesRiskData = intent === "why" || intent === "risk";
  return builder(usesRiskData ? risk : marineData);
}

// Intent detection stays keyword-based on raw question text — recognizes English,
// Devanagari Hindi, Marathi, and mixed Hinglish (Romanized Hindi-English) queries
// like "Kal subah fishing ke liye jaana safe hai?", "machli kahan milegi", "khatra kya hai".
function intentForQuestion(question) {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("why") ||
    normalized.includes("explain") ||
    normalized.includes("kyun") ||
    normalized.includes("kyu") ||
    normalized.includes("karan") ||
    normalized.includes("batao") ||
    normalized.includes("samajh") ||
    normalized.includes("क्यों") ||
    normalized.includes("समजावून")
  )
    return "why";

  if (
    normalized.includes("route") ||
    normalized.includes("harbour") ||
    normalized.includes("harbor") ||
    normalized.includes("raasta") ||
    normalized.includes("rasta") ||
    normalized.includes("bandar") ||
    normalized.includes("bunder") ||
    normalized.includes("बंदरगाह") ||
    normalized.includes("मार्ग") ||
    normalized.includes("बंदर")
  )
    return "route";

  if (
    normalized.includes("zone") ||
    normalized.includes("fishing area") ||
    normalized.includes("machli") ||
    normalized.includes("machi") ||
    normalized.includes("matsya") ||
    normalized.includes("मछली") ||
    normalized.includes("क्षेत्र")
  )
    return "zone";

  if (
    normalized.includes("hazard") ||
    normalized.includes("danger") ||
    normalized.includes("khatra") ||
    normalized.includes("khatre") ||
    normalized.includes("खतरा") ||
    normalized.includes("धोका")
  )
    return "hazard";

  if (
    normalized.includes("cyclone") ||
    normalized.includes("weather") ||
    normalized.includes("toofan") ||
    normalized.includes("tufan") ||
    normalized.includes("mausam") ||
    normalized.includes("hawa") ||
    normalized.includes("barish") ||
    normalized.includes("baarish") ||
    normalized.includes("चक्रवात") ||
    normalized.includes("मौसम") ||
    normalized.includes("हवामान")
  )
    return "cyclone";

  if (
    normalized.includes("cross") ||
    normalized.includes("imbl") ||
    normalized.includes("boundary") ||
    normalized.includes("seema") ||
    normalized.includes("border") ||
    normalized.includes("सीमा")
  )
    return "boundary";

  return "risk";
}

export function getInitialChat({ risk, marineData, dataSourceHealth, language = "en" }) {
  return [
    {
      id: "demo-1",
      role: "assistant",
      answer: responseText("risk", risk, marineData, language),
      risk,
      sources: dataSourceHealth.sources.filter((source) => source.status === "operational").map((source) => source.name),
    },
  ];
}

export function askChat(question, { risk, marineData, dataSourceHealth, previousMessages = [], language = "en" }) {
  const intent = intentForQuestion(question);
  const previous = previousMessages[previousMessages.length - 1];
  const answer =
    intent === "why" && previous?.risk
      ? responseText("why", previous.risk, marineData, language)
      : responseText(intent, risk, marineData, language);

  return {
    id: `demo-${Date.now()}`,
    role: "assistant",
    question,
    answer,
    risk,
    factors: risk.factors,
    confidence: risk.confidence,
    warnings: risk.warnings,
    recommendation: risk.recommendation,
    sources: dataSourceHealth.sources.map((source) => source.name),
    actions: [
      action("View Risk", "/intelligence"),
      action("View Map", "/map"),
      action("Find Safer Route", "/routes"),
    ],
    state: risk.confidence.level === "LOW" ? "low-confidence" : risk.warnings.length ? "warning" : "success",
  };
}