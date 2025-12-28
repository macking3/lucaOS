export interface ContentSource {
  type: "youtube" | "local" | "stream" | "file";
  url: string;
  provider?: "netflix" | "youtube" | "prime" | "apple" | "filesystem";
  meta?: {
    title?: string;
    description?: string;
    thumbnail?: string;
  };
}

const COMMON_STREAMS = {
  netflix: "https://www.netflix.com/browse",
  prime: "https://www.amazon.com/gp/video/storefront",
  apple: "https://tv.apple.com",
  youtube: "https://www.youtube.com",
};

export const resolveContentSource = async (
  input: string
): Promise<ContentSource> => {
  const lowerInput = input.toLowerCase();

  // 1. YouTube Handling
  if (lowerInput.includes("youtube") || lowerInput.includes("youtu.be")) {
    // If it's a specific video URL, extract ID
    // For now, simple logic or return the generic base
    if (lowerInput.includes("watch?v=")) {
      // It's a specific video, we want the Embed URL
      const videoId = input.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return {
          type: "youtube",
          url: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`, // Embed URL
          provider: "youtube",
          meta: { title: "YouTube Video" },
        };
      }
    }
    // Fallback to generic YouTube stream (browser mode)
    return {
      type: "stream",
      url: COMMON_STREAMS.youtube,
      provider: "youtube",
      meta: { title: "YouTube Home" },
    };
  }

  // 2. Netflix Handling
  if (lowerInput.includes("netflix")) {
    return {
      type: "stream",
      url: COMMON_STREAMS.netflix,
      provider: "netflix",
      meta: { title: "Netflix" },
    };
  }

  // 3. Prime Video Handling
  if (lowerInput.includes("prime") || lowerInput.includes("amazon")) {
    return {
      type: "stream",
      url: COMMON_STREAMS.prime,
      provider: "prime",
      meta: { title: "Prime Video" },
    };
  }

  // 4. Apple TV Handling
  if (lowerInput.includes("apple")) {
    return {
      type: "stream",
      url: COMMON_STREAMS.apple,
      provider: "apple",
      meta: { title: "Apple TV+" },
    };
  }

  // 5. Local File Handling (Mock logic for now, assumes path if starts with / or C:)
  if (input.startsWith("/") || input.match(/^[a-zA-Z]:\\/)) {
    return {
      type: "local",
      url: `file://${input}`,
      provider: "filesystem",
      meta: { title: input.split("/").pop() || "Local Video" },
    };
  }

  // Default: Treat as Stream if http, else Local
  if (input.startsWith("http")) {
    return {
      type: "stream",
      url: input,
      provider: "netflix", // Generic fallback
      meta: { title: "Web Stream" },
    };
  }

  // Fallback to Demo Video
  return {
    type: "local",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    provider: "filesystem",
    meta: { title: "Big Buck Bunny (Demo)" },
  };
};
