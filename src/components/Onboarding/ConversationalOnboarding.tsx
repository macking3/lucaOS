import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { ConversationMode } from "./ModeSelect";
import { Message } from "../../types/conversation";
import { OperatorProfile } from "../../types/operatorProfile";
import { ProfileExtractionService } from "../../services/profileExtractionService";
import { settingsService } from "../../services/settingsService";
import { personalityService } from "../../services/personalityService";
import { InteractionContext } from "../../types/lucaPersonality";
import { ArrowLeft, X } from "lucide-react";

interface ConversationalOnboardingProps {
  mode: ConversationMode;
  userName: string;
  onBack?: () => void;
  onComplete: (profile: Partial<OperatorProfile>) => void;
}

/**
 * Main conversational onboarding component
 * Natural conversation with Luca to build operator profile
 */
const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  mode,
  userName,
  onBack,
  onComplete,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Partial<OperatorProfile>>({});
  const [messageCount, setMessageCount] = useState(0);
  const extractionServiceRef = useRef<ProfileExtractionService | null>(null);
  const interactionStartTime = useRef<number>(Date.now());

  // Track latest Luca message for voice TTS
  const [lucaMessage, setLucaMessage] = useState<string | null>(null);

  // Silence detection for voice mode
  const lastUserResponseTime = useRef<number>(Date.now());
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasHandledSilence = useRef<boolean>(false);

  // Demo Fallback Key (configured via VITE_API_KEY in .env)
  const DEMO_API_KEY = import.meta.env.VITE_API_KEY || "";

  // Helper to get the effective API key (User's or Demo)
  const getEffectiveApiKey = (): string | null => {
    const userKey = localStorage.getItem("GEMINI_API_KEY");
    if (userKey) return userKey;

    const useDemo = localStorage.getItem("LUCA_USES_DEMO_KEY") === "true";
    if (useDemo) return DEMO_API_KEY;

    return null;
  };

  // Generate opening message from Luca (AI-generated in real-time)
  useEffect(() => {
    const generateOpening = async () => {
      let openingContent = "";

      // Voice mode: Generate short, natural AI greeting
      if (mode === "voice") {
        try {
          const geminiApiKey = getEffectiveApiKey();
          if (geminiApiKey) {
            const prompt = `You are Luca, an Autonomous AI Agent meeting ${userName} for the first time in a voice conversation.

Generate a very short (1-2 sentences max), warm, natural greeting that:
- Introduces yourself briefly as their Autonomous AI Agent ("I'm Luca")
- Sounds conversational and friendly
- Asks ONE simple question to start: "What would you like me to call you?" or "What's your preferred name?"
- Sounds natural when spoken aloud

Good examples:
"Hey ${userName}! I'm Luca, your Autonomous AI Agent. To start off, what should I call you?"
"Hi there! I'm Luca. It's great to meet you. What's your preferred name?"

BAD examples:
"How was your day?" (Too broad for first step)
"I am an AI robot." (Too robotic)

Keep it SHORT and focused on getting their NAME.

Greeting:`;

            const response = await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" +
                geminiApiKey,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: prompt,
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 100,
                  },
                }),
              }
            );

            const data = await response.json();
            const generated = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (generated) {
              openingContent = generated.trim();
            }
          }
        } catch (error) {
          console.error("[Conversation] Error generating opening:", error);
        }

        // Fallback if AI generation fails
        if (!openingContent) {
          openingContent = `Hey ${userName}! I'm Luca, your Autonomous AI Agent. What would you like me to call you?`;
        }
      } else {
        // Text mode: Short introduction of Luca
        try {
          // Generate opening with AI for personalization
          const geminiApiKey = getEffectiveApiKey();
          if (geminiApiKey) {
            const prompt = `You are Luca, a professional Autonomous AI Agent robot meeting your new operator ${userName} for the FIRST time.

Generate a warm, brief opening that:
- Introduces yourself as their Autonomous AI Agent
- Explains you'd like to get to know them to serve them better
- Asks ONE simple question to start: "What would you like me to call you?" OR "What's your preferred name?"
- Sounds natural and friendly

Keep it SHORT (2-3 sentences). Ask ONLY about their name/preferred name to start.

Opening message:`;

            const response = await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" +
                geminiApiKey,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: prompt,
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 200,
                  },
                }),
              }
            );

            const data = await response.json();
            const generated = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (generated) {
              openingContent = generated.trim();
            }
          }
        } catch (error) {
          console.error("[Conversation] Error generating opening:", error);
        }

        // Hardcoded fallback if AI generation fails
        if (!openingContent) {
          openingContent = `Hey ${userName}! 👋

I'm Luca, your Autonomous AI Agent. I'd like to get to know you better so I can serve you well.

Let's start simple - what would you like me to call you?`;
        }
      } // Close voice mode else block

      // Create opening message
      const openingMessage: Message = {
        id: Date.now().toString(),
        role: "luca",
        content: openingContent,
        timestamp: new Date(),
      };
      setMessages([openingMessage]);

      // Speak opening message in voice mode
      if (mode === "voice") {
        console.log("[Voice Mode] Speaking opening message...");
        setLucaMessage(openingContent);
      }
    };

    generateOpening();
  }, [userName, mode]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Generate Luca's response using Gemini
  const getLucaResponse = async (
    history: Message[],
    userMessage: string
  ): Promise<string> => {
    try {
      // Build conversation context
      const conversationContext = history
        .slice(-5) // Last 5 messages for context
        .map((m) => `${m.role === "luca" ? "Luca" : userName}: ${m.content}`)
        .join("\n");

      const prompt = `You are Luca, a professional AI companion getting to know ${userName} during onboarding.

**PROGRESSIVE QUESTIONING STRATEGY:**
Ask ONE question at a time. Track what you've learned and naturally progress through topics.

**INFORMATION TO GATHER (in this order):**
1. **Preferred name** - What they want to be called
2. **Communication style** - Direct/casual/formal? Brief/detailed?
3. **Role/occupation** - What they do (briefly)
4. **Primary needs** - What they need help with
5. **AI preferences** - Proactive or wait for commands?

**SKIP DETECTION:**
If user says "skip", "let's start", "I'm in a hurry" or similar:
- Say: "Got it! Let's jump right in."
- Respond with: "ONBOARDING_COMPLETE"

Conversation so far:
${conversationContext}

${userName} just said: "${userMessage}"

**WHAT YOU SHOULD DO:**

FIRST, review the conversation above and identify what you have ALREADY learned:
- Have you learned their preferred name? ${
        conversationContext.toLowerCase().includes("call") ||
        conversationContext.toLowerCase().includes("name")
          ? "YES"
          : "NO"
      }
- Have you learned their communication style? ${
        conversationContext.toLowerCase().includes("style") ||
        conversationContext.toLowerCase().includes("casual") ||
        conversationContext.toLowerCase().includes("direct")
          ? "YES"
          : "NO"
      }
- Have you learned their role/occupation? ${
        conversationContext.toLowerCase().includes("role") ||
        conversationContext.toLowerCase().includes("occupation") ||
        conversationContext.toLowerCase().includes("do?")
          ? "YES"
          : "NO"
      }
- Have you learned their primary needs? ${
        conversationContext.toLowerCase().includes("need") ||
        conversationContext.toLowerCase().includes("help with")
          ? "YES"
          : "NO"
      }
- Have you learned their AI preferences? ${
        conversationContext.toLowerCase().includes("proactive") ||
        conversationContext.toLowerCase().includes("wait")
          ? "YES"
          : "NO"
      }

THEN, respond by:
1. **Acknowledge their answer** briefly and warmly (1 sentence)
2. **Ask the NEXT UNANSWERED question** from the list above
3. **CRITICAL: Do NOT repeat questions you've already asked**
4. Keep it natural - like a friendly conversation, not an interview

**Examples:**
- After name: "Nice! How do you prefer to communicate - casual and brief, or more detailed?"
- After comm style: "Got it! What do you do? (Your role or occupation)"
- After role: "Interesting! What do you need most help with?"
- After needs: "Perfect! Should I be proactive with suggestions, or wait for you to ask?"

**When you have enough info (after 4-5 answered questions):**
- Summarize: "Great! So you're [name], prefer [style], work as [role], need help with [needs]. I'm ready to assist!"
- Then say: "ONBOARDING_COMPLETE"

**CRITICAL RULES:**
- ONE question per response
- Natural, conversational tone
- 2-3 sentences max
- NEVER ask the same question twice
- If unsure what to ask, move to the next topic

Response:`;

      // Call Gemini API (using existing service)
      const geminiApiKey = getEffectiveApiKey();
      if (!geminiApiKey) {
        return "I'd love to hear more about that! (Note: API key not configured)";
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" +
          geminiApiKey,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7, // Lowered from 0.9 for more consistent responses
              maxOutputTokens: 150,
            },
          }),
        }
      );

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "That's interesting! Tell me more?";

      return text.trim();
    } catch (error) {
      console.error("[Conversation] Error getting Luca response:", error);
      return "Sorry, I had a moment there. Could you say that again?";
    }
  };

  // Handle sending a message
  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    // Get Luca's response
    const response = await getLucaResponse([...messages, userMessage], message);

    // Check if Luca wants to complete onboarding (skip detected)
    if (response.includes("ONBOARDING_COMPLETE")) {
      console.log("[Onboarding] Skip detected - completing onboarding");

      // Clean response (remove the trigger)
      const cleanResponse = response.replace("ONBOARDING_COMPLETE", "").trim();

      // Add Luca's final message if there's content
      if (cleanResponse) {
        const lucaMessage: Message = {
          id: Date.now().toString(),
          role: "luca",
          content: cleanResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, lucaMessage]);

        // Speak in voice mode
        if (mode === "voice") {
          setLucaMessage(cleanResponse);
        }
      }

      setIsProcessing(false);

      // Complete onboarding with minimal profile after short delay
      setTimeout(() => {
        const minimalProfile: Partial<OperatorProfile> = {
          identity: {
            name: userName,
          },
          personality: {
            communicationStyle: "mixed",
          },
          metadata: {
            profileCreated: new Date(),
            lastUpdated: new Date(),
            conversationCount: messages.length + 1,
            privacyLevel: "minimal",
            confidence: 0.5,
          },
        };
        onComplete(minimalProfile);
      }, 1500);

      return;
    }

    // Simulate typing delay (realistic conversation feel)
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + response.length * 20)
    );

    // Add Luca's response
    const lucaMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "luca",
      content: response,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, lucaMessage]);
    setLucaMessage(response); // Set for voice TTS
    setIsProcessing(false);

    // Track interaction for personality evolution
    const interactionDuration = Date.now() - interactionStartTime.current;
    const timeOfDay = new Date().getHours();
    let timeCategory: "morning" | "afternoon" | "evening" | "night";
    if (timeOfDay >= 5 && timeOfDay < 12) timeCategory = "morning";
    else if (timeOfDay >= 12 && timeOfDay < 17) timeCategory = "afternoon";
    else if (timeOfDay >= 17 && timeOfDay < 21) timeCategory = "evening";
    else timeCategory = "night";

    const interactionContext: InteractionContext = {
      input: message,
      response: response,
      mode: personalityService.getCurrentMode(),
      timestamp: new Date(),
      duration: interactionDuration,
      outcome: "success",
      timeOfDay: timeCategory,
    };

    // Process interaction to evolve personality
    personalityService.processInteraction(interactionContext).catch((err) => {
      console.error("[Personality] Error processing interaction:", err);
    });

    // Reset timer for next interaction
    interactionStartTime.current = Date.now();

    // Extract profile every 3-4 messages
    const newMessageCount = messageCount + 2; // +2 because we added 2 messages
    setMessageCount(newMessageCount);

    if (newMessageCount >= 6 && newMessageCount % 4 === 0) {
      // Extract profile in the background
      extractProfile([...messages, userMessage, lucaMessage]);
    }
  };

  // Initialize extraction service
  useEffect(() => {
    const geminiApiKey = getEffectiveApiKey();
    if (geminiApiKey) {
      extractionServiceRef.current = new ProfileExtractionService(geminiApiKey);
    }
  }, []);

  // Extract profile from conversation
  const extractProfile = async (conversationMessages: Message[]) => {
    if (!extractionServiceRef.current) return;

    try {
      console.log(
        "[Profile] Extracting from",
        conversationMessages.length,
        "messages"
      );
      const extracted =
        await extractionServiceRef.current.extractFromConversation(
          conversationMessages,
          userName
        );

      if (extracted && extracted.extractedInfo.length > 0) {
        console.log("[Profile] Extracted:", extracted);

        // Get existing profile or create new
        let currentProfile = settingsService.getOperatorProfile();
        if (!currentProfile) {
          currentProfile =
            extractionServiceRef.current.createInitialProfile(userName);
        }

        // Merge extracted data
        const updatedProfile = extractionServiceRef.current.mergeWithProfile(
          currentProfile,
          extracted
        );

        // Update metadata
        updatedProfile.metadata.conversationCount = conversationMessages.length;

        // Save to settings
        settingsService.saveOperatorProfile(updatedProfile);
        setProfile(updatedProfile);

        console.log("[Profile] Profile updated:", updatedProfile);
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      setIsProcessing(false);
    }
  };

  // Silence detection: If user is silent for 12 seconds in voice mode, Luca continues
  useEffect(() => {
    if (mode !== "voice" || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isLucaLastMessage = lastMessage.role === "luca";

    // Only start timer if Luca asked something and user hasn't responded
    if (isLucaLastMessage && !isProcessing && !hasHandledSilence.current) {
      console.log(
        "[Silence Detection] Starting 12s timer for proactive continuation"
      );

      silenceTimerRef.current = setTimeout(async () => {
        console.log(
          "[Silence Detection] User silent for 12s - Luca continuing proactively"
        );
        hasHandledSilence.current = true;

        // Generate proactive continuation
        const geminiApiKey = getEffectiveApiKey();
        if (!geminiApiKey) return;

        try {
          // Using the same Progressive Questioning strategy as the main flow
          // but tailored for a gentle nudge
          const conversationContext = messages
            .slice(-5)
            .map(
              (m) => `${m.role === "luca" ? "Luca" : userName}: ${m.content}`
            )
            .join("\n");

          const prompt = `You are Luca, an AI companion onboarding ${userName}.
You just asked a question, but they have been silent for 15 seconds.

**YOUR GOAL:**
Gently encourage them to answer the PREVIOUS question so we can complete the profile.

**PROGRESSIVE QUESTIONING LIST (Current Status):**
1. Preferred name
2. Communication style
3. Role/occupation
4. Primary needs
5. AI preferences

**CONTEXT:**
${conversationContext}

**INSTRUCTIONS:**
- Do NOT change the topic.
- Re-phrase your last question gently.
- Keep it concise (1-2 sentences).
- Maintain a helpful, patient tone.
- Do NOT say "Are you there?" repeatedly.
- Focus on getting the answer to the step we are on.

**Example:**
(If last asked about Name): "I'm listening. What name would you like me to use?"
(If last asked about Needs): "Take your time. I'd love to know what you need help with most."

Nudge:`;

          const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" +
              geminiApiKey,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7, // Lower temperature for more focused response
                  maxOutputTokens: 100,
                },
              }),
            }
          );

          const data = await response.json();
          const continuation = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (continuation) {
            const lucaContinuation: Message = {
              id: Date.now().toString(),
              role: "luca",
              content: continuation.trim(),
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, lucaContinuation]);
            setLucaMessage(continuation.trim()); // Speak it
          }
        } catch (error) {
          console.error(
            "[Silence Detection] Error generating continuation:",
            error
          );
        }
      }, 12000); // 12 seconds
    }

    // Cleanup timer on message change
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [messages, mode, isProcessing, userName]); // Added userName to dependencies

  // Reset silence flag when user sends a message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      hasHandledSilence.current = false;
      lastUserResponseTime.current = Date.now();
    }
  }, [messages]);

  // Handle user activity (typing/speaking) to reset silence timer
  const handleUserActivity = () => {
    if (silenceTimerRef.current) {
      console.log("[Silence Detection] User active - cancelling timer");
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    lastUserResponseTime.current = Date.now();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-xl sm:max-w-2xl lg:max-w-5xl mx-auto animate-fade-in-up lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="
                p-2
                text-white/60 
                hover:text-white
                hover:bg-white/10
                rounded-full
                transition-all
              "
              title="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-lg font-display text-white/80">
            Quick Intro
          </h2>
        </div>

        {/* Skip Button */}
        <button
          onClick={() => {
            console.log("[Onboarding] Explicit skip requested");
            const minimalProfile: Partial<OperatorProfile> = {
              identity: {
                name: userName,
              },
              personality: {
                communicationStyle: "mixed",
              },
              metadata: {
                profileCreated: new Date(),
                lastUpdated: new Date(),
                conversationCount: messages.length,
                privacyLevel: "minimal",
                confidence: 0.5,
              },
            };
            onComplete(minimalProfile);
          }}
          className="
            px-2 sm:px-3 py-1.5
            text-xs font-mono
            text-white/60
            hover:text-white
            hover:bg-white/5
            border border-white/10
            hover:border-white/20
            rounded-lg
            transition-all
          "
        >
          Skip
        </button>
      </div>
      {/* Messages - Hidden in voice mode (VoiceHud handles conversation) */}
      {mode === "text" && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isProcessing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Voice Mode: Full-screen VoiceHud */}
      {mode === "voice" && (
        <div className="flex-1 flex items-center justify-center">
          {/* VoiceHud will be rendered in MessageInput */}
        </div>
      )}

      {/* Input */}
      <MessageInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isProcessing}
        mode={mode}
        theme={{ primary: "cyan", hex: "#06b6d4" }}
        lucaMessage={lucaMessage}
        onLucaMessageSpoken={() => setLucaMessage(null)}
        onModeChange={onBack}
        onActivity={handleUserActivity}
      />
    </div>
  );
};

export default ConversationalOnboarding;
