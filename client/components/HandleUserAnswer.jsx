import { useEffect, useState } from "react";

const functionDescription = `
Call this function when the user provides an answer, and the assistant should ask the next question from the backend.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "handle_user_answer",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            user_answer: {
              type: "string",
              description: "The answer provided by the user.",
            },
          },
          required: ["user_answer"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

export default function HandelUserAnswer({ sessionid, isSessionActive, sendClientEvent, events }) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [lastOutput, setLastOutput] = useState(null);
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [previousEventsLength, setPreviousEventsLength] = useState(0);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const newEventsCount = events.length - previousEventsLength;
    if (newEventsCount <= 0) return;

    const newEvents = events.slice(0, newEventsCount);
    setPreviousEventsLength(events.length);

    newEvents.forEach(async (event) => {
      console.log("🔔 Processing event:", event);

      if (!functionAdded && event.type === "session.created") {
        sendClientEvent(sessionUpdate);
        setFunctionAdded(true);
        return;
      }

      if (event.type === "response.function_call_arguments.done" && event.name === "handle_user_answer") {
        try {
          const { user_answer } = JSON.parse(event.arguments);
          setLastOutput(event);
          console.log("🌹 User answer:", user_answer, " sessionid:", sessionid);

          const res = await fetch("http://localhost:8000/handle-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionid, user_answer }),
          });

          const data = await res.json();
          const followupQuestion = data.question;
          console.log("🧠 Follow-up question:", followupQuestion);
          setFollowupQuestion(followupQuestion);

          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions:
                  "Ask user this question: " +
                  followupQuestion +
                  ". After the user answers, use the tool 'handle_user_answer' to get follow-up questions based on the user's answer.",
              },
            });
          }, 500);
        } catch (err) {
          console.error("❌ Failed to parse function call arguments or fetch backend:", err);
        }
      }
    });
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setLastOutput(null);
      setPreviousEventsLength(0);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Follow-up Question Tool</h2>
        {isSessionActive ? (
          lastOutput ? (
            <>
              <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
                Last answer: {JSON.parse(lastOutput.arguments).user_answer}
              </pre>
              {followupQuestion && (
                <p className="text-sm text-blue-700 mt-2">
                  🧠 next question: {followupQuestion}
                </p>
              )}
            </>
          ) : (
            <p>Waiting for user answer...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
