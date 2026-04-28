import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const minecraftChat = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are a helpful and friendly Minecraft AI Companion. 
  Your goal is to help players with anything Minecraft-related:
  - Answering game mechanic questions (crafting, redstone, biomes, mobs).
  - Providing tips and strategies for survival, building, and speedrunning.
  - Acting as a friendly companion while they play.
  - Using a slightly blocky/Minecraft-themed tone occasionally (e.g., using terms like 'Steve', 'Creeper', 'Diamond-tier', 'Crafty').
  - If asked about mods or addons, provide high-level creative ideas.
  - You support multiple languages, including English and Myanmar (Burmese). If the user speaks Myanmar, respond in Myanmar.
  
  Keep responses concise but informative. Use Markdown formatting.`;

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction,
    },
    history: history.length > 0 ? history : undefined,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};

export const generateMinecraftContent = async (type: 'addon' | 'skin' | 'world' | 'mod', prompt: string) => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are a professional Minecraft Mod and Content Generator.
  The user wants an idea or template for a ${type}.
  Provide:
  1. A creative Name.
  2. A detailed Description of the ${type}.
  3. Key features or components.
  4. (If applicable) Technical hints for creators (e.g., entity definitions for addons, color palettes for skins, biome settings for worlds).
  
  Output in structured Markdown.`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a detailed concept for a Minecraft ${type} based on this prompt: ${prompt}`,
    config: {
      systemInstruction,
    },
  });

  return response.text;
};
