(async () => {
    try {
        const loginRes = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test+12345@example.com', password: 'password123' })
        });
        const loginJson = await loginRes.json();
        if (!loginJson?.data?.token) {
            console.error('Login failed', loginJson);
            process.exit(1);
        }
        const token = loginJson.data.token;

        const purchaseRes = await fetch('http://localhost:4000/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lectureId: 'cmparjjt200027r0wi0btcn3z', amount: 9.99 })
        });
        const purchaseJson = await purchaseRes.json();
        console.log(JSON.stringify(purchaseJson, null, 2));
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
