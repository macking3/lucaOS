import socket
import threading
import argparse
import json
import concurrent.futures

# --- L0p4 Camera Scanner (Real) ---
# Scans targeted IP range for RTSP (554) and Webcams (8080).

open_feeds = []

def check_port(ip, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((str(ip), port))
        if result == 0:
            return True
        sock.close()
    except:
        pass
    return False

def scan_target(ip):
    # RTSP and Alt-HTTP
    if check_port(ip, 554):
        open_feeds.append({"ip": str(ip), "port": 554, "type": "RTSP", "url": f"rtsp://{ip}:554"})
    elif check_port(ip, 8080):
        # Check if it looks like a cam? (Simplified)
        open_feeds.append({"ip": str(ip), "port": 8080, "type": "HTTP-CAM", "url": f"http://{ip}:8080"})

def run_scan(subnet):
    # Expects subnet like "192.168.1."
    base_ip = subnet if subnet.endswith('.') else subnet + '.'
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = []
        for i in range(1, 255):
            ip = f"{base_ip}{i}"
            futures.append(executor.submit(scan_target, ip))
        
        concurrent.futures.wait(futures)

    return open_feeds

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real RTSP Fuzzer")
    parser.add_argument("subnet", help="Subnet to scan (e.g. 192.168.1)")
    args = parser.parse_args()
    
    results = run_scan(args.subnet)
    print(json.dumps(results, indent=2))
