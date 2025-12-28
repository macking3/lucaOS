
import ollama

class OllamaClient:
    def __init__(self, model: str = 'llama2'):
        self.model = model

    def generate_text(self, prompt: str) -> str:
        """Generates a one-off text response from the specified Ollama model."""
        try:
            response = ollama.generate(model=self.model, prompt=prompt)
            return response.get('response', 'No response generated.')
        except Exception as e:
            return f"Error during text generation: {e}"

    def chat(self, messages: list) -> str:
        """Conducts a conversational chat with the specified Ollama model, maintaining message history.
        Messages should be in the format: [{'role': 'user', 'content': 'Your message'}].
        """
        try:
            response = ollama.chat(model=self.model, messages=messages)
            return response['message'].get('content', 'No chat response generated.')
        except Exception as e:
            return f"Error during chat: {e}"

    def stream_chat(self, messages: list):
        """Streams a conversational chat response from the specified Ollama model.
        Messages should be in the format: [{'role': 'user', 'content': 'Your message'}].
        """
        try:
            stream = ollama.chat(model=self.model, messages=messages, stream=True)
            for chunk in stream:
                yield chunk['message'].get('content', '')
        except Exception as e:
            yield f"Error during streamed chat: {e}"

    def list_models(self) -> list:
        """Lists available local Ollama models."""
        try:
            models = ollama.list()
            return [m['name'] for m in models.get('models', [])]
        except Exception as e:
            return [f"Error listing models: {e}"]

# Example Usage (for testing purposes, not part of the class method)
if __name__ == "__main__":
    # Ensure Ollama is running and 'llama2' model is pulled (ollama pull llama2)
    client = OllamaClient(model='llama2')

    print("\n--- Listing Models ---")
    available_models = client.list_models()
    print(f"Available models: {available_models}")

    if 'llama2' in available_models:
        print("\n--- Text Generation ---")
        text_response = client.generate_text("Tell me a short fun fact about space.")
        print(f"Generated Text: {text_response}")

        print("\n--- Conversational Chat ---")
        chat_history = [
            {'role': 'system', 'content': 'You are a concise and helpful assistant.'},
            {'role': 'user', 'content': 'What is the capital of France?'}
        ]
        chat_response = client.chat(chat_history)
        print(f"Chat Response: {chat_response}")

        print("\n--- Streaming Chat (example of how to consume) ---")
        stream_history = [
            {'role': 'user', 'content': 'Describe a sunset in three sentences.'}
        ]
        print("Streaming Chat Response:")
        stream_output = ""
        for chunk in client.stream_chat(stream_history):
            stream_output += chunk
            print(chunk, end='', flush=True)
        print(f"\nFull Streamed Output: {stream_output}")
    else:
        print("\n'llama2' model not found. Please ensure Ollama is running and 'ollama pull llama2' has been executed.")
