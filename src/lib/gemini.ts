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
  
  If type is 'skin':
  - Provide a name and a detailed design description.
  - Suggest a color hex palette.
  - DO NOT try to generate the actual skin PNG here, just description.
  
  If type is 'addon' or 'mod':
  - Provide a structure for a .mcpack or .mcaddon.
  - List items, blocks, or entities.
  - Provide JSON snippets for behavior/resource packs.
  
  If type is 'world':
  - Provide a name and biome/seed details for a .mcworld.
  - List key landmarks.
  
  Output in structured Markdown in both English and Myanmar.`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a detailed concept for a Minecraft ${type} based on this prompt: ${prompt}`,
    config: {
      systemInstruction,
    },
  });

  return response.text;
};

export const generateMinecraftSkinImage = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-quality 3D render of a Minecraft character skin based on this description: ${prompt}. The character should be in a dynamic pose, centered, with a clear view of the design details. Professional lighting, 4k, photorealistic style but keeping the blocky Minecraft aesthetic.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
};
