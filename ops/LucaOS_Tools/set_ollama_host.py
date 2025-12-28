
import os
import platform
import subprocess

def set_ollama_host_env():
    os_name = platform.system()
    ollama_host_value = "0.0.0.0" # Default value as per anything-llm recommendation for Docker/network issues

    if os_name == "Darwin":  # macOS
        print("Detected macOS. Setting OLLAMA_HOST using launchctl.")
        try:
            subprocess.run(["launchctl", "setenv", "OLLAMA_HOST", ollama_host_value], check=True)
            print(f"OLLAMA_HOST set to {ollama_host_value} for macOS.")
            print("Please restart your Ollama application for changes to take effect.")
        except subprocess.CalledProcessError as e:
            print(f"Error setting OLLAMA_HOST on macOS: {e}")
            print("Ensure Ollama is installed and you have necessary permissions.")
    elif os_name == "Linux":
        print("Detected Linux. Configuring OLLAMA_HOST for systemd service.")
        try:
            # Check if ollama.service exists and is managed by systemd
            result = subprocess.run(["systemctl", "status", "ollama.service"], capture_output=True, text=True)
            if "Active: active" in result.stdout or "Active: inactive" in result.stdout:
                print("ollama.service detected. Editing systemd service configuration.")
                # Create a temporary override file for systemd
                override_content = f"""
[Service]
Environment="OLLAMA_HOST={ollama_host_value}"
"""
                with open("/tmp/ollama_override.conf", "w") as f:
                    f.write(override_content)

                subprocess.run(["sudo", "mv", "/tmp/ollama_override.conf", "/etc/systemd/system/ollama.service.d/override.conf"], check=True)
                subprocess.run(["sudo", "systemctl", "daemon-reload"], check=True)
                subprocess.run(["sudo", "systemctl", "restart", "ollama"], check=True)
                print(f"OLLAMA_HOST set to {ollama_host_value} for Linux (systemd).")
            else:
                print("ollama.service not found or not managed by systemd. Manual configuration may be required.")
                print(f"For general Linux environments, you can set OLLAMA_HOST='{ollama_host_value}' in your shell profile (e.g., ~/.bashrc, ~/.zshrc) and source it.")
        except FileNotFoundError:
            print("Systemd commands (systemctl) not found. This script assumes systemd for Linux.")
        except subprocess.CalledProcessError as e:
            print(f"Error configuring OLLAMA_HOST on Linux: {e}")
            print("Ensure you have sudo privileges and Ollama is installed as a systemd service.")
    elif os_name == "Windows":
        print("Detected Windows. Setting OLLAMA_HOST as a user environment variable.")
        try:
            # Using setx for persistent user environment variable
            subprocess.run(["setx", "OLLAMA_HOST", ollama_host_value], check=True)
            print(f"OLLAMA_HOST set to {ollama_host_value} for Windows (user environment variable).")
            print("Please quit Ollama from the taskbar and run it from a new terminal window for changes to take effect.")
        except subprocess.CalledProcessError as e:
            print(f"Error setting OLLAMA_HOST on Windows: {e}")
            print("Ensure you have administrator privileges or check your system's PATH configuration.")
    else:
        print(f"Unsupported operating system: {os_name}. Manual configuration of OLLAMA_HOST may be required.")

if __name__ == "__main__":
    set_ollama_host_env()
