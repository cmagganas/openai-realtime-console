import { useEffect, useState } from "react";
import { languageTools } from "../tools";

function VocabularyList({ words }) {
  return (
    <div className="mt-4">
      <h3 className="text-md font-bold mb-2">Vocabulary List</h3>
      <ul className="space-y-2">
        {words.map((word, index) => (
          <li key={index} className="p-2 bg-white rounded-md shadow-sm">
            <div className="flex justify-between">
              <span>{word.word}</span>
              <span>{word.translation}</span>
            </div>
            <div className="text-xs text-gray-500">
              {word.target_language} → {word.native_language}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LanguageToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [vocabulary, setVocabulary] = useState([]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent({
        type: "session.update",
        session: {
          tools: languageTools,
          tool_choice: "auto",
        },
      });
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "add_new_word"
        ) {
          const newWord = JSON.parse(output.arguments);
          setVocabulary(prev => [...prev, newWord]);
        }
      });
    }
  }, [events]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Language Learning</h2>
        {isSessionActive ? (
          <VocabularyList words={vocabulary} />
        ) : (
          <p>Start the session to begin learning...</p>
        )}
      </div>
    </section>
  );
}
