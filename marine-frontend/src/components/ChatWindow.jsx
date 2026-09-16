import { useState } from "react";
import { Sparkles, Send, ChevronDown, Database, UserRound, Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "../hooks/useVoiceInput";
import "./ChatWindow.css";

/**
 * Shared conversational chat surface.
 *
 * `messages` is an ordered list of turns:
 *   {
 *     id,                 // required, unique
 *     question,           // optional — omit for a seed/assistant-only turn
 *     answer,             // string or JSX
 *     sources,            // optional string[]
 *     confidence,         // optional { level, score }
 *     reasoning,          // optional string/JSX shown behind a "View reasoning" toggle
 *     suggestions,        // optional string[] follow-up chips shown under this turn
 *     structured,         // optional { risk, confidence, factors, warnings, recommendation, actions }
 *                          // — renders the same risk/confidence/why/actions breakdown the
 *                          //   AI Assistant uses for a fully agentic response.
 *   }
 *
 * This component owns the input box and voice button; the caller only needs
 * to supply `messages` and an `onSubmit(question)` handler.
 */
export default function ChatWindow({
  messages,
  onSubmit,
  onNavigate,
  loading = false,
  error = "",
  voiceLang = "en-IN",
  placeholder = "Type your question…",
  listeningPlaceholder = "Listening…",
  sendLabel = "Send",
  inputNote = "",
  voiceUnsupportedLabel = "Voice input isn't supported in this browser",
  compact = false,
}) {
  const [value, setValue] = useState("");

  const submit = (text) => {
    const question = (text ?? value).trim();
    if (!question) return;
    setValue("");
    onSubmit(question);
  };

  const {
    toggle: toggleVoice,
    stop: stopVoice,
    cancel: cancelVoice,
    listening,
    transcript: liveTranscript,
    supported: voiceSupported,
  } = useVoiceInput({
    lang: voiceLang,
    onResult: (transcriptText) => {
      setValue(transcriptText);
      submit(transcriptText);
    },
  });

  return (
    <section className={`chat-panel ${compact ? "compact" : ""}`}>
      <div className="chat-messages">
        {messages.map((item) => (
          <ChatTurn key={item.id} item={item} onNavigate={onNavigate} onSuggest={submit} />
        ))}

        {loading && <div className="reasoning-details">Thinking…</div>}
        {error && <div className="reasoning-details">{error}</div>}
      </div>

      <div className="chat-input-area">
        {listening && (
          <div className="voice-listening-banner">
            <div className="voice-banner-header">
              <span className="voice-indicator-dot pulsing" />
              <strong>{listeningPlaceholder}</strong>
              <div className="voice-actions">
                <button
                  type="button"
                  className="voice-btn voice-stop-btn"
                  onClick={() => {
                    if (liveTranscript.trim()) {
                      const text = liveTranscript.trim();
                      stopVoice();
                      submit(text);
                    } else {
                      stopVoice();
                    }
                  }}
                  title="Done / Stop recording"
                >
                  Done
                </button>
                <button
                  type="button"
                  className="voice-btn voice-cancel-btn"
                  onClick={cancelVoice}
                  title="Cancel recording"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="voice-live-transcript">
              {liveTranscript ? (
                <span>"{liveTranscript}"</span>
              ) : (
                <span className="voice-speaking-prompt">Speak clearly into your microphone...</span>
              )}
            </div>
          </div>
        )}

        <div className="chat-input">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={listening ? listeningPlaceholder : placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) submit();
            }}
          />

          {voiceSupported ? (
            <button
              type="button"
              className={`mic-button ${listening ? "is-listening" : ""}`}
              onClick={toggleVoice}
              aria-pressed={listening}
              aria-label={listening ? listeningPlaceholder : placeholder}
              title={listening ? "Stop recording" : "Start voice input"}
            >
              {listening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
          ) : (
            <button
              type="button"
              className="mic-button is-disabled"
              disabled
              aria-disabled="true"
              aria-label={voiceUnsupportedLabel}
              title={voiceUnsupportedLabel}
            >
              <MicOff size={13} />
            </button>
          )}

          <button className="send-button" onClick={() => submit()}>
            <Send size={13} />
            {sendLabel}
          </button>
        </div>

        {inputNote && <p className="input-note">{inputNote}</p>}
      </div>
    </section>
  );
}

function ChatTurn({ item, onNavigate, onSuggest }) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <>
      {item.question && (
        <div className="message-row user-row">
          <div className="user-message">{item.question}</div>
          <div className="user-avatar">
            <UserRound size={12} />
          </div>
        </div>
      )}

      <div className="message-row ai-row">
        <div className="ai-message">
          <p>{item.answer}</p>

          {item.structured && <StructuredResponse response={item.structured} onNavigate={onNavigate} />}

          {(item.sources?.length || item.confidence) && (
            <div className="message-sources">
              {item.sources?.map((source, index) => (
                <span key={source}>
                  {index === 0 && <Database size={9} />}
                  {source}
                </span>
              ))}
              {item.confidence && (
                <small>
                  Confidence {item.confidence.level} · {item.confidence.score}% · Demo response
                </small>
              )}
            </div>
          )}
        </div>
      </div>

      {item.reasoning && (
        <div className={`reasoning-wrapper ${reasoningOpen ? "open" : ""}`}>
          <button className="reasoning-bar" onClick={() => setReasoningOpen(!reasoningOpen)}>
            <span>
              <Sparkles size={12} />
              View reasoning
            </span>
            <ChevronDown size={13} className={reasoningOpen ? "rotate" : ""} />
          </button>

          {reasoningOpen && <div className="reasoning-details">{item.reasoning}</div>}
        </div>
      )}

      {item.suggestions?.length > 0 && (
        <div className="suggestion-row">
          {item.suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => onSuggest(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function StructuredResponse({ response, onNavigate }) {
  return (
    <div className="reasoning-details">
      <div>
        <span>Risk</span>
        <strong>
          {response.risk.severity} · {response.risk.score}/100
        </strong>
      </div>

      <div>
        <span>Confidence</span>
        <strong>
          {response.confidence.level} · {response.confidence.score}%
        </strong>
      </div>

      <p>Why:</p>
      {response.factors
        .filter((factor) => factor.points > 0)
        .map((factor) => (
          <div key={factor.name}>
            <span>{factor.name}</span>
            <strong>{factor.evidence}</strong>
          </div>
        ))}

      <p>Recommendation: {response.recommendation}</p>

      {response.warnings.map((warning) => (
        <p key={warning}>Warning: {warning}</p>
      ))}

      {response.actions?.length > 0 && (
        <div className="suggestion-row">
          {response.actions.map((item) => (
            <button key={item.to} onClick={() => onNavigate(item.to)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}