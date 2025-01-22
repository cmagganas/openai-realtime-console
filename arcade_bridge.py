from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
from arcadepy import Arcade
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

class Message(BaseModel):
    content: str
    user_id: str = os.environ.get('ARCADE_EMAIL')  # Default user ID from .env

class ToolCall(BaseModel):
    type: str
    function: Dict[str, Any]
    id: str

class ArcadeResponse(BaseModel):
    success: bool
    content: str
    tool_calls: Optional[list[ToolCall]] = None

@app.post("/process")
async def process_message(message: Message) -> ArcadeResponse:
    try:
        logger.info(f"Processing message: {message.content}")
        
        arcade_key = os.environ.get('ARCADE_API_KEY')
        if not arcade_key:
            raise ValueError("ARCADE_API_KEY not found in environment")
            
        # OpenAI client for chat completions
        openai_client = AsyncOpenAI(
            api_key=arcade_key,
            base_url="https://api.arcade-ai.com/v1"
        )
        
        # Arcade client for tool execution
        arcade_client = Arcade()  # Uses ARCADE_API_KEY from environment
        
        logger.info("Making request to Arcade API")
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. When users ask about music or Spotify, use the Spotify.Search tool to find relevant results. For other queries, respond normally without using tools."},
                {"role": "user", "content": message.content}
            ],
            user=message.user_id,
            tools=["Spotify.Search"],
            tool_choice="auto"
        )
        
        logger.info("Successfully received response from Arcade API")
        
        # Extract the message content and tool calls
        message_content = response.choices[0].message.content or ""
        tool_calls = []
        
        if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
            tool_calls = [
                {
                    "type": tool_call.type,
                    "function": {
                        "name": tool_call.function.name,
                        "arguments": json.loads(tool_call.function.arguments)
                    },
                    "id": tool_call.id
                }
                for tool_call in response.choices[0].message.tool_calls
            ]
            
            if tool_calls:
                logger.info(f"Tool calls detected: {tool_calls}")
                
                # Execute tool and handle response
                tool_response = arcade_client.tools.execute(
                    tool_name=tool_calls[0]["function"]["name"],
                    inputs=tool_calls[0]["function"]["arguments"],  # Remove json.dumps()
                    user_id=message.user_id
                )
                
                # Extract only the necessary data from tool response
                tool_results = {
                    "status": "success",
                    "data": tool_response.output.value if hasattr(tool_response.output, 'value') else None
                }
                
                logger.info(f"Tool execution results: {tool_results}")
                
                final_response = await openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant with access to Spotify search capabilities."},
                        {"role": "user", "content": message.content},
                        {"role": "assistant", "content": None, "tool_calls": response.choices[0].message.tool_calls},
                        {"role": "tool", "content": json.dumps(tool_results), "tool_call_id": tool_calls[0]["id"]}
                    ],
                    user=message.user_id
                )
                message_content = final_response.choices[0].message.content
        
        logger.info(f"Returning response with content: {message_content}")
        return ArcadeResponse(
            success=True,
            content=message_content or "I couldn't find any relevant results.",
            tool_calls=tool_calls
        )
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail={"message": str(e)}) 