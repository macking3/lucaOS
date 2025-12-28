#!/usr/bin/env python3
"""
Chroma DB HTTP Bridge Server
Provides a simple HTTP API for Chroma DB operations from Node.js
"""

import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    print("WARNING: chromadb not installed. Using mock mode.", file=sys.stderr)

# Initialize Chroma client
if CHROMA_AVAILABLE:
    # Use persistent storage in project directory
    chroma_dir = os.path.join(os.path.dirname(__file__), '..', '.chroma_db')
    os.makedirs(chroma_dir, exist_ok=True)
    
    client = chromadb.PersistentClient(path=chroma_dir)
    conversations_collection = client.get_or_create_collection("conversations")
    memories_collection = client.get_or_create_collection("memories")
    print(f"[CHROMA] Initialized at {chroma_dir}", file=sys.stderr)
else:
    client = None
    conversations_collection = None
    memories_collection = None
    print("[CHROMA] Running in mock mode (chromadb not installed)", file=sys.stderr)


class ChromaHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            action = data.get('action')
            
            if action == 'add_conversation':
                result = self.add_conversation(data)
            elif action == 'query_conversations':
                result = self.query_conversations(data)
            elif action == 'add_memory':
                result = self.add_memory(data)
            elif action == 'query_memories':
                result = self.query_memories(data)
            elif action == 'get_all_conversations':
                result = self.get_all_conversations(data)
            else:
                result = {'error': f'Unknown action: {action}'}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode())
    
    def add_conversation(self, data):
        """Store a conversation message"""
        if not CHROMA_AVAILABLE:
            return {'success': True, 'id': 'mock-id', 'message': 'Mock mode'}
        
        text = data.get('text', '')
        sender = data.get('sender', 'user')
        timestamp = data.get('timestamp', 0)
        metadata = data.get('metadata', {})
        embedding = data.get('embedding', [])
        
        doc_id = f"conv_{timestamp}_{hash(text)}"
        
        conversations_collection.add(
            ids=[doc_id],
            documents=[text],
            embeddings=[embedding] if embedding else None,
            metadatas=[{
                'sender': sender,
                'timestamp': timestamp,
                **metadata
            }]
        )
        
        return {'success': True, 'id': doc_id}
    
    def query_conversations(self, data):
        """Search conversations by embedding"""
        if not CHROMA_AVAILABLE:
            return {'results': [], 'message': 'Mock mode'}
        
        query_embedding = data.get('embedding', [])
        n_results = data.get('n_results', 5)
        where = data.get('where', None)
        
        results = conversations_collection.query(
            query_embeddings=[query_embedding] if query_embedding else None,
            query_texts=[data.get('query_text')] if data.get('query_text') and not query_embedding else None,
            n_results=n_results,
            where=where
        )
        
        # Format results
        formatted = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                formatted.append({
                    'id': results['ids'][0][i],
                    'text': results['documents'][0][i] if results['documents'] else '',
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results['distances'] else None
                })
        
        return {'results': formatted}
    
    def add_memory(self, data):
        """Store a memory"""
        if not CHROMA_AVAILABLE:
            return {'success': True, 'id': 'mock-id'}
        
        key = data.get('key', '')
        value = data.get('value', '')
        category = data.get('category', 'FACT')
        embedding = data.get('embedding', [])
        metadata = data.get('metadata', {})
        
        doc_id = data.get('id', f"mem_{hash(key)}")
        
        memories_collection.add(
            ids=[doc_id],
            documents=[f"{key}: {value}"],
            embeddings=[embedding] if embedding else None,
            metadatas=[{
                'key': key,
                'category': category,
                **metadata
            }]
        )
        
        return {'success': True, 'id': doc_id}
    
    def query_memories(self, data):
        """Search memories by embedding"""
        if not CHROMA_AVAILABLE:
            return {'results': []}
        
        query_embedding = data.get('embedding', [])
        n_results = data.get('n_results', 5)
        
        results = memories_collection.query(
            query_embeddings=[query_embedding] if query_embedding else None,
            query_texts=[data.get('query_text')] if data.get('query_text') and not query_embedding else None,
            n_results=n_results
        )
        
        formatted = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                formatted.append({
                    'id': results['ids'][0][i],
                    'text': results['documents'][0][i] if results['documents'] else '',
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results['distances'] else None
                })
        
        return {'results': formatted}
    
    def get_all_conversations(self, data):
        """Get all conversations (paginated)"""
        if not CHROMA_AVAILABLE:
            return {'results': [], 'total': 0}
        
        limit = data.get('limit', 100)
        offset = data.get('offset', 0)
        
        # Chroma doesn't have direct pagination, so we get all and slice
        all_data = conversations_collection.get()
        
        total = len(all_data['ids'])
        start = offset
        end = offset + limit
        
        results = []
        if all_data['ids']:
            for i in range(start, min(end, total)):
                results.append({
                    'id': all_data['ids'][i],
                    'text': all_data['documents'][i] if all_data['documents'] else '',
                    'metadata': all_data['metadatas'][i] if all_data['metadatas'] else {}
                })
        
        return {'results': results, 'total': total, 'offset': offset, 'limit': limit}
    
    def log_message(self, format, *args):
        """Override to reduce noise"""
        pass


def run_server(port=8001):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, ChromaHandler)
    print(f"[CHROMA BRIDGE] Server running on http://127.0.0.1:{port}", file=sys.stderr)
    httpd.serve_forever()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    run_server(port)

