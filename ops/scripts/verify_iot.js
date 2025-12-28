import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/iot';

async function runTest() {
    console.log('--- STARTING IOT VERIFICATION ---');

    // 1. Configure Provider
    console.log('\n1. Configuring Home Assistant Provider...');
    const configRes = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: 'home-assistant',
            config: {
                url: 'ws://localhost:8123',
                token: 'fake_token'
            }
        })
    });
    console.log('Config Result:', await configRes.json());

    // Wait for connection
    await new Promise(r => setTimeout(r, 1000));

    // 2. List Devices
    console.log('\n2. Listing Devices...');
    const listRes = await fetch(`${API_URL}/devices`);
    const devices = await listRes.json();
    console.log('Devices Found:', devices.length);
    devices.forEach(d => console.log(`- ${d.name} (${d.id}): ${d.isOn ? 'ON' : 'OFF'}`));

    // 3. Control Device
    console.log('\n3. Turning OFF Living Room Light...');
    const controlRes = await fetch(`${API_URL}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deviceId: 'light.living_room',
            action: 'turnOff'
        })
    });
    console.log('Control Result:', await controlRes.json());

    // Wait for state update
    await new Promise(r => setTimeout(r, 1000));

    // 4. Verify State Change
    console.log('\n4. Verifying State Change...');
    const listRes2 = await fetch(`${API_URL}/devices`);
    const devices2 = await listRes2.json();
    const light = devices2.find(d => d.id === 'light.living_room');
    console.log(`Living Room Light is now: ${light.isOn ? 'ON' : 'OFF'}`);

    if (!light.isOn) {
        console.log('\n✅ VERIFICATION SUCCESSFUL');
    } else {
        console.log('\n❌ VERIFICATION FAILED');
    }
}

runTest().catch(console.error);
