import requests
import json
import sys
import argparse
import re
import socket

# --- L0p4 Recon (Mini-Harvester) ---
# "Stolen" concept from TheHarvester.
# Uses Certificate Transparency logs (crt.sh) to find subdomains.

def query_crtsh(domain):
    print(f"[*] Querying CRT.sh for {domain}...")
    subdomains = set()
    try:
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        r = requests.get(url, headers=headers, timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            for entry in data:
                name_value = entry['name_value']
                # Split multiline entries
                for sub in name_value.split('\n'):
                    if '*' not in sub and sub.endswith(domain):
                        subdomains.add(sub)
    except Exception as e:
        print(f"[-] CRT.sh Error: {e}")

    return list(subdomains)

def resolve_dns(subdomains):
    print(f"[*] Resolving {len(subdomains)} subdomains...")
    results = []
    for sub in subdomains:
        try:
            ip = socket.gethostbyname(sub)
            results.append({"domain": sub, "ip": ip, "live": True})
        except:
             results.append({"domain": sub, "ip": None, "live": False})
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real Recon Tool")
    parser.add_argument("domain", help="Target Domain")
    args = parser.parse_args()
    
    subs = query_crtsh(args.domain)
    final_data = resolve_dns(subs)
    
    # Sort by domain
    final_data.sort(key=lambda x: x['domain'])
    
    output = {
        "target": args.domain,
        "count": len(subs),
        "subdomains": final_data
    }
    
    print(json.dumps(output, indent=2))
