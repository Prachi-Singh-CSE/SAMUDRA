import { useState } from "react";

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

import { useAppData } from "../state/useAppData";
import { useLanguage } from "../state/useLanguage";
import { voiceLangFor } from "../i18n/voiceLang";

import "./Government.css";

const schemes = [
  {
    id: "pmmsy",
    title: "PMMSY",
    category: "FISHING EQUIPMENT / INFRASTRUCTURE",
    subtitle: "Pradhan Mantri Matsya Sampada Yojana",
    eligibility: [
      "Registered fisher or fisheries entrepreneur",
      "Valid fishing vessel or fisheries activity",
      "Compliance with applicable fisheries regulations",
    ],
    benefits: [
      "Financial support for fishing equipment and infrastructure",
      "Assistance for upgrading fisheries assets",
      "Support for sustainable fisheries development",
    ],
    documents: [
      "Vessel registration",
      "Identity and address proof",
      "Bank account details",
    ],
    apply:
      "Apply through the concerned Fisheries Department or authorized fisheries office.",
    verified: "Verified against government scheme information · Dec 2025",
  },
  {
    id: "kcc",
    title: "KCC (Fisheries)",
    category: "CREDIT / WORKING CAPITAL",
    subtitle: "Kisan Credit Card for Fisheries",
    eligibility: [
      "Active fisher or fisheries-related worker",
      "Valid fishing activity or registered vessel",
      "Eligible for fisheries working capital credit",
    ],
    benefits: [
      "Working capital support for fishing operations",
      "Flexible credit for fuel, maintenance and inputs",
      "Access to institutional fisheries credit",
    ],
    documents: [
      "Vessel registration",
      "Identity proof",
      "Bank account details",
    ],
    apply:
      "Submit the required documents through an eligible bank or financial institution.",
    verified: "Verified against fisheries credit guidelines · Dec 2025",
  },
  {
    id: "diesel",
    title: "Diesel Subsidy",
    category: "FUEL / OPERATING COST",
    subtitle: "State Diesel Subsidy for Motorised Fishing Craft",
    eligibility: [
      "Motorised craft registered in the state",
      "Vessel actively fishing in the current season",
      "Compliance with fishing ban period",
    ],
    benefits: [
      "Subsidised diesel up to a monthly ceiling per craft",
      "Direct benefit transfer to the registered bank account",
    ],
    documents: [
      "Vessel registration",
      "Fuel purchase receipts",
      "Bank passbook",
    ],
    apply:
      "Submit monthly fuel receipts at your registered landing centre office.",
    verified: "Verified against department circular · Dec 2025",
  },
];

const questions = [
  "What subsidies can I get?",
  "Am I eligible for PMMSY?",
  "Is there accident insurance for fishermen?",
  "How do I get a Kisan Credit Card?",
];

export default function Support() {
  const { state, askWelfare } = useAppData();
  const { language, t } = useLanguage();

  const [selectedScheme, setSelectedScheme] = useState("diesel");

  return (
    <div className="support-page">
      <Sidebar />

      <main className="support-content">

        {/* PAGE HEADER */}

        <header className="support-header">
          <div>
            <h1>Government Support</h1>

            <p>
              Verified schemes for fishermen, matched to your profile and
              explained in plain language.
            </p>
          </div>

          <div className="support-demo-tag">
            VERIFIED SCHEME SUMMARIES · DEMO DATA
          </div>
        </header>


        {/* MAIN CONTENT */}

        <div className="support-layout">

          {/* ================= LEFT COLUMN ================= */}

          <section className="support-left">

            {/* SCHEME ASSISTANT */}

            <div className="scheme-assistant card">

              <div className="assistant-heading">

                <div className="assistant-icon">
                  ✦
                </div>

                <div>
                  <h2>Scheme Assistant</h2>

                  <p>
                    You can ask me about fishing subsidies, insurance and
                    government schemes.
                  </p>
                </div>

              </div>


              {/* QUESTIONS */}

              <div className="question-list">

                {questions.map((item, index) => (
                  <button
                    key={item}
                    className={`question-chip ${
                      index === 0 ? "active" : ""
                    }`}
                    onClick={() => askWelfare(item)}
                  >
                    {item}
                  </button>
                ))}

              </div>


              {/* CHAT */}

              <ChatWindow
                compact
                messages={state.welfareChat}
                onSubmit={askWelfare}
                voiceLang={voiceLangFor(language)}
                placeholder={t("welfare.askPlaceholder")}
                listeningPlaceholder={t("welfare.listening")}
                sendLabel={t("welfare.ask")}
                voiceUnsupportedLabel={t("welfare.voiceUnsupported")}
              />

            </div>


            {/* PROFILE CARD */}

            <div className="profile-card card">

              <h2>Your profile used for matching</h2>

              <div className="profile-info">

                <div className="profile-row">
                  <span>Name</span>
                  <strong>Suresh Kolekar</strong>
                </div>

                <div className="profile-row">
                  <span>Vessel</span>
                  <strong>Sagar Rani · IND-KL-2291</strong>
                </div>

                <div className="profile-row">
                  <span>Home port</span>
                  <strong>Vasai</strong>
                </div>

                <div className="profile-row">
                  <span>Crew</span>
                  <strong>5</strong>
                </div>

                <div className="profile-row">
                  <span>Category</span>
                  <strong>General · motorised trawler</strong>
                </div>

              </div>

            </div>

          </section>


          {/* ================= RIGHT COLUMN ================= */}

          <section className="support-right">

            <div className="scheme-list">

              {schemes.map((scheme) => {

                const isSelected =
                  selectedScheme === scheme.id;

                return (
                  <div
                    key={scheme.id}
                    className={`scheme-card ${
                      isSelected ? "selected" : ""
                    }`}
                  >

                    {/* SCHEME TOP */}

                    <button
                      className="scheme-top"
                      onClick={() =>
                        setSelectedScheme(
                          isSelected ? "" : scheme.id
                        )
                      }
                    >

                      <div className="scheme-icon">
                        ♜
                      </div>

                      <div className="scheme-title-area">

                        <div className="scheme-title-line">

                          <h2>{scheme.title}</h2>

                          <span className="scheme-category">
                            {scheme.category}
                          </span>

                        </div>

                        <p>{scheme.subtitle}</p>

                      </div>

                      <span className="scheme-chevron">
                        {isSelected ? "⌃" : "⌄"}
                      </span>

                    </button>


                    {/* EXPANDED DETAILS */}

                    {isSelected && (
                      <div className="scheme-details">

                        <div className="detail-section">

                          <h3>ELIGIBILITY</h3>

                          <ul>
                            {scheme.eligibility.map((item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ))}
                          </ul>

                        </div>


                        <div className="detail-section">

                          <h3>BENEFITS</h3>

                          <ul>
                            {scheme.benefits.map((item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ))}
                          </ul>

                        </div>


                        <div className="detail-section">

                          <h3>DOCUMENTS</h3>

                          <ul>
                            {scheme.documents.map((item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ))}
                          </ul>

                        </div>


                        {/* HOW TO APPLY */}

                        <div className="apply-box">

                          <div className="apply-heading">
                            <span>▤</span>
                            <strong>HOW TO APPLY</strong>
                          </div>

                          <p>{scheme.apply}</p>

                          <small>
                            {scheme.verified}
                          </small>

                        </div>

                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </section>

        </div>

      </main>
    </div>
  );
}