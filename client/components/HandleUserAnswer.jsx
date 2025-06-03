// components/HandelUserAnswer.tsx

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


export default function HandelUserAnswer({ sessionid,isSessionActive, sendClientEvent, events }) {
    const [functionAdded, setFunctionAdded] = useState(false); 
    const [lastOutput, setLastOutput] = useState(null);   
    useEffect(() => {
        if (!events || events.length === 0) return;
        console.log("Received events:", events);
        const latestEvent = events[0];
        console.log("->  Latest event:", latestEvent);
        if (!functionAdded && latestEvent.type === "session.created") {
        sendClientEvent(sessionUpdate);
        setFunctionAdded(true);
        }

        if (latestEvent.type === "response.done" ) {
            latestEvent.response.output.forEach(async (output) => {
                if (
                output.type === "function_call" &&
                output.name === "handle_user_answer"
                ) {
                console.log("❕芜湖🈚️Function call output:", output);
                const { user_answer } = JSON.parse(output.arguments);
                setLastOutput(output); 
                console.log("🌹 User answer:", user_answer," sessionid:",sessionid);
                const session_id=sessionid
                const res = await fetch("http://localhost:8000/handle-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id, user_answer }),
                });
                console.log("🦷 Response from backend:", res);
                const data = await res.json();
                console.log("Follow-up question data:", data);
                const followupQuestion = data.question;
                console.log("Follow-up question:", followupQuestion);
                setTimeout(() => {
                    sendClientEvent({
                        type: "response.create",
                        response: {
                        instructions: "Ask use this question," + followupQuestion+ "after user answer, use the tool 'handle_user_answer' to get follow-up questions based on the user's answer.",
                        },
                    });
                }, 500);
                }
            });
        }
    }, [events]);

    useEffect(() => {
        if (!isSessionActive) {
        setFunctionAdded(false);
        setLastOutput(null);
        }
    }, [isSessionActive]);

    return (
        <section className="h-full w-full flex flex-col gap-4">
        <div className="h-full bg-gray-50 rounded-md p-4">
            <h2 className="text-lg font-bold">Follow-up Question Tool</h2>
            {isSessionActive ? (
            lastOutput ? (
                <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
                Last answer: {JSON.parse(lastOutput.arguments).user_answer}
                </pre>
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
