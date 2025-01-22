import { useEffect, useState, useCallback } from "react";
import { marked } from 'marked';

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "process_with_arcade", 
        description: "Process user input with Arcade AI tools",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "User message to process"
            }
          },
          required: ["content"]
        }
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput, onToolResponse }) {
  const [arcadeResponse, setArcadeResponse] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const fetchArcadeResponse = useCallback(async (args) => {
    setIsLoading(true);
    try {
      const res = await fetch('/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: args.content }]
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Arcade API request failed');
      }
      
      const data = await res.json();
      setArcadeResponse(data);
      
      // Remove the onToolResponse call to prevent affecting the voice conversation
      // if (data.success && data.content && onToolResponse) {
      //   try {
      //     onToolResponse({
      //       type: "response.message",
      //       response: {
      //         role: "assistant",
      //         content: data.content,
      //         tool_calls: data.tool_calls
      //       }
      //     });
      //   } catch (err) {
      //     console.warn("Could not send response through data channel:", err);
      //   }
      // }
    } catch (err) {
      console.error("Arcade API error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onToolResponse]);

  useEffect(() => {
    if (functionCallOutput?.arguments) {
      try {
        const args = JSON.parse(functionCallOutput.arguments);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        const newTimeoutId = setTimeout(() => {
          fetchArcadeResponse(args);
        }, 1000);
        
        setTimeoutId(newTimeoutId);
        
        return () => {
          if (newTimeoutId) {
            clearTimeout(newTimeoutId);
          }
        };
      } catch (err) {
        setError('Failed to parse function arguments');
      }
    }
  }, [functionCallOutput, fetchArcadeResponse]);

  const renderMarkdown = (content) => {
    try {
      return { __html: marked(content, { breaks: true }) };
    } catch (err) {
      console.error('Markdown parsing error:', err);
      return { __html: content };
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : isLoading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span>Processing with Arcade...</span>
        </div>
      ) : arcadeResponse ? (
        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-semibold">Query:</div>
            <div className="bg-gray-50 p-2 rounded">{functionCallOutput.arguments ? JSON.parse(functionCallOutput.arguments).content : ''}</div>
          </div>
          
          {arcadeResponse.tool_calls && (
            <div className="text-sm">
              <div className="font-semibold">Tools Called:</div>
              <div className="bg-gray-50 p-2 rounded">
                {arcadeResponse.tool_calls.map((tool, index) => (
                  <div key={tool.id} className="mb-1">
                    {tool.function.name} ({JSON.stringify(tool.function.arguments)})
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm">
            <div className="font-semibold">Response:</div>
            <div 
              className="prose prose-sm max-w-none bg-gray-50 p-2 rounded"
              dangerouslySetInnerHTML={renderMarkdown(arcadeResponse.content)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      console.log("Registering Arcade function with session...");
      sendClientEvent(sessionUpdate);
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
          output.name === "process_with_arcade"
        ) {
          console.log("Function call detected:", output);
          setFunctionCallOutput(output);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  const handleToolResponse = (response) => {
    if (sendClientEvent) {
      sendClientEvent(response);
    }
  };

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Arcade Tools</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput 
              functionCallOutput={functionCallOutput} 
              onToolResponse={handleToolResponse}
            />
          ) : (
            <p>Use Arcade tools to process your request...</p>
          )
        ) : (
          <p>Start the session to use Arcade tools...</p>
        )}
      </div>
    </section>
  );
}
