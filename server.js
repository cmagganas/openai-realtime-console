import Fastify from "fastify";
import FastifyVite from "@fastify/vite";
import fastifyEnv from "@fastify/env";
import OpenAI from "openai";

// Fastify + React + Vite configuration
const server = Fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
});

const schema = {
  type: "object",
  required: ["OPENAI_API_KEY", "ARCADE_API_KEY", "ARCADE_EMAIL"],
  properties: {
    OPENAI_API_KEY: {
      type: "string",
    },
    ARCADE_API_KEY: {
      type: "string",
    },
    ARCADE_EMAIL: {
      type: "string",
    }
  },
};

await server.register(fastifyEnv, { dotenv: true, schema });

await server.register(FastifyVite, {
  root: import.meta.url,
  renderer: "@fastify/react",
});

await server.vite.ready();

// Server-side API route to return an ephemeral realtime session token
server.get("/token", async () => {
  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "verse",
    }),
  });

  return new Response(r.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

server.post("/arcade", async (request, reply) => {
  console.log("Arcade request body:", request.body);
  try {
    console.log("Received arcade request:", request.body);
    
    const response = await fetch("http://127.0.0.1:8000/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: request.body.messages[request.body.messages.length - 1].content,
        user_id: process.env.ARCADE_EMAIL
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Arcade API error:", errorData);
      throw new Error(errorData.detail?.message || 'Failed to process with Arcade');
    }
    
    const data = await response.json();
    console.log("Arcade API full response:", data);
    return data;
  } catch (error) {
    console.error("Detailed error:", error);
    reply.code(500).send({
      error: error.message,
      stack: error.stack,
      detail: "Failed to process request with Arcade API"
    });
  }
});

await server.listen({ port: process.env.PORT || 3000 });
